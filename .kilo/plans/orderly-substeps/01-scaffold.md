# Substep 01 — Project scaffold + theme tokens

**Depends on:** none · **Spec:** §1, §2

## Goal
Stand up an empty-repo Vite + React 18 + TypeScript app in strict mode with all
runtime/dev deps, npm scripts, and the Tron neon theme tokens. Repo must build,
typecheck, and run an (empty) test suite cleanly.

## Do
1. Scaffold Vite React-TS app at repo root (`npm create vite@latest . --
   --template react-ts`, or equivalent manual setup). Keep it at the repo root,
   not a subfolder.
2. `tsconfig.json`: enable `"strict": true` and
   `"noUncheckedIndexedAccess": true`.
3. Add runtime deps: `zustand`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`,
   `@dnd-kit/utilities`.
4. Add dev deps: `vitest`, `@testing-library/react`,
   `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`,
   `fake-indexeddb`, `@vitest/coverage-v8`.
5. `package.json` scripts: `dev`, `build`, `preview`, `test` (vitest run),
   `test:coverage` (vitest run --coverage), `typecheck` (`tsc --noEmit`).
6. Vitest config: `environment: 'jsdom'`, globals on, setup file registering
   `@testing-library/jest-dom` and importing `fake-indexeddb/auto` (guarded so
   it only affects test env). Coverage provider `v8`, include `src/domain`.
7. `src/styles/tokens.css` — CSS custom properties for the Tron neon theme:
   near-black surfaces, cyan primary glow, orange accent glow, subtle grid
   background. Import once from app root. No CSS-in-JS.
8. Add a trivial smoke test (e.g. `src/smoke.test.ts` asserting `1+1===2`) so
   `npm run test` exercises the runner. Remove later if desired.
9. `.gitignore` includes `node_modules`, `dist`, coverage output.

## Do NOT
- Add any domain/store/UI logic yet.
- Introduce Tailwind or any CSS-in-JS library.

## Validation
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Commit
`feat(scaffold): vite react-ts strict + deps + theme tokens`
