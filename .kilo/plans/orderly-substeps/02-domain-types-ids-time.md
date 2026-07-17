# Substep 02 — Domain: types, ids, time

**Depends on:** 01 · **Spec:** §2, §3

## Goal
Create the framework-free foundation of `src/domain/`: entity types/enums, id
generation, and time helpers with a well-defined "today" boundary. Unit tests
for `ids` and `time`.

## Do
1. `src/domain/types.ts`:
   - `Project` (id, name, color `#rrggbb`, createdAt, updatedAt, order/boardOrder
     as needed).
   - `Todo` (id, projectId|null, title, description, status, dueDate
     `YYYY-MM-DD`|null, boardOrder, createdAt, updatedAt, doneAt|null,
     recurrence, reminderAt|null, reminderLead, tags: string[], isFrog: boolean).
   - `SubStep` (id, todoId, title, done, order, createdAt).
   - `FocusArea` (id/index, text) and `FocusSlot` (index, todoId|null).
   - Enums/unions: `Status = 'todo'|'inProgress'|'done'`,
     `Recurrence = 'none'|'daily'|'weekly'|'monthly'|'yearly'`. Align exact
     status names with the spec §3; keep them centralized here.
2. `src/domain/ids.ts` — `newId()` via `crypto.randomUUID()` with a safe
   fallback; framework-free.
3. `src/domain/time.ts` — ISO date helpers: `todayIso()` (local `YYYY-MM-DD`),
   `nowIso()`, parse/format, `startOfDay`, comparison helpers, and the "today"
   boundary logic used by archive/recurrence. Deterministic & injectable clock
   (accept an optional `now: Date` arg) so tests don't depend on wall clock.
4. Tests: `src/domain/ids.test.ts` (uniqueness, format), `src/domain/time.test.ts`
   (today boundary, formatting, comparisons with injected clock).

## Do NOT
- Import React, Zustand, or storage. Keep this layer pure.
- Add Zod here (that's substep 03).

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(domain): types, ids, time helpers`
