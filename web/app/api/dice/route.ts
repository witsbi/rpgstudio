import { NextResponse } from "next/server";
import { resolveRoll, type RollRequest } from "../../../../src/dice.ts";
export const runtime = "nodejs";
export async function POST(request: Request) {
 try {
  const body = await request.json() as RollRequest;
  const receipt = resolveRoll(body);
  return NextResponse.json(receipt, {headers:{"Cache-Control":"no-store"}});
 } catch (error) {
  return NextResponse.json({error:error instanceof Error?error.message:"Invalid roll"}, {status:400});
 }
}
