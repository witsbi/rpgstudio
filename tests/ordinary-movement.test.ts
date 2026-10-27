import test from "node:test";
import assert from "node:assert/strict";
import { ordinaryExitMove } from "../src/ordinary-movement.ts";
const locations=[
 {id:"cliff",name:"Cliff Stairs",description:"",position:{x:0,y:0},exits:["shelter"]},
 {id:"shelter",name:"Storm Shelter",description:"",position:{x:1,y:0},exits:["cliff"]}
];
test("ordinary traversal of a connected exit needs no dice",()=>{
 assert.equal(ordinaryExitMove("I go to Storm Shelter",locations[0],locations),"shelter");
 assert.equal(ordinaryExitMove("walk to storm shelter",locations[0],locations),"shelter");
});
test("risky traversal and unconnected destinations are not automatic",()=>{
 assert.equal(ordinaryExitMove("I jump to Storm Shelter",locations[0],locations),null);
 assert.equal(ordinaryExitMove("I go to Storm Shelter and attack",locations[0],locations),null);
 assert.equal(ordinaryExitMove("I go to another room",locations[0],locations),null);
});
