import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.ts";
import { playTurn } from "../src/encounter.ts";
import { MetaMuseClient, type MuseClient } from "../src/muse.ts";

function setup() {
  const engine = new Engine();
  engine.createAdventure({ id: "chamber", version: "1", title: "The Chamber", startLocationId: "entry", locations: [
    { id: "entry", name: "Stone Chamber", description: "A door and a mysterious stranger.", position: { x: 0, y: 0 }, exits: ["passage"] },
    { id: "passage", name: "Passage", description: "A dim corridor.", position: { x: 1, y: 0 }, exits: ["entry"] }
  ] });
  return engine;
}

test("Muse response is narrated and valid proposal changes only one session", async () => {
  const engine = setup();
  const a = engine.startPlaythrough("chamber", "1", { player: "alice", dm: "muse" });
  const b = engine.startPlaythrough("chamber", "1", { player: "bob", dm: "muse" });
  const mock: MuseClient = { respond: async () => ({ narration: "The door creaks open.", proposedAction: { type: "unlock", doorId: "stone-door" } }) };
  const result = await playTurn(engine, mock, a.id, "alice", "I unlock the door");
  assert.equal(result.narration, "The door creaks open.");
  assert.equal(result.event?.sequence, 1);
  assert.deepEqual(engine.getContext(b.id).session.unlockedDoors, []);
  assert.equal(engine.getHistory(b.id).length, 0);
  await assert.rejects(playTurn(engine, mock, a.id, "bob", "I unlock the door"));
});

test("invalid movement is rejected without changing state", async () => {
  const engine = setup();
  const a = engine.startPlaythrough("chamber", "1", { player: "alice", dm: "muse" });
  const mock: MuseClient = { respond: async () => ({ narration: "You teleport away.", proposedAction: { type: "move", locationId: "nonexistent" } }) };
  const result = await playTurn(engine, mock, a.id, "alice", "Teleport");
  assert.equal(result.rejectedProposal, true);
  assert.equal(engine.getHistory(a.id).length, 0);
});

test("Meta Muse adapter uses OpenAI-compatible request shape", async () => {
  let called = false;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    called = true;
    assert.equal(String(url), "https://api.meta.ai/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "muse-spark-1.3");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ narration: "Hello adventurer", proposedAction: null }) } }] }), { status: 200 });
  }) as typeof fetch;
  const client = new MetaMuseClient("test-key", undefined, undefined, fakeFetch);
  const result = await client.respond({ location: { id: "entry", name: "Entry", description: "Stone", exits: [] }, unlockedDoors: [], playerAction: "Look around" });
  assert.equal(result.narration, "Hello adventurer");
  assert.equal(called, true);
});
