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
