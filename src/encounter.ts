import { Engine, type GameEvent } from "./engine.ts";
import type { MuseClient } from "./muse.ts";

export type EncounterResult = { narration: string; event: GameEvent | null; rejectedProposal: boolean };
export async function playTurn(engine: Engine, muse: MuseClient, sessionId: string, actorId: string, playerAction: string): Promise<EncounterResult> {
  const context = engine.getContext(sessionId);
  if (actorId !== context.session.roles.player) throw new Error("Actor is not the assigned player");
  if (!playerAction.trim() || playerAction.length > 2000) throw new Error("Invalid player action");
  const history = engine.getTurns(sessionId).map(t => ({ playerAction: t.playerAction, narration: t.narration, rejectedProposal: t.rejectedProposal }));
  const dm = await muse.respond({ location: context.location, unlockedDoors: context.session.unlockedDoors, playerAction, history });
  let result: EncounterResult;
  if (!dm.proposedAction) result = { narration: dm.narration, event: null, rejectedProposal: false };
  else {
    try {
      const event = engine.applyAction(sessionId, actorId, dm.proposedAction);
      result = { narration: dm.narration, event, rejectedProposal: false };
    } catch {
      result = { narration: "The attempted action cannot be completed in the current world state. Try something else.", event: null, rejectedProposal: true };
    }
  }
  engine.recordTurn(sessionId, actorId, playerAction, result.narration, result.event, result.rejectedProposal);
  return result;
}
