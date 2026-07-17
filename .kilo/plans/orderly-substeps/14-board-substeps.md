# Substep 14 — Kanban board + sub-steps

**Depends on:** 04, 08, 11 · **Spec:** §6, §5.2, §5.3

## Goal
The 3-column Kanban board with dnd-kit move/reorder (one-record fractional
write), rich cards, inline quick-add, and sub-step management.

## Do
1. `src/features/board/Board.tsx` + `Column.tsx` + `Card.tsx` (+ CSS Modules):
   - 3 fixed columns (match spec §3 status names).
   - Card shows: project name/color tint, title, recurrence badge, due row
     (overdue + next-occurrence display), description snippet with URL links
     (use `url-utils`/`truncation`, no innerHTML), sub-step progress `X/Y`,
     frog toggle icon.
   - dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) with Pointer, Touch, and
     Keyboard sensors; activation constraints (hold/distance) to disambiguate
     scroll vs drag. Move + reorder writes **one** record via `ordering.between`.
   - Cancel-on-drop-outside.
   - Inline "add card" using `quick-add` parsing.
2. `src/features/board/SubSteps.tsx` — add/rename/toggle/delete/drag-reorder
   (fractional order) within a card or detail panel.
3. Frog toggle here uses `stopPropagation`; full frog rules land in substep 20 —
   here just render/toggle the flag and clear on move-to-done.
4. Component tests: render columns/cards, dnd reorder writes single record,
   inline quick-add creates a parsed todo, sub-step add/toggle/reorder.

## Do NOT
- Implement command palette, calendar, focus panels (later substeps).

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(board): kanban board + sub-steps with dnd-kit`
