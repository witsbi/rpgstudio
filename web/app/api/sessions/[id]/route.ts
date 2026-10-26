import { NextResponse } from "next/server";
import { readGame, submitTurn } from "../../../../lib/play";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const game = readGame((await params).id);
    return game ? NextResponse.json(game) : NextResponse.json({ error: "Session not found" }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to load session" }, { status: 500 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body: unknown = await request.json();
    const action = (body as { action?: unknown } | null)?.action;
    if (typeof action !== "string") return NextResponse.json({ error: "Action required" }, { status: 400 });
    return NextResponse.json(await submitTurn((await params).id, action));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Turn failed" }, { status: 400 }); }
}
