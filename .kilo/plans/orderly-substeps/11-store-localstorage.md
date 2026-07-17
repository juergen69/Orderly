# Substep 11 — Store (Zustand) + localStorage UI slice

**Depends on:** 08, 09 · **Spec:** §4, §5.11, §6

## Goal
Single Zustand store holding entities + derived selectors, with all mutations
writing through an **injected** repository; plus a localStorage-backed UI-state
slice with safe fallbacks.

## Do
1. `src/store/store.ts` — create store with repository injected (factory that
   takes a `Repository`; default to `IndexedDbRepository`, tests pass
   `InMemoryRepository`). Hold projects/todos/subSteps + focus slots/areas.
2. Actions for every mutation needed downstream: CRUD projects/todos/subSteps,
   reorder (uses `ordering`), move todo between columns, toggle sub-step, set
   due/reminder/recurrence/tags, frog toggle, focus slot/area updates. Each
   action mutates state AND persists via the repository.
3. Selectors: todos by project/column/date, tag frequencies, progress, archived
   split, etc. (reuse domain modules).
4. `src/store/uiState.ts` — localStorage slice with **SSR/private-mode
   fallback** (never throw; fall back to defaults): active view
   (`board|calendar`), "show all recurring" toggle, 9 focus slots, 3 focus
   areas.
   - **Focus AREAS (free text) are never touched by import/export.**
   - **Focus SLOTS reference todos by id**, so they must be reconciled whenever
     the todo set is replaced or a referenced todo disappears:
     - Provide `reconcileFocusSlots(validTodoIds)` that clears any slot whose
       `todoId` is not in `validTodoIds`.
     - Call it after `replaceAll` (import) — since imported todos get their own
       ids, this effectively **resets all focus slots** (they will not match).
     - Also call it after todo delete and when a referenced todo becomes done
       (per §5.10 render-empty rule), so slots never dangle.
5. Tests: `src/store/store.test.ts` (actions persist via InMemoryRepository,
   selectors correct), a uiState test proving localStorage-absent fallback, and
   a `reconcileFocusSlots` test proving import/delete clears stale slot refs
   while leaving focus areas untouched.

## Do NOT
- Build React components yet. Store + hooks only.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(store): zustand store + localStorage ui slice`
