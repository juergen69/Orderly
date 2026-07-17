# Substep 19 — Command palette

**Depends on:** 11, 13 · **Spec:** §6, §5.18

## Goal
Cmd/Ctrl+K command palette with fuzzy match, keyboard nav, and touch entry.

## Do
1. `src/features/command-palette/CommandPalette.tsx` + overlay component
   (+ CSS Module):
   - Open via Cmd/Ctrl+K and a header touch button.
   - `role="dialog"`, focus-trapped, closes on Escape/outside.
   - Fuzzy match over a static command array: new todo, jump to project (one per
     project), switch view (board/calendar), focus search, open each focus area,
     open each focus slot.
   - Arrow up/down to move, Enter to run, Escape to close; commands also
     tappable.
2. `src/features/command-palette/commands.ts` — builds the command list from
   store state (projects, views, focus targets) + their actions.
3. Component tests: open/close, fuzzy filter, arrow/Enter selection runs the
   right action, focus trap, tap selection.

## Do NOT
- Add import/export commands here unless trivial; io lives in substep 20.

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(palette): command palette with fuzzy search`
