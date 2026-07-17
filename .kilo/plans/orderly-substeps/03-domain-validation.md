# Substep 03 — Domain: validation (Zod)

**Depends on:** 02 · **Spec:** §2, §3, §6

## Goal
Zod schemas + helpers validating todo/project input and the import payload.

## Do
1. `src/domain/validation.ts`:
   - Project name / todo title: non-empty after trim.
   - Description: ≤ 2000 chars.
   - Color: strict `^#[0-9a-fA-F]{6}$` regex.
   - Tags: lowercase + trim + dedupe; ≤ 10 per todo; ≤ 24 chars each.
   - `status` and `recurrence` enums (reuse unions from `types.ts`).
   - `dueDate`: `YYYY-MM-DD` (valid calendar date) or null.
   - Export/import schema: `{ schemaVersion: 1, projects, todos, subSteps }`;
     strip unknown top-level keys; reject a *version mismatch* specifically
     (distinct error) vs generic bad-shape error.
   - Provide parse helpers that return typed results and clear error info; input
     normalizers (e.g. `normalizeTags`) callable independently.
2. `src/domain/validation.test.ts` — cover trim/empty, description cap, hex
   pass/fail cases, tag normalization + limits, dueDate valid/invalid, import
   version mismatch vs bad shape, unknown-key stripping.

## Do NOT
- Persist anything or import storage/store/React.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(domain): zod validation schemas`
