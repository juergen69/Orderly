# Substep 09 — Storage: Repository interface + InMemory + contract test

**Depends on:** 02 · **Spec:** §3, §4, §5.13, §8

## Goal
Define the storage boundary and a fully-tested in-memory implementation, plus a
shared contract test suite that any impl must pass.

## Do
1. `src/storage/Repository.ts` — interface:
   - Per-entity CRUD for `projects`, `todos`, `subSteps`.
   - **Cascade rules (explicit):**
     - Deleting a todo cascade-deletes its sub-steps.
     - `deleteProject(id, { mode })` supports two modes, matching the UI dialog
       in substep 13:
       - `'cascade'` — delete the project, all its todos, and each of those
         todos' sub-steps, in one atomic operation.
       - `'reassign'` — reassign the project's todos to a target
         (`projectId | null` = no project) **keeping each todo's sub-steps with
         its parent** (sub-steps reference `todoId`, not `projectId`, so they
         move implicitly and must not be deleted), then delete the now-empty
         project.
     - No operation may leave orphaned todos or sub-steps.
   - `exportAll()` → full graph `{ projects, todos, subSteps }`.
   - `replaceAll(data)` — **atomic**; on failure prior data is left intact.
2. `src/storage/InMemoryRepository.ts` — implements the interface (primary test
   target). `replaceAll` must be all-or-nothing (validate/stage, then swap).
3. `src/storage/contract.test.ts` — a reusable suite (factory `(makeRepo) =>
   describe(...)`) covering CRUD, todo cascade delete, project delete in BOTH
   `cascade` (todos + sub-steps gone) and `reassign` (todos moved, sub-steps
   preserved, no orphans) modes, exportAll graph integrity, replaceAll atomicity
   (inject a failure → prior data intact). Run it here against
   `InMemoryRepository`.

## Do NOT
- Implement IndexedDB yet (substep 10) — but design the contract so substep 10
  can reuse `contract.test.ts` unchanged.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(storage): repository interface + in-memory impl + contract test`
