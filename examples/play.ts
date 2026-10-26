import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Engine } from "../src/engine.ts";
import { MetaMuseClient } from "../src/muse.ts";
import { playTurn } from "../src/encounter.ts";
import { SqlitePlaythroughStore } from "../src/storage.ts";

const engine = new Engine();
const store = new SqlitePlaythroughStore(process.env.RPG_DB_PATH ?? "data/rpgstudio.sqlite");
const adventure = { id: "first-encounter", version: "1", title: "The Stranger's Secret", startLocationId: "chamber", locations: [
  { id: "chamber", name: "Stone Chamber", description: "A locked iron door. A hooded stranger watches silently.", position: { x: 0, y: 0 }, exits: ["hall"] },
  { id: "hall", name: "Hall", description: "A torch-lit corridor.", position: { x: 1, y: 0 }, exits: ["chamber"] }
] };
store.saveAdventure(adventure);
engine.createAdventure(adventure);
const resumeId = process.argv[2];
const saved = resumeId ? store.loadSession(resumeId) : null;
if (resumeId && !saved) throw new Error("Playthrough not found: " + resumeId);
if (saved) engine.restorePlaythrough(saved.session, saved.events, saved.turns);
const session = saved ? saved.session : engine.startPlaythrough("first-encounter", "1", { player: "human", dm: "muse" });
if (!saved) store.createSession(session);
const muse = new MetaMuseClient(process.env.META_API_KEY ?? "", process.env.META_API_BASE, process.env.META_MODEL);
const rl = createInterface({ input, output });
console.log("The Stranger's Secret — type /quit to exit, /history for turns");
console.log("Session ID:", session.id);
console.log("Resume with: node --experimental-strip-types examples/play.ts " + session.id);
try {
  while (true) {
    const action = (await rl.question("> ")).trim();
    if (action === "/quit") break;
    if (action === "/history") { console.log(JSON.stringify(engine.getTurns(session.id), null, 2)); continue; }
    if (!action) continue;
    try {
      const result = await playTurn(engine, muse, session.id, "human", action);
      store.commitSession(engine, session.id);
      console.log(result.narration);
    } catch (error) { console.error("Turn failed:", error instanceof Error ? error.message : String(error)); throw error; }
  }
} finally { rl.close(); store.close(); }
