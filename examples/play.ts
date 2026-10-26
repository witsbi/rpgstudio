import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Engine } from "../src/engine.ts";
import { MetaMuseClient } from "../src/muse.ts";
import { playTurn } from "../src/encounter.ts";

const engine = new Engine();
engine.createAdventure({ id: "first-encounter", version: "1", title: "The Stranger's Secret", startLocationId: "chamber", locations: [
  { id: "chamber", name: "Stone Chamber", description: "A locked iron door. A hooded stranger watches silently.", position: { x: 0, y: 0 }, exits: ["hall"] },
  { id: "hall", name: "Hall", description: "A torch-lit corridor.", position: { x: 1, y: 0 }, exits: ["chamber"] }
] });
const session = engine.startPlaythrough("first-encounter", "1", { player: "human", dm: "muse" });
const muse = new MetaMuseClient(process.env.META_API_KEY ?? "", process.env.META_API_BASE, process.env.META_MODEL);
const rl = createInterface({ input, output });
console.log("The Stranger's Secret — type /quit to exit, /history for turns");
try {
  while (true) {
    const action = (await rl.question("> ")).trim();
    if (action === "/quit") break;
    if (action === "/history") { console.log(JSON.stringify(engine.getTurns(session.id), null, 2)); continue; }
    if (!action) continue;
    try {
      const result = await playTurn(engine, muse, session.id, "human", action);
      console.log(result.narration);
    } catch (error) { console.error("Turn failed:", error instanceof Error ? error.message : String(error)); }
  }
} finally { rl.close(); }
