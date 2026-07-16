# Orderly — One-Shot Rebuild Implementation Plan

Local-first personal task manager. Greenfield build in an empty repo. Source
spec: the attached "Orderly — One-Shot Rebuild Specification" (§ references
below point to it).

## Decisions (locked)

- **Framework/build:** React 18 + Vite + TypeScript (strict mode).
- **State:** Zustand — one store, repository injected for testability (§7).
- **Validation:** Zod — todo/project input + import schema parsing (§5.13).
- **Drag-and-drop:** dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) with
  Pointer, Touch, and Keyboard sensors; activation constraints (hold/distance)
  to disambiguate scroll vs drag on mobile (§5.2, 5.3, 5.10, a11y §6).
- **Styling:** CSS Modules + CSS custom properties for the Tron neon theme
  tokens (§1). No CSS-in-JS. No `dangerouslySetInnerHTML` anywhere (§2).
- **Testing:** Vitest + React Testing Library; `fake-indexeddb` for the
  IndexedDB contract test. ≥80% coverage on domain logic (§8).
- **Hosting:** Fully static SPA. `npm run build` → `dist/` served by any static
  host/CDN. No backend, no runtime network calls (§2). Data is origin-scoped in
  the browser.

## Architecture

```
components/ + features/  →  store (Zustand)  →  repository interface  →  IndexedDB impl
                                                                      ↘  in-memory impl (tests)
domain/ (pure, framework-free, unit-tested) — imported by store & features
```

UI never talks to IndexedDB directly (§2, §7). Storage is injected into the
store so tests can swap the in-memory impl.

Directory layout:
- `src/domain/` — types, validation, ordering, recurrence, reminders, calendar,
  url-utils, truncation, progress, archive, colors, tags, quick-add parser.
- `src/storage/` — `Repository` interface, `IndexedDbRepository`,
  `InMemoryRepository`, shared contract test.
- `src/store/` — Zustand store + actions (repository injected), localStorage
  UI-state slice.
- `src/features/` — projects, board, calendar, todo-detail, tags, search,
  reminders, recurrence, focus-135, focus-areas, command-palette, io.
- `src/components/` — date picker, dialogs (confirm/cascade), toast, command
  palette overlay, drawer/sheet primitives.

## Build order (ordered task list)

### 1. Project scaffold
- Vite React-TS app; enable `strict` + `noUncheckedIndexedAccess` in tsconfig.
- Add deps: zustand, zod, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities.
- Add dev deps: vitest, @testing-library/react, @testing-library/user-event,
  jsdom, fake-indexeddb, @vitest/coverage-v8.
- Scripts: `dev`, `build`, `preview`, `test`, `test:coverage`, `typecheck`.
- Theme tokens CSS (near-black surfaces, cyan/orange glows, grid) as CSS vars.

### 2. Domain layer (pure + unit tests first)
Each module framework-free with its own `*.test.ts`:
- `types.ts` — Project, Todo, SubStep, FocusArea, FocusSlot, enums (§3).
- `ids.ts` / `time.ts` — uuid, ISO helpers, "today" boundary logic.
- `validation.ts` — Zod schemas: name/title non-empty after trim, description
  ≤2000, `#rrggbb` strict regex, tag rules (lowercase/trim/dedupe, ≤10/todo,
  ≤24 chars each), status/recurrence enums, dueDate `YYYY-MM-DD` (§3, §6).
- `ordering.ts` — fractional index: `between(a,b)`, `first`, `last`; midpoint
  insert = one record, no sibling rewrite (§5.2, §6, eval item 3).
- `recurrence.ts` — advance daily/weekly/monthly/yearly with month/year
  clamping (Jan 31 +1mo → Feb 28/29; Feb 29 +1yr → Feb 28); long-overdue
  roll-forward until `>= today` with capped loop (§5.8, eval item 4).
- `reminders.ts` — lead-time preset → absolute instant (on due / 1d / 1w / 2w /
  custom start-of-day); never throw on malformed input (§5.7).
- `calendar.ts` — 6×7 Monday-first month grid; group todos by dueDate, order by
  `boardOrder` then `createdAt`; exclude null/malformed dates (§5.5, §5.6).
- `truncation.ts` + `url-utils.ts` — word-boundary truncate ~120 chars;
  linear-time URL regex (no catastrophic backtracking); never cut a URL in half
  (§5.14, eval extra credit).
- `archive.ts` — split done todos: `doneAt` ≥ 3 full calendar days ago →
  archived (§5.12).
- `colors.ts` — ~12 neon palette across hue wheel, cyan default; tag→color via
  string hash → palette index (§5.1, §5.15).
- `tags.ts` — normalization on write; frequency+alpha sort for sidebar (§5.15).
- `quick-add.ts` — parse `#tag`, `@Project` (case-insensitive first match, keep
  literal if unmatched), `!today`/`!tomorrow`/`!mon..!sun`; strip recognized
  tokens from title; never throw (§5.17).
- `progress.ts` — `X/Y` sub-step completion (§5.3).

### 3. Storage layer
- `Repository` interface: per-entity CRUD for projects/todos/subSteps + note
  cascade delete of sub-steps; `exportAll()` → full graph; `replaceAll(data)`
  atomic in a single IndexedDB transaction (failure leaves prior data intact)
  (§4, §5.13).
- `InMemoryRepository` (primary test target).
- `IndexedDbRepository` (object stores: projects, todos, subSteps; indexes on
  projectId/todoId/status/dueDate as needed).
- `contract.test.ts` — shared suite run against BOTH impls (fake-indexeddb for
  the IDB one) (§8, eval).
- On-load migration/backfill: legacy done todos missing `doneAt` → use
  `updatedAt`; additive fields default (`recurrence:'none'`, `doneAt:null`,
  `tags:[]`, `isFrog:false`) (§6, §5.13).

