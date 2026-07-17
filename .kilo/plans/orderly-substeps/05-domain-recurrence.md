# Substep 05 — Domain: recurrence

**Depends on:** 02 · **Spec:** §2, §5.8, eval item 4

## Goal
Pure recurrence date math with month/year clamping and capped long-overdue
roll-forward.

## Do
1. `src/domain/recurrence.ts`:
   - `advance(dueDate, rule)` for `daily|weekly|monthly|yearly`.
   - Month clamping: Jan 31 + 1 month → Feb 28/29.
   - Year clamping: Feb 29 + 1 year → Feb 28.
   - `rollForward(dueDate, rule, today)` advancing until `>= today`, with a
     **capped loop** (e.g. max iterations) to avoid runaway on far-past dates;
     document the cap.
   - `rule === 'none'` is a no-op / not advanced.
2. `src/domain/recurrence.test.ts` — each cadence, leap-year edges, month-end
   clamping, long-overdue roll-forward reaching `>= today`, cap safety.

## Do NOT
- Spawn successor todos or touch the store (that's substep 12).

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(domain): recurrence date math`
