# Substep 17 — Focus 1-3-5 panel + focus areas

**Depends on:** 11, 14 · **Spec:** §6, §5.10, §5.11

## Goal
The 1-3-5 focus panel (9 drag-driven slots) and the 3 free-text focus areas.

## Do
1. `src/features/focus-135/FocusPanel.tsx` (+ CSS Module):
   - 9 slots (1 big + 3 medium + 5 small per 1-3-5).
   - Drag semantics via dnd-kit:
     - column → slot: assigns reference.
     - slot → column: moves todo + clears slot.
     - slot → slot: moves reference.
   - Empty-slot "add" creates a new todo assigned to that slot.
   - Render slot empty when its referenced todo is done/deleted.
2. `src/features/focus-areas/FocusAreas.tsx` (+ CSS Module):
   - 3 boxes, inline edit; save on blur / Enter / Ctrl+Enter; visible Save
     button on touch; Escape cancels; placeholders.
   - Persisted via uiState; **never** touched by import/export.
3. Component tests: slot assign/move/clear semantics, empty-slot add, done/
   deleted todo empties slot, focus-area save/cancel keybindings + persistence.

## Do NOT
- Alter import/export (substep 20) beyond confirming focus areas untouched.

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(focus): 1-3-5 panel + focus areas`
