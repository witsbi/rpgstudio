import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { savePrivateNote, listPrivateNotes, auditPlayerPrompt } from "../web/lib/dm-private.ts";

test("private notes remain outside prompt audit and can be read by DM",()=>{
 const db=new DatabaseSync(":memory:");
 try {
  db.exec("CREATE TABLE sessions(id TEXT PRIMARY KEY)");
  db.prepare("INSERT INTO sessions(id) VALUES(?)").run("s1");
  const secret="The captain is secretly the traitor";
  savePrivateNote(db,"s1","traitor",secret);
  assert.equal(listPrivateNotes(db,"s1")[0].text,secret);
  auditPlayerPrompt(db,"s1");
  const audit=db.prepare("SELECT audience,note_count,note_ids FROM dm_prompt_audit").get() as {audience:string;note_count:number;note_ids:string};
  assert.equal(audit.audience,"ai-player");
  assert.equal(audit.note_count,1);
  assert.equal(audit.note_ids,"[]");
  assert.equal(JSON.stringify(audit).includes(secret),false);
  assert.throws(()=>savePrivateNote(db,"s1","bad/id","secret"),/Invalid/);
 } finally {db.close();}
});
