import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { findCompletedTurnId, initCompletedTurnReceipts, rememberCompletedTurn } from "../web/lib/turn-receipts.ts";

test("completed turn receipts let a retry recover the original committed turn", () => {
  const db = new DatabaseSync(":memory:");
  try {
    initCompletedTurnReceipts(db);
    assert.equal(findCompletedTurnId(db, "session-1", "pending-1"), null);
    assert.equal(rememberCompletedTurn(db, "session-1", "pending-1", "turn-1"), "turn-1");
    assert.equal(findCompletedTurnId(db, "session-1", "pending-1"), "turn-1");
    // Repeating receipt persistence must not change the original mapping.
    assert.equal(rememberCompletedTurn(db, "session-1", "pending-1", "turn-duplicate"), "turn-1");
    assert.equal(findCompletedTurnId(db, "session-1", "pending-1"), "turn-1");
  } finally {
    db.close();
  }
});

test("completed turn receipts are scoped to both session and pending turn", () => {
  const db = new DatabaseSync(":memory:");
  try {
    rememberCompletedTurn(db, "session-1", "pending-1", "turn-1");
    assert.equal(findCompletedTurnId(db, "session-2", "pending-1"), null);
    assert.equal(findCompletedTurnId(db, "session-1", "pending-2"), null);
  } finally {
    db.close();
  }
});
