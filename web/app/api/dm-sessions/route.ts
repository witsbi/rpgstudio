import { NextResponse } from "next/server";
import { startDmGame } from "../../../lib/dm";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { adventureId?: unknown; version?: unknown };
    if (typeof body?.adventureId !== "string" || typeof body.version !== "string") return NextResponse.json({ error: "Adventure and version required" }, { status: 400 });
    return NextResponse.json(startDmGame(body.adventureId, body.version), { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to start" }, { status: 400 }); }
}
