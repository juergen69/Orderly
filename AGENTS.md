# Agent Workflow

## Finding the next substep

1. Read `.kilo/plans/orderly-substeps/00-index.md`.
2. Find the lowest-numbered substep that is **not** marked `[x]` in the index table.
3. Verify all substeps it depends on are marked `[x]`.
4. Read that substep's plan file (e.g. `.kilo/plans/orderly-substeps/02-domain-types-ids-time.md`) end to end before writing code.

## Branching

- For each substep, create a new branch from `main`:
  ```
  git checkout main
  git checkout -b substep/<NN>-<short-name>
  ```
  Example: `substep/02-domain-types-ids-time`
- Do all work on that branch.

## Marking completion

After validation passes and the commit is made:

1. Open `.kilo/plans/orderly-substeps/00-index.md`.
2. In the "Substep list & dependency graph" table, change the substep number column to include a checkmark, e.g. `01 ✅` or update the row to indicate completion.
3. Commit that change with message: `chore: mark substep <NN> complete`.

## Validation

Run the substep's listed validation commands (typically):
```
npm run typecheck
npm run test
```

## Commit convention

Use the commit message specified in the substep plan file.

## Creating Pull Requests

After completing each substep:

1. Push the branch to origin:
   ```
   git push -u origin substep/<NN>-<short-name>
   ```
2. Create a PR using `gh`:
   ```
   gh pr create --base main --title "<commit message from substep plan>" --body "<description>"
   ```
3. Include in the PR body:
   - Substep number and dependencies
   - Summary of changes
   - Validation results (typecheck/test status)

## kilo-code-bot review loop (MUST follow before merging)

After opening a PR, the `kilo-code-bot[bot]` runs a "Kilo Code Review" check
and posts its findings as **PR review comments** plus an issue-comment summary
(`<!-- kilo-review -->`).

- Do NOT treat a `success` conclusion on the Kilo Code Review **check run** as
  "no issues". The check just reports that the review ran; the actual findings
  live in the PR review comments / issue-comment summary, which may say
  "N Issues Found | Recommendation: Address before merge" even when the check
  is `success`.
- Always fetch and READ the review comments before merging:
  ```
  gh api repos/<owner>/<repo>/pulls/<N>/comments
  gh api repos/<owner>/<repo>/issues/<N>/comments   # the kilo-review summary
  ```
- If the bot found issues: fix ALL of them, commit on the same branch, push,
  and WAIT for the bot to re-review the new head commit.
- Only merge when the re-review summary says "No Issues Found | Recommendation:
  Merge". Then merge with `gh pr merge <N> --merge --delete-branch`.

## Notes

- No separate agent/subagent (Task tool) is used for these substeps; the work
  is done directly in the main session. The file `AGENTS.md` (not `agents.md`)
  is the workflow spec for this project.

## Coding Rules

The following rules are derived from recurring kilo-code-bot review findings across all PRs. Follow them to avoid repetitive fixes.

### Error Handling & Recovery
- Clear cached promises/state on failure paths so instances can recover from transient errors.
- Never reject with `undefined` or `null`; preserve error context from the originating event.
- Module-level mutable state (e.g., regexes with the `g` flag) is not concurrency/reentrancy safe — build fresh per call or document the single-threaded assumption.

### Type Safety
- Avoid `as` casts that bypass type guards; prefer runtime checks (`Array.isArray`, `typeof`, `in`) before narrowing.
- Default to safe values for optional data (`?? []`, `?? {}`) rather than casting potentially `undefined`/`null` values.
- When a field is named `*Id`, it must hold an actual identifier — never substitute a raw label or literal.

### Validation
- Reuse existing domain schemas/validators for imported/serialized data; do not duplicate validation logic with weaker rules.
- Validate all components of parsed strings (month/day ranges, year bounds) — `new Date()` silently rolls over invalid inputs.
- URL preservation must not extend past the truncation limit; clamp to `limit` or drop URLs that straddle the cutoff.

### Edge Cases & Defaults
- Handle empty inputs explicitly (empty arrays, empty strings, minimal keys) — document or implement behavior rather than leaving it unspecified.
- Silent character loss (dropped tokens, truncated strings) is a bug — fall through to literal text or throw a clear error.
- Bare tokens (`#`, `@`) with no content should not be silently consumed; preserve them as literal text.
- Fractional-index operations must handle prefix relationships correctly; test `between('a', 'ab')` and similar prefix cases.
- Functions that sort or redistribute must document whether input ordering is preserved or output is sorted.

### Plan Completeness
- When a plan specifies cascade behavior (delete, reassign, copy), explicitly state what happens to child entities (sub-steps, focus slots, etc.).
- Specify fallback chains for missing legacy fields rather than leaving them implicit.
- Specify concrete caps (iterations, lengths) for bounded loops — "max iterations" needs a number.
