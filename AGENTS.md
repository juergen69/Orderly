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
