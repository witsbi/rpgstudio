# RPG Studio

**AI-powered adventure engine** — a public project for the Meta Global AI Developer Hackathon (Indie Developer track).

## Vision

Create adventures once and experience them as **Text → Visual → Navigable** representations of the same underlying world. Human and AI participants can serve as players or Dungeon Masters in separate playthroughs, with roles fixed for each playthrough.

## Architecture

- **Adventure definition:** immutable-by-version world data, stable location identifiers, and spatial coordinates from day one.
- **Playthrough:** independent session state and fixed player/DM assignments.
- **Event ledger:** ordered append-only action outcomes scoped to each playthrough.
- **DM boundary:** AI proposes narrative and actions; the engine validates and commits authoritative changes (planned integration).

World reuse is not permission to remix another creator's adventure. Rights and permissions need explicit treatment before sharing/remixing features.

## Day 1 vertical slice

This initial PR introduces three JSON Schema contracts and a small deterministic TypeScript engine with five operations: `createAdventure`, `startPlaythrough`, `getContext`, `applyAction`, and `getHistory`. The first test checks that two playthroughs of one adventure do not share mutable state or event history.

**Current limitations:** in-memory only; schemas are not yet wired into runtime validation; doors are demonstration state without topology/lock rules; no persistence, AI model integration, authentication, or UI yet. Not production ready.

## Run tests

Requires Node.js 22.6+ (Node 22.18+ recommended for built-in TypeScript stripping).

```bash
npm install
npm test
npm run typecheck
```

## Next milestones

1. Runtime contract validation, action preconditions, and persistence.
2. AI Dungeon Master integration with constrained proposals.
3. Playable text adventure end-to-end.
4. Visual and navigable renderers of the same structured world.

## Project status

Hackathon Day 1 foundation. Public development; contributions and design feedback welcome.

## Muse-powered first encounter (PR #2)

RPG Studio uses Meta's OpenAI-compatible Muse API at `https://api.meta.ai/v1` with model `muse-spark-1.3`. The adapter calls `/chat/completions` using a bearer token. The model narrates and proposes an action; the engine validates and commits any state change.

Set `META_API_KEY` in your shell (see `.env.example`; never commit credentials). Optional: `META_API_BASE` and `META_MODEL`.

```bash
npm install
npm test
npm run typecheck
META_API_KEY=your_key node --experimental-strip-types examples/first-encounter.ts "I question the stranger"
```

The sample performs **one** turn and prints state and history. API calls require valid Meta credentials and access. This is not yet a persistent multi-turn game or HTTP server. The in-memory unlock mechanic is still a placeholder without door precondition checks; do not mistake it for completed world rules.

## Interactive multi-turn encounter (PR #3)

Set `META_API_KEY` in your environment, then run:

```bash
node --experimental-strip-types examples/play.ts
```

Enter free-text actions, `/history` to inspect the playthrough's turn records, and `/quit` to exit. Every successful Muse response is recorded as a turn, even when no world state changes. Prior turns and current state are sent back to Muse for continuity. Session histories remain isolated. The ledger is currently **in-memory only**, and disappears when the process exits; persistence and full event-ledger unification are follow-up work. Tests use mocked Muse responses.
