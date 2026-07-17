# Substep 21 — Responsive layout + a11y/security + final validation

**Depends on:** 13–20 · **Spec:** §7, §8

## Goal
Finish responsive behavior, complete the accessibility/security pass, and run
the full validation gate.

## Do
1. Responsive (§5.19, §7):
   - Breakpoints: mobile <640, tablet 640–1024, desktop >1024.
   - Sidebar → off-canvas drawer on mobile (hamburger; close on select/outside
     tap). `src/components/Drawer.tsx` + `Sheet.tsx` primitives.
   - Board: mobile single-column switcher / snap-scroll with an unambiguous
     current-column indicator.
   - Focus panel + focus areas reflow/stack.
   - 44×44px min touch targets throughout; toasts/dialogs full-width on mobile.
   - Todo-detail + calendar day-detail as bottom sheets on mobile.
2. A11y + security pass (§6, §8):
   - Semantic roles: banner/main/dialog/region/alert; aria-labels; keyboard drag
     works; no focus trapped behind modals.
   - Verify strict `#rrggbb` everywhere; size-capped + schema-validated imports;
     no `eval`/`Function`/`innerHTML`/`dangerouslySetInnerHTML` with user content.
3. Final validation gate (all must pass):
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:coverage` — `src/domain` ≥ 80%.
   - `npm run build` then `npm run preview` smoke.
4. Manual phone-width smoke checklist (document results in commit body): drawer,
   board column switcher, touch drag vs scroll, detail sheet, calendar bottom
   sheet.

## Validation
- All commands in step 3 pass.

## Commit
`feat(responsive): responsive layout + a11y/security + final pass`
