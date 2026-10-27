import { NextResponse } from "next/server";
import { preparePlayerTurn, resolvePlayerTurn } from "../../../lib/turn-flow";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const body=await request.json() as {sessionId?:string;phase?:string;action?:string;pendingId?:string};
  if(typeof body.sessionId!=="string")throw Error("Session required");
  if(body.phase==="prepare"&&typeof body.action==="string")return NextResponse.json(await preparePlayerTurn(body.sessionId,body.action));
  if(body.phase==="resolve"&&typeof body.pendingId==="string")return NextResponse.json(await resolvePlayerTurn(body.sessionId,body.pendingId));
  throw Error("Invalid turn phase");
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Turn failed"},{status:400});}
}
