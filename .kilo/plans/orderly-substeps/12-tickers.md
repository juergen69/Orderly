# Substep 12 — Reminder + recurrence tickers

**Depends on:** 05, 06, 11 · **Spec:** §5, §5.7, §5.8, §5.20

## Goal
Two interval-driven tickers wired to the store, plus a toast primitive for
reminders.

## Do
1. `src/components/Toast.tsx` (+ CSS Module) — accessible `role="alert"` toast /
   toast host. Minimal; reused later.
2. `src/features/reminders/reminderTicker.ts` (hook, e.g. `useReminderTicker`):
   - Runs ~every 30s + on mount.
   - Fire toast when `reminderAt <= now`.
   - Session "seen" set prevents re-toast until dismiss/snooze.
   - Dismiss clears `reminderAt`; Snooze sets `now + 10min`.
   - Skip malformed reminders (never throw).
3. `src/features/recurrence/recurrenceTicker.ts` (hook):
   - Runs ~every 60s + on mount.
   - For each recurring todo with `dueDate < today`: compute nextDue
     (`rollForward` to `>= today`), set the original's `recurrence:'none'`, and
     spawn **one** successor copying title/description/projectId with the new
     dueDate and the original rule. Successor starts **frog-free**.
4. Tests with fake timers: reminder fire/seen/dismiss/snooze lifecycle;
   recurrence spawns exactly one successor, original demoted to `none`, successor
   frog-free.

## Do NOT
- Build the full board/detail UI (later substeps). Tickers can mount from a
  placeholder App.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(tickers): reminder + recurrence tickers`
