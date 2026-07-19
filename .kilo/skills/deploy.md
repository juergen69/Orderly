# Deploy

Build the production bundle and publish it to the `deploy` branch, which contains only the `dist` output.

## When to use

- The user asks to "build and deploy", "redeploy", "publish the site", or "update the deploy branch".
- After merging a PR to `main` and the user wants the changes live.

## Prerequisites

- `npm` dependencies are installed (`npm install`).
- The repository has a `deploy` branch on origin.
- The build command is `npm run build`.

## Steps

1. Ensure you are on `main` and it is up to date:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Build the production bundle:
   ```bash
   npm run build
   ```

3. Replace the contents of the `deploy` branch with the `dist` output:
   ```bash
   git checkout deploy
   git rm -rf .
   cp -r dist/* .
   git add .
   git commit -m "deploy: build from main $(git rev-parse --short main)"
   git push origin deploy
   git checkout main
   ```

4. Verify the deploy branch on GitHub contains:
   - `index.html`
   - `assets/` directory

## Notes

- This process uses an orphan-style `deploy` branch; source files are intentionally removed so the branch only contains the built static assets.
- Do not commit `dist` to `main`.
- If the build fails, fix the failures on `main` first, then repeat the deployment steps.
