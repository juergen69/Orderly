# Substep 09 — Storage: Repository interface + InMemory + contract test

**Depends on:** 02 · **Spec:** §3, §4, §5.13, §8

## Goal
Define the storage boundary and a fully-tested in-memory implementation, plus a
shared contract test suite that any impl must pass.

## Do
1. `src/storage/Repository.ts` — interface:
   - Per-entity CRUD for `projects`, `todos`, `subSteps`.
   - Deleting a todo cascade-deletes its sub-steps.
   - `exportAll()` → full graph `{ projects, todos, subSteps }`.
   - `replaceAll(data)` — **atomic**; on failure prior data is left intact.
2. `src/storage/InMemoryRepository.ts` — implements the interface (primary test
   target). `replaceAll` must be all-or-nothing (validate/stage, then swap).
3. `src/storage/contract.test.ts` — a reusable suite (factory `(makeRepo) =>
   describe(...)`) covering CRUD, cascade delete, exportAll graph integrity,
   replaceAll atomicity (inject a failure → prior data intact). Run it here
   against `InMemoryRepository`.

## Do NOT
- Implement IndexedDB yet (substep 10) — but design the contract so substep 10
  can reuse `contract.test.ts` unchanged.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(storage): repository interface + in-memory impl + contract test`
