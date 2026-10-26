import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.ts";
import { SqlitePlaythroughStore } from "../src/storage.ts";

test("SQLite survives reopen, isolates sessions, and preserves append-only history", () => {
  const path = ":memory:";
  const store = new SqlitePlaythroughStore(path);
  const adventure = { id:"world",version:"1",title:"Test",startLocationId:"room",locations:[{id:"room",name:"Room",description:"Test",position:{x:0,y:0},exits:[]}] };
  const engine = new Engine();
  engine.createAdventure(adventure);
  store.saveAdventure(adventure);
  assert.throws(()=>store.saveAdventure({...adventure,title:"Changed"}),/immutable/);
  const a=engine.startPlaythrough("world","1",{player:"alice",dm:"muse"});
  const b=engine.startPlaythrough("world","1",{player:"bob",dm:"muse"});
  store.createSession(a); store.createSession(b);
  engine.recordTurn(a.id,"alice","Who are you?","Rowan",null,false);
  store.commitSession(engine,a.id);
  assert.equal(store.loadSession(a.id)?.turns[0]?.narration,"Rowan");
  assert.equal(store.loadSession(b.id)?.turns.length,0);
  const restored = new Engine();
  restored.createAdventure(store.getAdventure("world","1")!);
  const saved=store.loadSession(a.id)!;
  restored.restorePlaythrough(saved.session,saved.events,saved.turns);
  assert.equal(restored.getTurns(a.id)[0]?.playerAction,"Who are you?");
  assert.throws(()=>store.commitSession(restored,b.id),/Unknown playthrough/);
  store.close();
});

test("SQLite persists data across database reopen", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir=mkdtempSync(join(tmpdir(),"rpgstudio-"));
  try {
    const file=join(dir,"game.sqlite");
    const engine=new Engine();
    const world={id:"w",version:"1",title:"W",startLocationId:"r",locations:[{id:"r",name:"R",description:"D",position:{x:0,y:0},exits:[]}]};
    engine.createAdventure(world);
    const first=new SqlitePlaythroughStore(file);
    first.saveAdventure(world);
    const session=engine.startPlaythrough("w","1",{player:"p",dm:"m"});
    first.createSession(session);
    engine.recordTurn(session.id,"p","Name?","Rowan",null,false);
    first.commitSession(engine,session.id);
    first.close();
    const second=new SqlitePlaythroughStore(file);
    assert.equal(second.loadSession(session.id)?.turns[0]?.narration,"Rowan");
    second.close();
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
