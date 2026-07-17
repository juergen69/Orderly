# Substep 08 — Domain: colors + tags + quick-add + progress

**Depends on:** 02, 03 · **Spec:** §2, §5.1, §5.3, §5.15, §5.17

## Goal
Finish the domain layer: color palette + deterministic tag colors, tag
normalization/sorting, the quick-add parser, and sub-step progress.

## Do
1. `src/domain/colors.ts` — ~12 neon palette spread across the hue wheel, cyan
   default; `colorForTag(tag)` via string hash → stable palette index.
2. `src/domain/tags.ts` — normalization on write (reuse validation normalizer);
   `sortTagsForSidebar(tags)` by frequency then alpha.
3. `src/domain/quick-add.ts` — parse `#tag`, `@Project`
   (case-insensitive first match; keep literal if unmatched),
   `!today`/`!tomorrow`/`!mon..!sun` due tokens; strip recognized tokens from
   the resulting title; **never throw**.
4. `src/domain/progress.ts` — `progress(subSteps)` → `{done, total}` / `X/Y`.
5. Tests for each: colors (stability, default, distribution), tags (normalize,
   frequency+alpha sort), quick-add (each token type, unmatched project literal,
   token stripping, malformed no-throw), progress (0/0, partial, all done).

## Do NOT
- Wire into store/UI.

## Validation
- `npm run typecheck`
- `npm run test`
- `npm run test:coverage` — confirm `src/domain` ≥ 80% (domain layer now
  complete).

## Commit
`feat(domain): colors, tags, quick-add, progress`
