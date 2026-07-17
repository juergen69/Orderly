# Substep 15 — Todo detail panel + custom date picker

**Depends on:** 06, 08, 11 · **Spec:** §6, §5.4, §5.5

## Goal
The todo detail panel with debounced live-save and a reusable custom date picker.

## Do
1. `src/components/DatePicker.tsx` (+ CSS Module):
   - 6×7 Monday-first grid (reuse `calendar.monthGrid`), prev/next month, Today
     button; emits ISO `YYYY-MM-DD`.
2. `src/features/todo-detail/TodoDetail.tsx` (+ CSS Module):
   - Debounced (300ms) live-save for title/description.
   - Immediate save for project, due (DatePicker), reminder (lead presets →
     `reminders.resolveReminder`), recurrence.
   - Reject empty title (reuse `validation`).
   - Tag input with autocomplete over existing tags (reuse `tags`).
   - Renders as a panel on desktop; full-screen sheet on mobile (sheet primitive
     can be minimal here, refined in substep 21).
3. Component tests: debounced title save, immediate due/recurrence save, empty
   title rejected, tag add/autocomplete, DatePicker emits correct ISO.

## Do NOT
- Finalize responsive sheet behavior (substep 21).

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(todo-detail): detail panel + custom date picker`
