import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { Engine, type Adventure } from "../../src/engine.ts";
import { SqlitePlaythroughStore } from "../../src/storage.ts";

export function databasePath(): string {
  const dir = join(process.cwd(), "..", "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "rpgstudio.sqlite");
}
export function validateWorld(input: unknown): Adventure {
  if (!input || typeof input !== "object") throw new Error("World must be an object");
  const x = input as Record<string, unknown>;
  if (typeof x.title !== "string" || !x.title.trim() || x.title.length > 100) throw new Error("Invalid title");
  if (!Array.isArray(x.locations) || x.locations.length < 2 || x.locations.length > 8) throw new Error("World must have 2–8 locations");
  const locations = x.locations.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid location");
    const l = raw as Record<string, unknown>;
    if (typeof l.id !== "string" || !/^[a-z0-9-]{1,32}$/.test(l.id)) throw new Error("Invalid location ID");
    if (typeof l.name !== "string" || !l.name.trim() || l.name.length > 80) throw new Error("Invalid location name");
    if (typeof l.description !== "string" || !l.description.trim() || l.description.length > 1000) throw new Error("Invalid description");
    if (!Array.isArray(l.exits) || !l.exits.every(e => typeof e === "string")) throw new Error("Invalid exits");
    return { id: l.id, name: l.name, description: l.description, exits: l.exits as string[], position: { x: i * 3, y: 0 } };
  });
  const startLocationId = typeof x.startLocationId === "string" ? x.startLocationId : locations[0].id;
  const adventure: Adventure = { id: randomUUID(), version: "1", title: x.title.trim(), startLocationId, locations };
  new Engine().createAdventure(adventure);
  return adventure;
}
export function publishWorld(adventure: Adventure): void {
  const path = databasePath();
  const store = new SqlitePlaythroughStore(path);
  try { store.saveAdventure(adventure); } finally { store.close(); }
  const db = new DatabaseSync(path);
  try {
    db.exec("CREATE TABLE IF NOT EXISTS marketplace (adventure_id TEXT NOT NULL, adventure_version TEXT NOT NULL, published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(adventure_id,adventure_version), FOREIGN KEY(adventure_id,adventure_version) REFERENCES adventures(id,version))");
    db.prepare("INSERT INTO marketplace(adventure_id,adventure_version) VALUES(?,?)").run(adventure.id, adventure.version);
  } finally { db.close(); }
}
export function listWorlds(): Adventure[] {
  const db = new DatabaseSync(databasePath());
  try {
    db.exec("CREATE TABLE IF NOT EXISTS marketplace (adventure_id TEXT NOT NULL, adventure_version TEXT NOT NULL, published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(adventure_id,adventure_version))");
    const rows = db.prepare("SELECT a.body FROM marketplace m JOIN adventures a ON a.id=m.adventure_id AND a.version=m.adventure_version ORDER BY m.published_at DESC").all() as { body: string }[];
    return rows.map(row => JSON.parse(row.body) as Adventure);
  } finally { db.close(); }
}
