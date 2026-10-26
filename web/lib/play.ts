import { Engine } from "../../src/engine.ts";
import { SqlitePlaythroughStore } from "../../src/storage.ts";
import { MetaMuseClient } from "../../src/muse.ts";
import { playTurn } from "../../src/encounter.ts";
import { databasePath } from "./studio";
export function startGame(adventureId: string, version: string) {
  const store = new SqlitePlaythroughStore(databasePath());
  try {
    const world = store.getAdventure(adventureId, version);
    if (!world) throw new Error("Adventure not found");
    const engine = new Engine();
    engine.createAdventure(world);
    const session = engine.startPlaythrough(world.id, world.version, { player: "human-player", dm: "meta-muse" });
    store.createSession(session);
    return { sessionId: session.id };
  } finally { store.close(); }
}
export function readGame(sessionId: string) {
  const store = new SqlitePlaythroughStore(databasePath());
  try {
    const saved = store.loadSession(sessionId);
    if (!saved || saved.session.roles.player !== "human-player" || saved.session.roles.dm !== "meta-muse") return null;
    const world = store.getAdventure(saved.session.adventureId, saved.session.adventureVersion);
    if (!world) throw new Error("Adventure missing");
    const location = world.locations.find(l => l.id === saved.session.currentLocationId);
    if (!location) throw new Error("Location missing");
    return { session: saved.session, world: { id: world.id, title: world.title, version: world.version }, location, turns: saved.turns };
  } finally { store.close(); }
}
export async function submitTurn(sessionId: string, action: string) {
  if (!action.trim() || action.length > 2000) throw new Error("Action must be 1–2000 characters");
  const key = process.env.META_API_KEY;
  if (!key) throw new Error("META_API_KEY is not configured");
  const store = new SqlitePlaythroughStore(databasePath());
  try {
    const saved = store.loadSession(sessionId);
    if (!saved || saved.session.roles.player !== "human-player" || saved.session.roles.dm !== "meta-muse") throw new Error("Unknown human-player session");
    const world = store.getAdventure(saved.session.adventureId, saved.session.adventureVersion);
    if (!world) throw new Error("Adventure missing");
    const engine = new Engine();
    engine.createAdventure(world);
    engine.restorePlaythrough(saved.session, saved.events, saved.turns);
    const muse = new MetaMuseClient(key, process.env.META_API_BASE_URL || "https://api.meta.ai/v1", process.env.META_MODEL || "muse-spark-1.3");
    await playTurn(engine, muse, sessionId, "human-player", action);
    store.commitSession(engine, sessionId);
    const context = engine.getContext(sessionId);
    return { session: context.session, world: { id: world.id, title: world.title, version: world.version }, location: context.location, turns: engine.getTurns(sessionId) };
  } finally { store.close(); }
}
