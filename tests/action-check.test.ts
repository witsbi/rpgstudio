import test from "node:test";
import assert from "node:assert/strict";
import { checkForAction } from "../src/action-check.ts";
import { Engine } from "../src/engine.ts";
import { playTurn } from "../src/encounter.ts";
test("explicit jump and hit trigger appropriate authoritative checks",()=>{
 assert.equal(checkForAction("I jump across the gap")?.request.kind,"ability");
 assert.equal(checkForAction("I hit the goblin")?.request.kind,"attack");
 assert.equal(checkForAction("I look around"),null);
});
test("jump receipt persists on recorded engine turn and is supplied to DM",async()=>{
 const engine=new Engine();
 engine.createAdventure({id:"test",version:"1",title:"Test",startLocationId:"a",locations:[{id:"a",name:"A",description:"Start",position:{x:0,y:0},exits:[]}]});
 const session=engine.startPlaythrough("test","1",{player:"human-player",dm:"meta-muse"});
 let verified=false;
 await playTurn(engine,{respond:async input=>{assert.equal(input.verifiedRoll?.kind,"ability");verified=true;return {narration:"You attempt the jump.",proposedAction:null};}},session.id,"human-player","I jump across the gap");
 assert.equal(verified,true);
 const record=engine.getTurns(session.id)[0];
 assert.equal(record.roll?.kind,"ability");assert.equal(record.roll?.dc,12);assert.equal(typeof record.roll?.total,"number");
});
