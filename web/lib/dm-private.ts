import { DatabaseSync } from "node:sqlite";

/** DM-only notes are stored separately from the world and turn ledger.
 * Never include them in a player projection or model request. */
export type PrivateNote = { id:string; text:string; revealed:boolean };
function init(db:DatabaseSync) {
 db.exec("CREATE TABLE IF NOT EXISTS dm_private_notes (session_id TEXT NOT NULL, note_id TEXT NOT NULL, body TEXT NOT NULL, revealed INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(session_id,note_id), FOREIGN KEY(session_id) REFERENCES sessions(id));");
 db.exec("CREATE TABLE IF NOT EXISTS dm_prompt_audit (session_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, audience TEXT NOT NULL, note_count INTEGER NOT NULL, note_ids TEXT NOT NULL);");
}
export function savePrivateNote(db:DatabaseSync,sessionId:string,id:string,text:string):void {
 init(db);
 if(!/^[a-z0-9-]{1,64}$/.test(id) || !text.trim() || text.length>2000)throw Error("Invalid private note");
 const exists=db.prepare("SELECT id FROM sessions WHERE id=?").get(sessionId);
 if(!exists)throw Error("Unknown session");
 db.prepare("INSERT INTO dm_private_notes(session_id,note_id,body,revealed) VALUES(?,?,?,0) ON CONFLICT(session_id,note_id) DO UPDATE SET body=excluded.body").run(sessionId,id,text.trim());
}
export function listPrivateNotes(db:DatabaseSync,sessionId:string):PrivateNote[] {
 init(db);
 return (db.prepare("SELECT note_id,body,revealed FROM dm_private_notes WHERE session_id=? ORDER BY note_id").all(sessionId) as {note_id:string;body:string;revealed:number}[]).map(x=>({id:x.note_id,text:x.body,revealed:!!x.revealed}));
}
/** Audit metadata only. Secret values must never enter this ledger. */
export function auditPlayerPrompt(db:DatabaseSync,sessionId:string):void {
 init(db);
 const count=db.prepare("SELECT COUNT(*) AS n FROM dm_private_notes WHERE session_id=?").get(sessionId) as {n:number};
 db.prepare("INSERT INTO dm_prompt_audit(session_id,audience,note_count,note_ids) VALUES(?,'ai-player',?,'[]')").run(sessionId,count.n);
}
