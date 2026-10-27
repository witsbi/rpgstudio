import { Engine } from "../../src/engine.ts";
import { SqlitePlaythroughStore } from "../../src/storage.ts";
import { databasePath } from "./studio";
import { runSparkPlayer } from "./spark-agent";
export function startDmGame(adventureId: string, version: string) {
  const store = new SqlitePlaythroughStore(databasePath());
  try {
    const world = store.getAdventure(adventureId, version);
    if (!world) throw new Error("Adventure not found");
    const engine = new Engine(); engine.createAdventure(world);
    const session = engine.startPlaythrough(world.id, world.version, { player: "meta-muse-player", dm: "human-dm" });
    store.createSession(session);
    return { sessionId: session.id };
  } finally { store.close(); }
}
export function readDmGame(id: string) {
  const store = new SqlitePlaythroughStore(databasePath());
  try {
    const saved = store.loadSession(id);
    if (!saved || saved.session.roles.player !== "meta-muse-player" || saved.session.roles.dm !== "human-dm") return null;
    const world = store.getAdventure(saved.session.adventureId, saved.session.adventureVersion);
    if (!world) throw new Error("Adventure missing");
    const location = world.locations.find(l => l.id === saved.session.currentLocationId);
    if (!location) throw new Error("Location missing");
    return { session: saved.session, world: { title: world.title }, location, turns: saved.turns };
  } finally { store.close(); }
}
export async function dmTurn(id: string, scene: string) {
  if (!scene.trim() || scene.length > 2000) throw new Error("Describe the scene in 1–2000 characters");
  const key = process.env.META_API_KEY;
  if (!key) throw new Error("META_API_KEY is not configured");
  const store = new SqlitePlaythroughStore(databasePath());
  try {
    const saved = store.loadSession(id);
    if (!saved || saved.session.roles.player !== "meta-muse-player" || saved.session.roles.dm !== "human-dm") throw new Error("Unknown DM session");
    const world = store.getAdventure(saved.session.adventureId, saved.session.adventureVersion);
    if (!world) throw new Error("Adventure missing");
    const engine = new Engine(); engine.createAdventure(world);
    engine.restorePlaythrough(saved.session, saved.events, saved.turns);
    const context = engine.getContext(id);
    const history = engine.getTurns(id).slice(-12).map(t => ({ dmScene: t.playerAction, aiResponse: t.narration }));
    const availableExits = context.location.exits.map(exitId => ({ id: exitId, name: world.locations.find(l => l.id === exitId)?.name || exitId }));
    const turnsSinceMove = (() => { const turns = engine.getTurns(id); const lastMove = turns.findLastIndex(t => t.event?.action && JSON.parse(t.event.action).type === "move"); return turns.length - lastMove - 1; })();
    const result = await runSparkPlayer({ engine, sessionId: id, scene, key, history, availableExits, turnsSinceMove });
    engine.recordTurn(id, "meta-muse-player", scene, result.narration, result.event, result.rejected);
    store.commitSession(engine, id);
    return readDmGame(id);
  } finally { store.close(); }
}
