import test from "node:test";
import assert from "node:assert/strict";
import { resolveRoll } from "../src/dice.ts";
test("d20 check succeeds exactly at DC",()=>{
 const r=resolveRoll({kind:"ability",modifier:3,dc:15},()=>12);
 assert.deepEqual(r.dice,[12]);assert.equal(r.total,15);assert.equal(r.success,true);
});
test("failed check stays failed",()=>{
 const r=resolveRoll({kind:"save",modifier:2,dc:15},()=>5);
 assert.equal(r.success,false);assert.equal(r.total,7);
});
test("advantage keeps highest and disadvantage lowest",()=>{
 const sequence=[4,17];let i=0;
 const advantage=resolveRoll({kind:"attack",modifier:2,dc:15,mode:"advantage"},()=>sequence[i++]);
 assert.equal(advantage.kept,17);assert.equal(advantage.success,true);
 i=0;
 const disadvantage=resolveRoll({kind:"attack",modifier:2,dc:15,mode:"disadvantage"},()=>sequence[i++]);
 assert.equal(disadvantage.kept,4);assert.equal(disadvantage.success,false);
});
test("damage dice total is nonnegative",()=>{
 let i=0;const dice=[3,6];
 const r=resolveRoll({kind:"damage",modifier:2,sides:6,count:2},()=>dice[i++]);
 assert.deepEqual(r.dice,[3,6]);assert.equal(r.total,11);assert.equal(r.success,null);
});
test("rejects out of bounds dice and DC",()=>{
 assert.throws(()=>resolveRoll({kind:"ability",modifier:0,dc:99}));
 assert.throws(()=>resolveRoll({kind:"damage",modifier:0,sides:6,count:100}));
 assert.throws(()=>resolveRoll({kind:"ability",modifier:0,dc:10},()=>21));
});
