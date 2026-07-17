# Substep 10 — Storage: IndexedDbRepository + migration/backfill

**Depends on:** 09 · **Spec:** §3, §5.13, §6

## Goal
IndexedDB-backed implementation passing the same contract test, plus on-load
migration/backfill of legacy/additive fields.

## Do
1. `src/storage/IndexedDbRepository.ts`:
   - Object stores: `projects`, `todos`, `subSteps`.
   - Indexes as needed: `projectId`, `todoId`, `status`, `dueDate`.
   - `replaceAll` runs inside a **single IndexedDB transaction** so a mid-write
     failure rolls back (prior data intact).
   - Cascade sub-step delete on todo delete.
2. `src/storage/migration.ts` — on-load backfill:
   - Legacy done todos missing `doneAt` → use `updatedAt`.
   - Additive field defaults: `recurrence:'none'`, `doneAt:null`, `tags:[]`,
     `isFrog:false` (and any other new fields).
3. Extend `contract.test.ts` usage: run the shared suite against
   `IndexedDbRepository` using `fake-indexeddb`. Add a migration unit test.

## Do NOT
- Touch store/UI. Keep the repo interface identical to substep 09.

## Validation
- `npm run typecheck`
- `npm run test` (contract suite green on BOTH impls)

## Commit
`feat(storage): indexeddb impl + migration/backfill`
