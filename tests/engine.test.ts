import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.ts";

test("playthrough state and event histories remain isolated", () => {
  const engine = new Engine();
  engine.createAdventure({ id: "demo", version: "1", title: "The Locked Door", startLocationId: "hall", locations: [{ id: "hall", name: "Hall", description: "A stone hallway", position: { x: 0, y: 0 }, exits: ["room"] }, { id: "room", name: "Room", description: "A quiet chamber", position: { x: 1, y: 0 }, exits: ["hall"] }] });
  const a = engine.startPlaythrough("demo", "1", { player: "alice", dm: "dm-a" });
  const b = engine.startPlaythrough("demo", "1", { player: "bob", dm: "dm-b" });
  engine.applyAction(a.id, "alice", { type: "unlock", doorId: "hall-door" });
  assert.deepEqual(engine.getContext(a.id).session.unlockedDoors, ["hall-door"]);
  assert.deepEqual(engine.getContext(b.id).session.unlockedDoors, []);
  assert.equal(engine.getHistory(a.id).length, 1);
  assert.equal(engine.getHistory(b.id).length, 0);
  assert.throws(() => engine.applyAction(a.id, "bob", { type: "unlock", doorId: "x" }));
  assert.throws(() => engine.startPlaythrough("demo", "1", { player: "alice", dm: "alice" }));
  engine.applyAction(b.id, "bob", { type: "move", locationId: "room" });
  assert.equal(engine.getContext(a.id).session.currentLocationId, "hall");
  assert.equal(engine.getContext(b.id).session.currentLocationId, "room");
});
