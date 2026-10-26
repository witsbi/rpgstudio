import { NextResponse } from "next/server";
import { readDmGame, dmTurn } from "../../../../lib/dm";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const game = readDmGame((await params).id); return game ? NextResponse.json(game) : NextResponse.json({ error: "Session not found" }, { status: 404 }); }
  catch { return NextResponse.json({ error: "Unable to load session" }, { status: 500 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json() as { scene?: unknown };
    if (typeof body?.scene !== "string") return NextResponse.json({ error: "Scene required" }, { status: 400 });
    return NextResponse.json(await dmTurn((await params).id, body.scene));
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Turn failed" }, { status: 400 }); }
}
