# Substep 16 — Calendar view + recurring visibility filter

**Depends on:** 06, 11 · **Spec:** §6, §5.6, §5.9

## Goal
Month calendar view with filters and day-detail, plus the recurring-visibility
toggle.

## Do
1. `src/features/calendar/CalendarView.tsx` (+ CSS Module):
   - Month grid (reuse `calendar.monthGrid` + `groupByDueDate`), today highlight,
     prev/next.
   - Project + search + tag filters compose (AND).
   - Day-detail with reschedule (DatePicker) / clear due.
   - Mobile bottom-sheet + per-day dot/count indicator.
2. `src/features/recurrence/RecurringFilter.tsx` (or integrate into board):
   - Hide recurring todos with dueDate > 7 days out; Soon/All toggle persisted
     via uiState "show all recurring".
3. View switching board↔calendar via uiState active view.
4. Component tests: calendar renders grid + grouped todos, filters AND together,
   day-detail reschedule/clear, recurring filter Soon/All hides/shows correctly
   and persists.

## Do NOT
- Build focus panels / palette (later substeps).

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(calendar): month view + recurring visibility filter`
