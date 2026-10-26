import { Engine } from "../src/engine.js";
import { MetaMuseClient } from "../src/muse.js";
import { playTurn } from "../src/encounter.js";

const engine = new Engine();
engine.createAdventure({ id: "first-encounter", version: "1", title: "The Stranger's Secret", startLocationId: "chamber", locations: [
  { id: "chamber", name: "Stone Chamber", description: "A locked iron door. A hooded stranger watches silently.", position: { x: 0, y: 0 }, exits: ["hall"] },
  { id: "hall", name: "Hall", description: "A torch-lit corridor.", position: { x: 1, y: 0 }, exits: ["chamber"] }
] });
const session = engine.startPlaythrough("first-encounter", "1", { player: "human", dm: "muse" });
const muse = new MetaMuseClient(process.env.META_API_KEY ?? "", process.env.META_API_BASE, process.env.META_MODEL);
console.log("RPG Studio — The Stranger's Secret");
const prompt = process.argv.slice(2).join(" ") || "I ask the stranger what lies beyond the iron door.";
const result = await playTurn(engine, muse, session.id, "human", prompt);
console.log(result.narration);
console.log("State:", JSON.stringify(engine.getContext(session.id).session));
console.log("Events:", JSON.stringify(engine.getHistory(session.id)));
