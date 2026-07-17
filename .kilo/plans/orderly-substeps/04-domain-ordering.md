# Substep 04 — Domain: ordering (fractional index)

**Depends on:** 02 · **Spec:** §2, §5.2, §6, eval item 3

## Goal
Fractional-index ordering so a move/reorder writes **one** record without
rewriting siblings.

## Do
1. `src/domain/ordering.ts`:
   - `first()`, `last(existing)`, `between(a, b)` producing a key strictly
     ordered between neighbors.
   - Insert at midpoint = single new key; siblings untouched.
   - Handle edges: insert at start (before smallest), at end (after largest),
     into empty list.
   - **Empty-list behavior (explicit):** `last([])` and `first()` must both
     return the same well-defined initial key (the midpoint of the key space,
     e.g. `"a0"` / `0.5` depending on the chosen key encoding) — never `null`,
     `undefined`, or throw. `between(undefined, first)` = before-first,
     `between(last, undefined)` = after-last, and
     `between(undefined, undefined)` = the initial key. Callers inserting into
     an empty list must get a valid key.
   - Define and document a rebalance strategy for when keys converge to the
     precision limit (either arbitrary-precision string keys or a
     `needsRebalance()` + `rebalance(list)` helper). Tests must exercise deep
     convergence.
2. `src/domain/ordering.test.ts` — ordering correctness, one-record-write
   guarantee (between() only depends on neighbors), repeated midpoint inserts,
   rebalance path, empty/edge cases (assert `last([])`/`first()` return a valid
   key and never throw).

## Do NOT
- Wire into store/UI. Pure module only.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(domain): fractional ordering index`
