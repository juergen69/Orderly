# Substep 20 — Import/export + eat-the-frog toggle

**Depends on:** 09, 11, 14 · **Spec:** §6, §5.13, §5.20

## Goal
JSON import/export with atomic replace and validation, plus the board-wide
single-frog rules.

## Do
1. `src/features/io/ImportExport.tsx` (+ CSS Module):
   - Export `{ schemaVersion: 1, projects, todos, subSteps }` (via
     `repository.exportAll()`), download as JSON. **Focus areas excluded.**
   - Import: 5MB size cap → parse → Zod validate (reuse substep 03 schema:
     strip unknown top-level keys, reject version mismatch specifically, generic
     message on bad shape) → confirmation dialog → atomic `replaceAll`.
   - On import failure prior data is intact (relies on substep 09/10 atomicity).
   - **After a successful import**, call `reconcileFocusSlots` (substep 11) so
     focus slots referencing pre-import todo ids are cleared (imported todos
     have new ids). Focus **areas** (free text) remain untouched.
2. Eat-the-frog (§5.20): finalize rules across board:
   - Corner icon toggle with `stopPropagation`.
   - Single frog board-wide: setting one true sets the previous frog false.
   - Tapping the active frog clears it.
   - Auto-clear when a frog todo moves to Done.
   - Not carried to recurrence successors (already enforced in substep 12; verify).
3. Tests: export shape (focus areas excluded), import happy path replaces data,
   oversize rejected, version-mismatch vs bad-shape messages, mid-import failure
   leaves data intact; frog single-instance + clear-on-done + toggle-off.

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(io): import/export + eat-the-frog toggle`
