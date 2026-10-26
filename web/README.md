# RPG Studio web shell (draft)

This is the **Studio-first UI shell**, not a completed marketplace or playable web client. Role tiles intentionally lead to the development roadmap rather than pretending to work.

## Run

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Next steps in PR #5

1. Server-side adapter to the existing SQLite adventure store.
2. Creator flow: structured world proposal, human review, save/publish.
3. Marketplace listing with published worlds.
4. Launch Player + AI DM from selected world.

PR #6: separate Human DM + AI Player session using the same adventure definition.

Keep world state and role permissions authoritative in the engine; do not rely on UI state for enforcement.
