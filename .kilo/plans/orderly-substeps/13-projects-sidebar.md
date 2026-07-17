# Substep 13 — Projects sidebar

**Depends on:** 11 · **Spec:** §6, §5.1

## Goal
Projects sidebar feature: list, create/edit with validated color, delete with
cascade-vs-reassign dialog. This is the first real UI substep; establish the app
shell if not already present.

## Do
1. Minimal app shell/layout if missing: `src/App.tsx` with a sidebar region +
   main region (semantic `banner`/`main`/`region` roles). Mount tickers here.
2. `src/features/projects/ProjectsSidebar.tsx` (+ CSS Module):
   - Projects sorted by name; "All projects" row.
   - Transient filter (select a project to filter the board; not persisted).
   - Create/edit via a small palette + validated `#rrggbb` hex input (reuse
     `validation` + `colors` default).
   - Delete → confirmation dialog offering **cascade delete** vs **reassign**
     todos to another project / no project.
3. `src/components/ConfirmDialog.tsx` (+ CSS Module) — accessible dialog
   (`role="dialog"`, focus-trapped) reused by other features.
4. Component tests: render/sort, create with invalid hex rejected, delete dialog
   cascade vs reassign paths (against store + InMemoryRepository).

## Do NOT
- Build the board (substep 14). A placeholder main area is fine.

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(projects): sidebar + create/edit/delete dialog`
