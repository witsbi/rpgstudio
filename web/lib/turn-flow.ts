import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Engine } from "../../src/engine.ts";
import { MetaMuseClient } from "../../src/muse.ts";
import { resolveRoll, type RollReceipt } from "../../src/dice.ts";
import { SqlitePlaythroughStore } from "../../src/storage.ts";
import { databasePath } from "./studio";
import { readGame } from "./play";
import { checkForAction } from "../../src/action-check.ts";
import { ordinaryExitMove } from "../../src/ordinary-movement.ts";

type Pending = {id:string;action:string;stakes:string;roll:RollReceipt|null;sessionId:string;sequence:number};
function dbOpen() {
 const db=new DatabaseSync(databasePath());
 db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS pending_player_turns (session_id TEXT PRIMARY KEY, body TEXT NOT NULL, FOREIGN KEY(session_id) REFERENCES sessions(id));");
 return db;
}
function museClient() {
 const key=process.env.META_API_KEY;
 if(!key)throw Error("META_API_KEY is not configured");
 return new MetaMuseClient(key,process.env.META_API_BASE_URL || "https://api.meta.ai/v1",process.env.META_MODEL || "muse-spark-1.3");
}
export function readPendingTurn(sessionId:string) {
 const game=readGame(sessionId);if(!game)throw Error("Unknown player session");
 const db=dbOpen();
 try{const row=db.prepare("SELECT body FROM pending_player_turns WHERE session_id=?").get(sessionId) as {body:string}|undefined;return row?JSON.parse(row.body) as Pending:null;}
 finally{db.close();}
}
export async function preparePlayerTurn(sessionId:string,action:string) {
 if(typeof action!=="string"||!action.trim()||action.length>2000)throw Error("Invalid player action");
 const game=readGame(sessionId);
 if(!game)throw Error("Unknown player session");
 const db=dbOpen();
 try {
  const existing=db.prepare("SELECT body FROM pending_player_turns WHERE session_id=?").get(sessionId) as {body:string}|undefined;
  if(existing) {
   const pending=JSON.parse(existing.body) as Pending;
   if(pending.action!==action)throw Error("Finish the pending turn before starting another");
   return pending;
  }
  const worldStore=new SqlitePlaythroughStore(databasePath());
  let ordinaryDestination:string|null=null;
  try{const world=worldStore.getAdventure(game.session.adventureId,game.session.adventureVersion);if(world)ordinaryDestination=ordinaryExitMove(action,game.location,world.locations);}finally{worldStore.close();}
  const history=game.turns.map(t=>({playerAction:t.playerAction,narration:t.narration,rejectedProposal:t.rejectedProposal}));
  const assessment=ordinaryDestination ? {narration:"Travel to a connected location.",proposedCheck:null} : await museClient().respond({phase:"assess",location:game.location,unlockedDoors:game.session.unlockedDoors,playerAction:action,history});
  const fallback=ordinaryDestination ? null : checkForAction(action);
  const check=ordinaryDestination ? null : assessment.proposedCheck ?? (fallback ? {kind:fallback.request.kind,dc:fallback.request.dc ?? 12,modifier:0,mode:"normal" as const,reason:fallback.label} : null);
  const roll=check?resolveRoll({kind:check.kind,dc:check.dc,modifier:0,mode:check.mode??"normal"}):null;
  const pending:Pending={id:randomUUID(),sessionId,action,stakes:check?.reason || assessment.narration,roll,sequence:game.turns.length+1};
  db.prepare("INSERT OR IGNORE INTO pending_player_turns(session_id,body) VALUES(?,?)").run(sessionId,JSON.stringify(pending));
  const saved=db.prepare("SELECT body FROM pending_player_turns WHERE session_id=?").get(sessionId) as {body:string};
  const result=JSON.parse(saved.body) as Pending;
  if(result.action!==action)throw Error("A different turn is already pending");
  return result;
 } finally {db.close();}
}
export async function resolvePlayerTurn(sessionId:string,pendingId:string) {
 const db=dbOpen();
 try {
  const row=db.prepare("SELECT body FROM pending_player_turns WHERE session_id=?").get(sessionId) as {body:string}|undefined;
  if(!row) {
   const game=readGame(sessionId);
   if(!game)throw Error("Session missing");
   // A retried resolution can only read the already committed turn.
   if(game.turns.some(t=>t.id===pendingId))return game;
   throw Error("No pending turn; refresh the session");
  }
  const pending=JSON.parse(row.body) as Pending;
  if(pending.id!==pendingId)throw Error("Pending turn mismatch");
  const store=new SqlitePlaythroughStore(databasePath());
  try {
   const saved=store.loadSession(sessionId);
   if(!saved || saved.session.roles.player!=="human-player")throw Error("Invalid session");
   if(saved.turns.length===pending.sequence && saved.turns.at(-1)?.playerAction===pending.action){
    db.prepare("DELETE FROM pending_player_turns WHERE session_id=? AND body=?").run(sessionId,row.body);
    return readGame(sessionId);
   }
   if(saved.turns.length!==pending.sequence-1)throw Error("Session changed during pending turn");
   const world=store.getAdventure(saved.session.adventureId,saved.session.adventureVersion);
   if(!world)throw Error("Adventure missing");
   const engine=new Engine();engine.createAdventure(world);engine.restorePlaythrough(saved.session,saved.events,saved.turns);
   const context=engine.getContext(sessionId);
   const history=saved.turns.map(t=>({playerAction:t.playerAction,narration:t.narration,rejectedProposal:t.rejectedProposal}));
   const ordinaryDestination=ordinaryExitMove(pending.action,context.location,world.locations);
   const dm=ordinaryDestination ? {narration:"You travel to the connected location.",proposedAction:{type:"move" as const,locationId:ordinaryDestination}} : await museClient().respond({phase:"resolve",location:context.location,unlockedDoors:context.session.unlockedDoors,playerAction:pending.action,history,verifiedRoll:pending.roll});
   let event=null;let rejected=false;let narration=dm.narration;
   const directExit=context.location.exits.find(exit=>{
    const destination=world.locations.find(l=>l.id===exit);
    const text=pending.action.toLowerCase();
    return destination && (text.includes(destination.name.toLowerCase()) || text.includes(destination.id.toLowerCase()));
   });
   const movementIntent=/\b(go|move|walk|travel|enter|head|proceed)\b/i.test(pending.action);
   const proposal=ordinaryDestination ? {type:"move" as const,locationId:ordinaryDestination} : movementIntent && directExit ? {type:"move" as const,locationId:directExit} : dm.proposedAction;
   if(proposal) {
    if(pending.roll?.success===false && !movementIntent) {rejected=true;narration="The check failed. "+narration;}
    else try {event=engine.applyAction(sessionId,"human-player",proposal); }
    catch {rejected=true;narration="The engine rejected the proposed world change. "+narration;}
   }
   const record=engine.recordTurn(sessionId,"human-player",pending.action,narration,event,rejected,pending.roll);
   // Commit turn and clear pending in one SQLite transaction boundary is not provided by the existing store.
   // Preserve pending on failed commit; retries can recover after success by checking sequence.
   store.commitSession(engine,sessionId);
   db.prepare("DELETE FROM pending_player_turns WHERE session_id=? AND body=?").run(sessionId,row.body);
   const updated=readGame(sessionId);
   if(!updated)throw Error("Session missing");
   return {...updated,resolvedTurnId:record.id};
  } finally {store.close();}
 } finally {db.close();}
}
