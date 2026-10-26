import { NextResponse } from "next/server";
import { listWorlds, publishWorld, validateWorld } from "../../../lib/studio";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ worlds: listWorlds() }); }
  catch { return NextResponse.json({ error: "Unable to load Marketplace" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const world = validateWorld(body);
    publishWorld(world);
    return NextResponse.json({ world }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid world" }, { status: 400 });
  }
}
