import { NextResponse } from "next/server";
import { startGame } from "../../../lib/play";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const x = body as { adventureId?: unknown; version?: unknown } | null;
    if (typeof x?.adventureId !== "string" || typeof x.version !== "string") return NextResponse.json({ error: "Adventure and version required" }, { status: 400 });
    return NextResponse.json(startGame(x.adventureId, x.version), { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start" }, { status: 400 }); }
}
