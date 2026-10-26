import { randomUUID } from "node:crypto";

export type Location = { id: string; name: string; description: string; position: { x: number; y: number; z?: number }; exits: string[] };
export type Adventure = { id: string; version: string; title: string; startLocationId: string; locations: Location[] };
export type Playthrough = { id: string; adventureId: string; adventureVersion: string; roles: { player: string; dm: string }; currentLocationId: string; unlockedDoors: string[] };
export type GameEvent = { id: string; playthroughId: string; sequence: number; actorId: string; action: string; outcome: string };

export type TurnRecord = { id: string; playthroughId: string; sequence: number; actorId: string; playerAction: string; narration: string; event: GameEvent | null; rejectedProposal: boolean };

export class Engine {
  private adventures = new Map<string, Adventure>();
  private sessions = new Map<string, Playthrough>();
  private events = new Map<string, GameEvent[]>();
  private turns = new Map<string, TurnRecord[]>();

  createAdventure(adventure: Adventure): void {
    if (!adventure.id || !adventure.version || !adventure.locations.length) throw new Error("Invalid adventure");
    const ids = new Set(adventure.locations.map(l => l.id));
    if (ids.size !== adventure.locations.length || !ids.has(adventure.startLocationId)) throw new Error("Invalid location IDs");
    for (const location of adventure.locations) if (location.exits.some(exit => !ids.has(exit))) throw new Error("Invalid exit");
    const key = `${adventure.id}@${adventure.version}`;
    if (this.adventures.has(key)) throw new Error("Adventure version already exists");
    this.adventures.set(key, structuredClone(adventure));
  }

  startPlaythrough(adventureId: string, version: string, roles: { player: string; dm: string }): Playthrough {
    const adventure = this.adventures.get(`${adventureId}@${version}`);
    if (!adventure) throw new Error("Unknown adventure");
    if (!roles.player || !roles.dm || roles.player === roles.dm) throw new Error("Invalid role assignments");
    const session: Playthrough = { id: randomUUID(), adventureId, adventureVersion: version, roles: { ...roles }, currentLocationId: adventure.startLocationId, unlockedDoors: [] };
    this.sessions.set(session.id, session);
    this.events.set(session.id, []);
    this.turns.set(session.id, []);
    return structuredClone(session);
  }

  getContext(sessionId: string): { session: Playthrough; location: Location } {
    const session = this.requireSession(sessionId);
    const adventure = this.adventures.get(`${session.adventureId}@${session.adventureVersion}`)!;
    return { session: structuredClone(session), location: structuredClone(adventure.locations.find(l => l.id === session.currentLocationId)!) };
  }

  applyAction(sessionId: string, actorId: string, action: { type: "unlock"; doorId: string } | { type: "move"; locationId: string }): GameEvent {
    const session = this.requireSession(sessionId);
    if (actorId !== session.roles.player) throw new Error("Only the assigned player may act");
    let outcome: string;
    if (action.type === "unlock") {
      if (!action.doorId) throw new Error("Invalid door ID");
      if (!session.unlockedDoors.includes(action.doorId)) session.unlockedDoors.push(action.doorId);
      outcome = `Unlocked ${action.doorId}`;
    } else {
      const location = this.getContext(sessionId).location;
      if (!location.exits.includes(action.locationId)) throw new Error("Location not reachable");
      session.currentLocationId = action.locationId;
      outcome = `Moved to ${action.locationId}`;
    }
    const history = this.events.get(sessionId)!;
    const event: GameEvent = { id: randomUUID(), playthroughId: sessionId, sequence: history.length + 1, actorId, action: JSON.stringify(action), outcome };
    history.push(event);
    return structuredClone(event);
  }

  getHistory(sessionId: string): GameEvent[] {
    this.requireSession(sessionId);
    return structuredClone(this.events.get(sessionId)!);
  }

  recordTurn(sessionId: string, actorId: string, playerAction: string, narration: string, event: GameEvent | null, rejectedProposal: boolean): TurnRecord {
    const session = this.requireSession(sessionId);
    if (session.roles.player !== actorId) throw new Error("Only the assigned player may record turns");
    const history = this.turns.get(sessionId)!;
    const record: TurnRecord = { id: randomUUID(), playthroughId: sessionId, sequence: history.length + 1, actorId, playerAction, narration, event: event ? structuredClone(event) : null, rejectedProposal };
    history.push(record);
    return structuredClone(record);
  }

  getTurns(sessionId: string): TurnRecord[] {
    this.requireSession(sessionId);
    return structuredClone(this.turns.get(sessionId)!);
  }

  restorePlaythrough(session: Playthrough, events: GameEvent[], turns: TurnRecord[]): void {
    const adventure = this.adventures.get(`${session.adventureId}@${session.adventureVersion}`);
    if (!adventure) throw new Error("Adventure version must be loaded before session");
    if (!adventure.locations.some(l => l.id === session.currentLocationId)) throw new Error("Invalid saved location");
    if (!session.roles.player || !session.roles.dm || session.roles.player === session.roles.dm) throw new Error("Invalid saved roles");
    if (this.sessions.has(session.id)) throw new Error("Playthrough already loaded");
    if (events.some((e, i) => e.playthroughId !== session.id || e.sequence !== i + 1)) throw new Error("Invalid saved events");
    if (turns.some((t, i) => t.playthroughId !== session.id || t.sequence !== i + 1)) throw new Error("Invalid saved turns");
    this.sessions.set(session.id, structuredClone(session));
    this.events.set(session.id, structuredClone(events));
    this.turns.set(session.id, structuredClone(turns));
  }

  private requireSession(id: string): Playthrough {
    const session = this.sessions.get(id);
    if (!session) throw new Error("Unknown playthrough");
    return session;
  }
}
