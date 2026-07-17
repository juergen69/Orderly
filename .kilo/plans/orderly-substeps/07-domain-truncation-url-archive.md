# Substep 07 — Domain: truncation + url-utils + archive

**Depends on:** 02 · **Spec:** §2, §5.12, §5.14, eval extra credit

## Goal
Word-boundary truncation, safe linear-time URL detection, and done→archived
splitting — all pure.

## Do
1. `src/domain/truncation.ts` — `truncate(text, ~120)` at a word boundary;
   never cut a detected URL in half.
2. `src/domain/url-utils.ts` — linear-time URL regex (no catastrophic
   backtracking); `findUrls(text)` returning spans/tokens for safe rendering.
   No `dangerouslySetInnerHTML`; return data, not HTML.
3. `src/domain/archive.ts` — `splitArchived(doneTodos, today)`: a done todo with
   `doneAt` ≥ 3 full calendar days ago → archived; else recent. Use `time.ts`
   boundary logic + injected clock.
4. Tests for each: truncation (boundary, URL-preserving), url-utils (multiple
   URLs, adversarial no-backtracking input, non-URLs), archive (3-day boundary
   edges with injected clock, missing/naive dates).

## Do NOT
- Render anything. No React imports.

## Validation
- `npm run typecheck`
- `npm run test`

## Commit
`feat(domain): truncation, url-utils, archive`
