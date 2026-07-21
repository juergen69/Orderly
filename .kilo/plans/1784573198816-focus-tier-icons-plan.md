# Focus Tier Icons — 1-3-5 Panel

Add tier-identification icons to the Focus 1-3-5 panel so users can
visually distinguish big/medium/small tasks at a glance.

## Tier definitions

| Tier | Icon | Color | Capacity |
|------|------|-------|----------|
| 1 (big) | 🔥 | accent/warm | 1 slot |
| 3 (medium) | ⚡ | primary | 3 slots |
| 5 (small) | 💧 | secondary/cool | 5 slots |

## Cycle behavior

- Clicking the tier button on a slot cycles: `null → 5 → 3 → 1 → null`.
- When assigning from `null`, skip tiers already at capacity.
- When cycling *out* of a tier (e.g., 1 → next), the vacated capacity
  is immediately available, so the next slot can take it.
- If all 9 slots are assigned a tier, the button is disabled.

## Data model

`FocusSlot` gains `tier?: 1 | 3 | 5`.

Store actions:
- `setFocusSlotTier(index: number, tier: 1 | 3 | 5 | null): void`
- Tier is persisted alongside existing slot data in localStorage.

## UI changes

1. Each `FocusSlot` renders a tier button (icon-only, right side).
2. Clicking the button invokes the cycle logic described above.
3. A filled slot card shows its tier icon + tier color as an accent
   (left border or badge).
4. A legend row sits below the slots grid:
   🔥 1 big task · ⚡ 3 medium tasks · 💧 5 small tasks

## Edge cases

- Empty slot with tier assigned: still shows the add-input and the
  tier button. The todo is assigned only when created.
- Drag/reorder of slots is not required; tier is index-bound.
- Import/export: tier data is part of `FocusSlot` and is included
  automatically by existing serialization.
- `reconcileFocusSlots` already clears stale todo refs; it does not
  need to touch tiers (tiers survive empty slots).

## Files to change

- `src/domain/types.ts` — add `tier?: 1 | 3 | 5` to `FocusSlot`
- `src/store/uiState.ts` — include `tier` in default/sanitize/serialize
- `src/store/store.ts` — add `setFocusSlotTier` action
- `src/features/focus-135/FocusPanel.tsx` — tier button, cycle logic,
  legend
- `src/features/focus-135/FocusPanel.module.css` — tier button styles,
  per-tier colors, legend styles

## Validation

- `npm run typecheck`
- `npm run test`
- `npm run build`
