# Orderly Rebuild — Substep Index

Source spec: `.kilo/plans/1784211950301-orderly-rebuild-plan.md` (the master
plan; section refs `§` point to the original "Orderly — One-Shot Rebuild
Specification"). This folder splits that master plan into small, individually
executable substeps, each sized for a single ~15-minute cloud-agent run.

## How to run

1. Pick the lowest-numbered substep whose dependencies are all done.
2. Read that substep file end to end before writing code.
3. Do only what that substep describes. Do not scope-creep into later substeps.
4. Run the substep's **Validation** commands; they must pass.
5. Commit with the substep's suggested message, then stop.

Each substep is designed to leave the repo in a **buildable, test-passing**
state so the next agent (or a resumed run) can start cleanly.

## Locked decisions (from master plan)

- React 18 + Vite + TypeScript strict (`noUncheckedIndexedAccess`).
- Zustand (single store, repository injected), Zod, dnd-kit, CSS Modules + CSS
  custom properties. No CSS-in-JS, no `dangerouslySetInnerHTML`.
- Vitest + React Testing Library + `fake-indexeddb`. ≥80% coverage on
  `src/domain`.
- Fully static SPA, no backend, no runtime network calls.
- UI never touches IndexedDB directly; storage injected into the store.

## Directory contract (target)

```
src/domain/   pure, framework-free, unit-tested
src/storage/  Repository iface, IndexedDbRepository, InMemoryRepository, contract test
src/store/    Zustand store + actions + localStorage UI slice
src/features/ projects, board, calendar, todo-detail, tags, search, reminders,
              recurrence, focus-135, focus-areas, command-palette, io
src/components/ date picker, dialogs, toast, palette overlay, drawer/sheet
```

## Substep list & dependency graph

| #  | Substep | Depends on | Spec |
|----|---------|-----------|------|
| 01 ✅ | Project scaffold + theme tokens | — | §1 |
| 02 ✅ | Domain: types, ids, time | 01 | §2, §3 |
| 03 ✅ | Domain: validation (Zod) | 02 | §2, §3, §6 |
| 04 ✅ | Domain: ordering (fractional index) | 02 | §2, §5.2, §6 |
| 05 ✅ | Domain: recurrence | 02 | §2, §5.8 |
| 06 ✅ | Domain: reminders + calendar | 02 | §2, §5.5–5.7 |
| 07 ✅ | Domain: truncation + url-utils + archive | 02 | §2, §5.12, §5.14 |
| 08 ✅ | Domain: colors + tags + quick-add + progress | 02, 03 | §2, §5.1, §5.3, §5.15, §5.17 |
| 09 ✅ | Storage: Repository + InMemory + contract test | 02 | §3, §4, §5.13, §8 |
| 10 ✅ | Storage: IndexedDbRepository + migration | 09 | §3, §5.13, §6 |
| 11 | Store (Zustand) + localStorage UI slice | 08, 09 | §4, §5.11, §6 |
| 12 | Reminder + recurrence tickers | 05, 06, 11 | §5, §5.7, §5.8, §5.20 |
| 13 | Projects sidebar | 11 | §6, §5.1 |
| 14 | Kanban board + sub-steps | 04, 08, 11 | §6, §5.2, §5.3 |
| 15 | Todo detail panel + date picker | 06, 08, 11 | §6, §5.4, §5.5 |
| 16 | Calendar view + recurring filter | 06, 11 | §6, §5.6, §5.9 |
| 17 | Focus 1-3-5 + focus areas | 11, 14 | §6, §5.10, §5.11 |
| 18 | Archive + search + tags sidebar | 07, 08, 11, 14 | §6, §5.12, §5.15, §5.16 |
| 19 | Command palette | 11, 13 | §6, §5.18 |
| 20 | Import/export + eat-the-frog toggle | 09, 11, 14 | §6, §5.13, §5.20 |
| 21 | Responsive layout + a11y/security/final validation | 13–20 | §7, §8 |

## Global validation (run at any checkpoint)

- `npm run typecheck` — strict, clean.
- `npm run test` — all unit/contract/component tests green.
- `npm run build` — succeeds.

Substeps 01–12 should keep `typecheck` + `test` green. UI substeps 13–21 add
component tests and must keep `build` green.