### 4. Store + localStorage UI state
- Zustand store holding entities + derived selectors; all mutations write
  through the injected repository.
- localStorage slice with SSR/private-mode fallback to defaults (§6): active
  view (board|calendar), "show all recurring" toggle, 9 focus slots, 3 focus
  areas. Focus areas never touched by import/export (§5.11).
- Actions cover every mutation used by features below.

### 5. Reminder + recurrence tickers
- Reminder ticker (~30s + on mount): fire toast when `reminderAt <= now`;
  session "seen" set prevents re-toast until dismiss/snooze; Dismiss clears
  `reminderAt`, Snooze sets `now + 10min`; skip malformed (§5.7).
- Recurrence ticker (~60s + on mount): for each recurring todo with `dueDate <
  today` → compute nextDue (roll to `>= today`), set original `recurrence:'none'`,
  spawn one successor copying title/description/projectId with new dueDate and
  original rule; successor starts frog-free (§5.8, §5.20).

### 6. UI features
- **Projects sidebar** (§5.1): sorted by name, All-projects row, transient
  filter, create/edit (palette + validated hex), delete → cascade-vs-reassign
  dialog.
- **Kanban board** (§5.2): 3 fixed columns; cards show project/title/recurrence
  badge/due row (overdue + next-occurrence display)/description snippet with URL
  links/sub-step progress/frog toggle; project-color tint; dnd-kit move+reorder
  with one-record fractional write; cancel-on-drop-outside; inline add-card with
  quick-add parsing; keyboard sensor.
- **Sub-steps** (§5.3): add/rename/toggle/delete/drag-reorder (fractional).
- **Todo detail panel** (§5.4): debounced (300ms) live-save title/description,
  immediate save for project/due/reminder/recurrence; reject empty title; tag
  input with autocomplete (§5.15); full-screen sheet on mobile (§5.19).
- **Custom date picker** (§5.5): 6×7 Monday-first, prev/next, Today, emits ISO.
- **Calendar view** (§5.6): month grid, today highlight, project+search+tag
  filters, day-detail with reschedule/clear; mobile bottom-sheet + dot/count.
- **Recurring visibility filter** (§5.9): hide recurring >7 days out; Soon/All
  toggle persisted.
- **Focus panel 1-3-5** (§5.10): 9 slots, drag semantics (column→slot assigns;
  slot→column moves+clears; slot→slot moves ref); empty-slot add creates todo;
  render empty when referenced todo done/deleted.
- **Focus areas** (§5.11): 3 boxes, inline edit save-on-blur/Enter/Ctrl+Enter
  (+ visible Save on touch), Escape cancels, placeholders.
- **Archive** (§5.12): `+ N archived items` toggle in Done column, dimmer style.
- **Search** (§5.16): header input, ~150ms debounce, case-insensitive substring
  on title+description, ANDs with project+tag filters, Escape clears.
- **Tags sidebar section** (§5.15): collapsible, frequency+alpha, click adds to
  transient filter; card pill chips with `+N` overflow.
- **Command palette** (§5.18): Cmd/Ctrl+K + header touch button, dialog role,
  focus-trapped, fuzzy match over static command array (new todo, jump to
  project, switch view, focus search, open each focus area/slot); arrow/Enter/
  Escape + tappable.
- **Import/export** (§5.13): export `{schemaVersion:1, projects, todos,
  subSteps}`; import 5MB cap → parse → Zod validate (strip unknown top-level
  keys, reject version mismatch specifically, generic message on bad shape) →
  confirm dialog → atomic `replaceAll`.
- **Eat-the-frog toggle** (§5.20): corner icon with `stopPropagation`; single
  frog board-wide (set true here, false on prior); tap active clears; auto-clear
  on move to done; not carried to recurrence successors.

### 7. Responsive layout (§5.19)
- Breakpoints mobile <640 / tablet 640–1024 / desktop >1024.
- Sidebar off-canvas drawer on mobile (hamburger, close on select/outside-tap).
- Board: mobile single-column switcher/snap-scroll with unambiguous current
  indicator.
- Focus panel + focus areas reflow/stack; 44×44px min touch targets throughout;
  toasts/dialogs full-width on mobile.

### 8. A11y + security pass (§6)
- Semantic roles (banner/main/dialog/region/alert), aria-labels, keyboard drag,
  no focus trapped behind modals.
- Strict `#rrggbb` on all colors; size-capped + schema-validated imports; no
  eval/Function/innerHTML with user content.

## Risks / watch-outs
- Fractional-index precision: rebalance strategy when keys converge; test the
  one-record-write guarantee (eval item 3).
- Recurrence loop must be capped to avoid runaway on far-past dates (§5.8).
- Mobile drag vs scroll disambiguation via dnd-kit activation constraints — must
  be manually verified on a phone-width viewport (eval item 9).
- Import atomicity: verify a mid-`replaceAll` failure leaves prior data intact
  (§5.13, eval item 5).
- localStorage absence (private mode/SSR) must fall back, not throw (§6).

## Validation plan
- `npm run typecheck` (strict, clean).
- `npm run test` — domain unit tests, storage contract test on both impls,
  component tests (dnd reorder, board/calendar render, detail live-save,
  reminder toast lifecycle, import happy/error, search, palette keyboard nav).
- `npm run test:coverage` — ≥80% on `src/domain`.
- `npm run build` succeeds; `npm run preview` smoke test.
- Manual phone-width smoke: drawer, board column switcher, touch drag, detail
  sheet, calendar bottom-sheet.

## Out of scope (§10)
No sync, accounts, or backend. Do not build anything sync-specific; just keep
the repository interface clean so a future third impl remains possible.
