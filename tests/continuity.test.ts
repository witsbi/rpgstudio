import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.ts";
import { playTurn } from "../src/encounter.ts";
import type { MuseClient } from "../src/muse.ts";

test("narrative turns are recorded and session history is isolated", async () => {
  const engine = new Engine();
  engine.createAdventure({ id: "world", version: "1", title: "Test", startLocationId: "room", locations: [{ id: "room", name: "Room", description: "A stranger waits", position: { x: 0, y: 0 }, exits: [] }] });
  const a = engine.startPlaythrough("world", "1", { player: "a", dm: "muse" });
  const b = engine.startPlaythrough("world", "1", { player: "b", dm: "muse" });
  const lengths: number[] = [];
  const muse: MuseClient = { respond: async input => { lengths.push(input.history?.length ?? -1); return { narration: "My name is Rowan.", proposedAction: null }; } };
  await playTurn(engine, muse, a.id, "a", "What is your name?");
  await playTurn(engine, muse, a.id, "a", "Remind me of your name");
  await playTurn(engine, muse, b.id, "b", "Who are you?");
  assert.deepEqual(lengths, [0, 1, 0]);
  assert.equal(engine.getTurns(a.id).length, 2);
  assert.equal(engine.getTurns(b.id).length, 1);
  assert.equal(engine.getHistory(a.id).length, 0);
  const copy = engine.getTurns(a.id);
  copy[0]!.narration = "tampered";
  assert.equal(engine.getTurns(a.id)[0]!.narration, "My name is Rowan.");
});
