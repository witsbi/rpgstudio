import type { DatabaseSync } from "node:sqlite";

export function initCompletedTurnReceipts(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS completed_player_turns (session_id TEXT NOT NULL, pending_id TEXT NOT NULL, turn_id TEXT NOT NULL, completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(session_id,pending_id));");
}

export function findCompletedTurnId(db: DatabaseSync, sessionId: string, pendingId: string): string | null {
  initCompletedTurnReceipts(db);
  const row = db.prepare("SELECT turn_id FROM completed_player_turns WHERE session_id=? AND pending_id=?").get(sessionId, pendingId) as { turn_id: string } | undefined;
  return row?.turn_id ?? null;
}

export function rememberCompletedTurn(db: DatabaseSync, sessionId: string, pendingId: string, turnId: string): string {
  initCompletedTurnReceipts(db);
  db.prepare("INSERT OR IGNORE INTO completed_player_turns(session_id,pending_id,turn_id) VALUES(?,?,?)").run(sessionId, pendingId, turnId);
  const saved = findCompletedTurnId(db, sessionId, pendingId);
  if (!saved) throw new Error("Unable to persist completed turn receipt");
  return saved;
}
