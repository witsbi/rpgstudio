import test from "node:test";
import assert from "node:assert/strict";
import { parsePlayerIntent } from "../src/intent.ts";
const locations=[
 {id:"stairs",name:"Cliff Stairs",description:"",position:{x:0,y:0},exits:["shelter"]},
 {id:"shelter",name:"Storm Shelter",description:"",position:{x:1,y:0},exits:["stairs"]}
];
const parse=(action:string,destination?:string)=>parsePlayerIntent(action,locations[0],locations,destination);
test("connected exit traversal is deterministic",()=>{
 assert.deepEqual(parse("I walk to Storm Shelter"),{kind:"move",destinationId:"shelter",requiresCheck:false,source:"text"});
 assert.deepEqual(parse("I go through the hatch","shelter"),{kind:"move",destinationId:"shelter",requiresCheck:false,source:"explicit"});
});
test("risky traversal cannot bypass checks by naming an exit",()=>{
 assert.equal(parse("I jump to Storm Shelter").kind,"risky");
 assert.equal(parse("I climb to Storm Shelter").kind,"risky");
 assert.equal(parse("I go to Storm Shelter and attack").kind,"risky");
});
test("ambiguous destinations are not guessed",()=>{
 assert.equal(parse("I go through the hatch").kind,"other");
 assert.equal(parse("I inspect the stairs").kind,"other");
 assert.throws(()=>parse("I go to nowhere","nowhere"),/connected exit/);
});
