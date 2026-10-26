import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Adventure, Engine, GameEvent, Playthrough, TurnRecord } from "./engine.ts";

export type SavedPlaythrough = { session: Playthrough; events: GameEvent[]; turns: TurnRecord[] };
export interface PlaythroughStore {
  saveAdventure(adventure: Adventure): void;
  getAdventure(id: string, version: string): Adventure | null;
  createSession(session: Playthrough): void;
  loadSession(id: string): SavedPlaythrough | null;
  commitSession(engine: Engine, sessionId: string): void;
  close(): void;
}

export class SqlitePlaythroughStore implements PlaythroughStore {
  private readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    const version = this.db.prepare("PRAGMA user_version").get() as { user_version: number };
    if (version.user_version > 1) throw new Error("Database schema is newer than this application");
    if (version.user_version === 0) {
      this.db.exec(`BEGIN;
        CREATE TABLE IF NOT EXISTS adventures (id TEXT NOT NULL, version TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(id,version));
        CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, adventure_id TEXT NOT NULL, adventure_version TEXT NOT NULL, state TEXT NOT NULL, last_turn INTEGER NOT NULL DEFAULT 0, last_event INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(adventure_id, adventure_version) REFERENCES adventures(id,version));
        CREATE TABLE IF NOT EXISTS turns (session_id TEXT NOT NULL, sequence INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(session_id,sequence), FOREIGN KEY(session_id) REFERENCES sessions(id));
        CREATE TABLE IF NOT EXISTS events (session_id TEXT NOT NULL, sequence INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(session_id,sequence), FOREIGN KEY(session_id) REFERENCES sessions(id));
        PRAGMA user_version = 1;
        COMMIT;`);
    }
  }
  saveAdventure(adventure: Adventure): void {
    const body = JSON.stringify(adventure);
    const row = this.db.prepare("SELECT body FROM adventures WHERE id=? AND version=?").get(adventure.id, adventure.version) as {body:string}|undefined;
    if (row) { if (row.body !== body) throw new Error("Adventure version is immutable"); return; }
    this.db.prepare("INSERT INTO adventures(id,version,body) VALUES(?,?,?)").run(adventure.id, adventure.version, body);
  }
  getAdventure(id: string, version: string): Adventure | null {
    const row = this.db.prepare("SELECT body FROM adventures WHERE id=? AND version=?").get(id,version) as {body:string}|undefined;
    return row ? JSON.parse(row.body) as Adventure : null;
  }
  createSession(session: Playthrough): void {
    this.db.prepare("INSERT INTO sessions(id,adventure_id,adventure_version,state) VALUES(?,?,?,?)").run(session.id,session.adventureId,session.adventureVersion,JSON.stringify(session));
  }
  loadSession(id: string): SavedPlaythrough | null {
    const row = this.db.prepare("SELECT state,last_turn,last_event FROM sessions WHERE id=?").get(id) as {state:string;last_turn:number;last_event:number}|undefined;
    if (!row) return null;
    const turns = this.db.prepare("SELECT body FROM turns WHERE session_id=? ORDER BY sequence").all(id).map(r=>JSON.parse((r as {body:string}).body) as TurnRecord);
    const events = this.db.prepare("SELECT body FROM events WHERE session_id=? ORDER BY sequence").all(id).map(r=>JSON.parse((r as {body:string}).body) as GameEvent);
    if (turns.length !== row.last_turn || events.length !== row.last_event) throw new Error("Corrupt session ledger");
    return {session:JSON.parse(row.state) as Playthrough,turns,events};
  }
  commitSession(engine: Engine, sessionId: string): void {
    const session = engine.getContext(sessionId).session;
    const turns = engine.getTurns(sessionId);
    const events = engine.getHistory(sessionId);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT last_turn,last_event FROM sessions WHERE id=?").get(sessionId) as {last_turn:number;last_event:number}|undefined;
      if (!row) throw new Error("Unknown persisted session");
      if (turns.length < row.last_turn || events.length < row.last_event) throw new Error("Cannot truncate append-only history");
      const addTurn = this.db.prepare("INSERT INTO turns(session_id,sequence,body) VALUES(?,?,?)");
      const addEvent = this.db.prepare("INSERT INTO events(session_id,sequence,body) VALUES(?,?,?)");
      for (const event of events.slice(row.last_event)) addEvent.run(sessionId,event.sequence,JSON.stringify(event));
      for (const turn of turns.slice(row.last_turn)) addTurn.run(sessionId,turn.sequence,JSON.stringify(turn));
      const result = this.db.prepare("UPDATE sessions SET state=?,last_turn=?,last_event=? WHERE id=? AND last_turn=? AND last_event=?").run(JSON.stringify(session),turns.length,events.length,sessionId,row.last_turn,row.last_event);
      if (result.changes !== 1) throw new Error("Concurrent session update");
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  close(): void { this.db.close(); }
}
