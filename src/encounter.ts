import { Engine, type GameEvent } from "./engine.js";
import type { MuseClient } from "./muse.js";

export type EncounterResult = { narration: string; event: GameEvent | null; rejectedProposal: boolean };
export async function playTurn(engine: Engine, muse: MuseClient, sessionId: string, actorId: string, playerAction: string): Promise<EncounterResult> {
  const context = engine.getContext(sessionId);
  if (actorId !== context.session.roles.player) throw new Error("Actor is not the assigned player");
  if (!playerAction.trim() || playerAction.length > 2000) throw new Error("Invalid player action");
  const dm = await muse.respond({ location: context.location, unlockedDoors: context.session.unlockedDoors, playerAction });
  if (!dm.proposedAction) return { narration: dm.narration, event: null, rejectedProposal: false };
  try {
    const event = engine.applyAction(sessionId, actorId, dm.proposedAction);
    return { narration: dm.narration, event, rejectedProposal: false };
  } catch {
    return { narration: "The attempted action cannot be completed in the current world state. Try something else.", event: null, rejectedProposal: true };
  }
}
