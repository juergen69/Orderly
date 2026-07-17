# Substep 06 — Domain: reminders + calendar

**Depends on:** 02 · **Spec:** §2, §5.5, §5.6, §5.7

## Goal
Reminder lead-time resolution and the month-grid calendar layout — both pure.

## Do
1. `src/domain/reminders.ts`:
   - `resolveReminder(dueDate, lead)` → absolute instant. Presets: on due /
     1 day before / 1 week before / 2 weeks before / custom, anchored to
     start-of-day as specified.
   - **Never throw** on malformed input — return null/no-reminder instead.
2. `src/domain/calendar.ts`:
   - `monthGrid(year, month)` → 6×7 Monday-first grid of dates.
   - `groupByDueDate(todos)` ordered by `boardOrder` then `createdAt`.
   - Exclude null/malformed dueDates.
3. Tests: `src/domain/reminders.test.ts` (each preset, malformed no-throw) and
   `src/domain/calendar.test.ts` (grid shape 6×7, Monday-first, month spillover
   cells, grouping/order, malformed exclusion).

## Do NOT
- Build any calendar React component (substep 16) or ticker (substep 12).

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(domain): reminders + calendar layout`
