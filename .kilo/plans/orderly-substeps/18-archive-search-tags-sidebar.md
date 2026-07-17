# Substep 18 — Archive + search + tags sidebar

**Depends on:** 07, 08, 11, 14 · **Spec:** §6, §5.12, §5.15, §5.16

## Goal
Done-column archive toggle, header search, and the tags sidebar section with
card pill chips.

## Do
1. Archive (§5.12): in the Done column show `+ N archived items` toggle
   (reuse `archive.splitArchived`); archived items render dimmer.
2. `src/features/search/SearchBar.tsx` (§5.16): header input, ~150ms debounce,
   case-insensitive substring over title + description; ANDs with project + tag
   filters; Escape clears.
3. `src/features/tags/TagsSidebar.tsx` (§5.15): collapsible section, frequency +
   alpha sort (reuse `tags.sortTagsForSidebar`), click adds tag to the transient
   filter. Card pill chips with `+N` overflow (add to `Card` if needed).
4. Component tests: archive toggle shows/hides + dims, search debounce +
   substring + AND with filters + Escape clears, tags sidebar sort + click-to-
   filter, chip overflow `+N`.

## Do NOT
- Build the command palette (substep 19).

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(views): archive toggle + search + tags sidebar`
