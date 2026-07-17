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
