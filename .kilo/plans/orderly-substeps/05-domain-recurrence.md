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
     **capped loop** to avoid runaway on far-past dates. **Cap = 4000
     iterations** (exported as a named constant `ROLL_FORWARD_MAX_ITERATIONS`).
     4000 covers the worst realistic case — `daily` over a ~10-year gap
     (~3650 steps) — while `weekly`/`monthly`/`yearly` need far fewer.
     Implementations MAY compute the number of periods arithmetically for
     `daily`/`weekly` (still applying month/year clamping for
     `monthly`/`yearly`) to stay cheap. If the cap is hit (pathological/corrupt
     input), stop and return the last computed date rather than looping forever;
     do not throw.
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
