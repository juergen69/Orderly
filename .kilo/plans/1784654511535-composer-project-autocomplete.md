# Plan: Composer `@` Project Autocomplete & Multi-word Parser Fix

## Goal
Fix two behaviors in the new-card composer (`Board.tsx` + `quick-add.ts`):
1. Unmatched `@` tokens are silently dropped from the title; preserve them as literal text.
2. Add an autocomplete dropdown for `@` project references, supporting multi-word project names.

---

## Scope / Affected Files
- `src/domain/quick-add.ts` — parser
- `src/domain/quick-add.test.ts` — tests
- `src/features/board/Board.tsx` — composer UI, submit handler, autocomplete
- `src/features/board/Board.module.css` — composer + autocomplete styles
- `src/features/board/Board.test.tsx` — composer/autocomplete tests

---

## Decision Summary
| Decision | Resolution |
|---|---|
| Unmatched `@` behavior | Preserve as literal title text (consistent with bare `@` and unknown `!` tokens) |
| Autocomplete trigger | `@` at token boundary only (start of input or after whitespace) |
| Multi-word project refs | User types `@My P` → autocomplete inserts `@My Project`. Parser greedily matches exact project names across tokens. |
| Parser matching | Case-insensitive **exact** match on full `Project.name`. Longest match wins when multiple projects share a prefix. |
| Selection replacement | Replace `@partial` token(s) with `@ProjectName` + trailing space; cursor placed after space |
| Popup positioning | Floating list below the textarea, left-aligned to the textarea edge |
| Keyboard nav | `ArrowDown`/`ArrowUp` navigate when popup open; `Enter`/`Tab` accept selection; `Escape` dismisses autocomplete only (dialog stays open; second `Escape` closes dialog) |
| Max list size | 8 results, case-insensitive prefix match on `name` |
| No-match state | Single non-selectable "No matching projects" item |

---

## Task 1: Fix `parseQuickAdd` — preserve unmatched `@` + support multi-word project names

### 1a — Preserve unmatched tokens
In `src/domain/quick-add.ts`, when `token.startsWith('@')` and `name.length > 0` but no project matches, push the original token into `titleParts` instead of silently dropping it.

### 1b — Multi-word project token resolution
Replace the simple single-token `@` matching with a greedy exact-match consumer:

1. Iterate tokens left to right.
2. When a token `@X` is encountered:
   a. Try to greedily consume subsequent whitespace-separated tokens, joining them with spaces.
   b. For each possible length (1, 2, 3, ... remaining tokens), check if the joined string case-insensitively **exactly equals** any `Project.name`.
   c. Use the **longest** exact match found.
   d. If a match is found, set `result.projectId = match.id` and skip all consumed tokens from the title.
   e. If no match, preserve the `@` token AND any consumed tokens literally in `titleParts`, then continue processing from the next unconsumed token.

**Example:**
- Projects: `{ id: 'p1', name: 'My Project' }`, `{ id: 'p2', name: 'Work' }`
- Input: `review @My Project specs !today`
- Tokens consumed by `@`: `@My`, `Project` → joined `"My Project"` → exact match → `projectId = 'p1'`
- Title: `review specs`, Due: today's date

**Edge cases handled:**
- `@My Proj` (partial multi-word) → no exact match → preserved literally as `@My Proj`
- `@Work` + project "Work" exists → exact match, single token, no consumption needed
- `@My` where both "My" and "My Project" exist → longest match wins ("My Project" if followed by `Project` token)

---

## Task 2: Composer autocomplete UI

### State additions (in `Board.tsx`)
- `projectSuggestions: Project[] | null` — filtered list; `null` = popup hidden
- `projectHighlightIndex: number` — keyboard index (-1 = none selected)
- `projectQueryStart: number` — character index in `composerDraft` where the current `@` token begins
- `projectQueryText: string` — the partial text after `@` (for display/positioning; filtered independently of the textarea value)

### Trigger detection
On every `composerDraft` change (or keydown):
- Scan backward from cursor position to find the nearest `@` at a token boundary (start of input or preceded by whitespace).
- If found AND cursor is still within that token (no whitespace between `@` and cursor), set `projectQueryStart` + `projectQueryText` and compute filtered suggestions.
- Otherwise (whitespace after partial, cursor moved past token, no `@` found), clear suggestions.

### Filtering
`filterProjects(projects, query)` — case-insensitive prefix match on `Project.name`, case-insensitive. Return up to 8 results, preserving project order.

### Rendering
Conditionally render a popup div below the textarea:
- Each project row: color dot + `name`
- Apply keyboard highlight class to row at `projectHighlightIndex`
- When `projectSuggestions.length === 0`, render single non-selectable "No matching projects" item

### Interaction handlers
- **Click on project row:** call `acceptProjectSuggestion(project)` which replaces `composerDraft.substring(projectQueryStart, cursor)` with `@${project.name} `, clears suggestions/highlight, focuses textarea with cursor after the inserted space.
- **ArrowDown/ArrowUp** (when popup open): cycle `projectHighlightIndex`, clamped to [0, list.length - 1]. Prevent default.
- **Enter/Tab** (when popup open and `projectHighlightIndex >= 0`): accept highlighted project. If "no match" row or no highlight, let `Enter` fall through to submit (existing behavior).
- **Escape** (when popup open): close popup only. Prevent default to avoid closing dialog. If popup already closed, existing Escape behavior closes the dialog.

### Styling (Board.module.css)
- `.projectSuggestions` — absolute/fixed positioned container below textarea
- `.projectSuggestionItem` — row with hover + highlight states
- `.projectSuggestionEmpty` — muted "no match" text

---

## Task 3: Tests

### quick-add.test.ts additions
- Unmatched `@` token appears in title verbatim
- Multi-word project `@My Project` resolves correctly
- Partial multi-word `@My Proj` is preserved as literal title text
- Mixed: single-word match + multi-word match in same input
- `@` at word boundary only (e.g., `email@work` not treated as project ref)
- Longest-match wins when multiple projects share a prefix

### Board.test.tsx additions
- Autocomplete opens when typing `@` followed by chars
- Filtering works case-insensitively with max 8 results
- Selection inserts full project name + trailing space, dismisses popup
- Multi-word project name inserted correctly
- Arrow keys / Enter / Escape behavior (autocomplete close vs dialog close)
- Invalid `@` preserved in title on submit

---

## Validation
- `npm run typecheck`
- `npm run test`

---

## Out of Scope
- Creating projects from the autocomplete (needs separate project-create flow)
- Touch-based caret coordinate tracking (uses fixed offset below textarea)
- Autocomplete for `#` tags or `!` dates (only `@` projects)
