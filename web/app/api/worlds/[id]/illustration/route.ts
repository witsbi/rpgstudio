import { NextResponse } from "next/server";
import { SqlitePlaythroughStore } from "../../../../../../src/storage.ts";
import { databasePath } from "../../../../../lib/studio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const safe = (s: string) => /^[a-zA-Z0-9-]{1,80}$/.test(s);
function imagePath(id: string, locationId: string) { return join(process.cwd(), "..", "data", "illustrations", id, locationId + ".webp"); }
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId") || "";
  if (!safe(id) || !safe(locationId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  try { const bytes = await readFile(imagePath(id, locationId)); return new Response(bytes, { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Illustration not generated" }, { status: 404 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { version?: unknown; locationId?: unknown } | null;
  const locationId = body?.locationId, version = body?.version;
  if (!safe(id) || typeof locationId !== "string" || !safe(locationId) || typeof version !== "string" || !safe(version)) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  const store = new SqlitePlaythroughStore(databasePath());
  let world;
  try { world = store.getAdventure(id, version); } finally { store.close(); }
  const location = world?.locations.find(l => l.id === locationId);
  if (!world || !location) return NextResponse.json({ error: "Location not found" }, { status: 404 });
  const key = process.env.META_API_KEY;
  if (!key) return NextResponse.json({ error: "META_API_KEY is not configured" }, { status: 503 });
  try {
    const response = await fetch(`${(process.env.META_API_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "")}/images/generations`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "muse-image-1.0", n: 1, output_format: "webp", response_format: "b64_json", prompt: `Cinematic fantasy RPG environment concept art, no text, no labels, no people. World: ${world.title}. Location: ${location.name}. Description: ${location.description}. Wide atmospheric establishing shot, visually coherent architecture, evocative lighting.` })
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Muse Image API error:", response.status, details);
      throw new Error(`Muse Image returned HTTP ${response.status}`);
    }
    const result = await response.json() as { data?: { b64_json?: string }[] };
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    const file = imagePath(id, locationId);
    await mkdir(join(process.cwd(), "..", "data", "illustrations", id), { recursive: true });
    await writeFile(file, Buffer.from(b64, "base64"));
    return NextResponse.json({ url: `/api/worlds/${id}/illustration?locationId=${encodeURIComponent(locationId)}` });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Illustration failed" }, { status: 502 }); }
}
