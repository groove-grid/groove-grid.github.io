---
title: 'Story 2.6: Choose visible subdivisions'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'fb024e94e90aa118cba689917959705b2ccdbca3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The top bar is an empty placeholder, so a musician cannot change which subdivisions the grid shows.

**Approach:** Render the top bar with METER, GRID and CLICK chip pairs. The GRID chip opens a picker (bottom sheet below 768px, popover from 768px) that sets the finest visible level through a new store action. The grid layer already redraws from `settings.grid`.

## Boundaries & Constraints

**Always:** Top bar: caption (`chip-caption`: 11px, uppercase) above a 48px `picker-chip` (pill, `surface-raised`, 1px `border-hairline`, 12px side padding, label = current value, open = 1.5px ink outline, pressed `surface-pressed`), `space-2` gaps, bottom-aligned, never scrolling or hiding, inside the existing 74px top row. The caption is part of the chip's accessible name (`Grid, 16ths`), not a separate stop. Chip labels: METER `{beats}/{beatUnit}`; GRID `Beats` / `8ths` / `16ths` / `Triplets` for grid 1/2/4/3; CLICK `Every beat` for now. METER and CLICK are inert placeholders (no handler, no popup). Mute toggle is not part of this story.
Grid sheet: dialog titled `Grid` (`label` type), four 48px single-choice rows (`Beats`, `8ths`, `16ths`, `Triplets`; `radiogroup`; selected row shows an ink check left of the label), then a `border-hairline` divider and a disabled `Clear all markers` row (`ink-disabled`, `aria-disabled`, does nothing until Epic 4). Selecting a row calls `settingsStore.setGrid`, which applies live, and closes the sheet. Below 768px: bottom sheet, `surface-raised`, 20px top radius, 16px padding, scrim `--scrim` at 0.32 closing on tap, close also on swipe-down (pointer drag down >60px on the sheet) and Esc, `aria-modal`, focus moves into the sheet, is trapped (Tab/Shift+Tab cycle) and returns to the chip on close. From 768px: popover instead, 360px wide, `radius-md`, hairline border, shadow `0 8px 24px` at 0.16 ink, `space-2` below the chip, left-aligned and kept inside the viewport, no scrim, closes on outside click, Esc, or clicking the same chip; focus trapped and returned. Playback is unaffected while a picker is open; global keyboard shortcuts are not wired yet. The picker always reopens at its main view. No slide animation. Exact copy, no exclamation marks.

**Never:** No change to engine, scheduler, timeline, or grid layer drawing. No meter or click pickers, mute, markers or marker clearing. No `requestAnimationFrame`. No change to `normalize` or the `Settings` type.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Choose 8ths | open GRID, tap `8ths` | `settings.grid` = 2, chip reads `8ths`, sheet closes, grid shows quarters + eighths | N/A |
| Choose while playing | same, playing | grid redraws at once; audio and dot unaffected | N/A |
| Reselect current | tap `16ths` while on 16ths | sheet closes, no settings change | N/A |
| Dismiss | scrim tap / Esc / swipe-down | sheet closes, grid unchanged, focus on GRID chip | N/A |
| Invalid grid | `setGrid(5)` | ignored by `normalize` (unchanged) | N/A |
| Placeholder chips | tap METER or CLICK | nothing opens | N/A |
| Wide viewport | width 768+ | popover under chip instead of sheet | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/settings.svelte.ts` (+ `.test.ts`) -- add `setGrid(grid: Division)` → `commit({...current, grid})`; follow `setTempo`.
- `src/ui/App.svelte` -- replace `<div class="top-bar" aria-hidden>`; mount `TopBar`. Row is `var(--top-bar-height) + var(--space-2)`. Canvas label already uses `gridLabel`.
- `src/ui/TopBar.svelte` (new) -- three caption+chip pairs; owns which picker is open; passes settings.
- `src/ui/Picker.svelte` (new) -- generic container (sheet vs popover by `matchMedia('(min-width: 768px)')`), scrim, Esc, swipe-down, focus trap/return, `role=dialog`; takes `anchor` element and `onclose`, children via snippet. Reused by 2.7 and Epic 3.
- `src/ui/GridSheet.svelte` (new) -- title, radiogroup, divider, disabled clear row.
- `src/ui/chip-labels.ts` (+ test, new) -- pure `meterLabel(settings)`, `gridChipLabel(grid)`, `clickLabel()`.
- `src/ui/Stepper.svelte` -- style reference only. `src/ui/tokens.css` has all tokens (`--chip-caption-*`, `--chip-padding-x`, `--scrim`, `--radius-*`).
- `src/core/settings.ts` -- `Division` = 1|2|4|3; reference only.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/settings.svelte.ts`, `.test.ts` -- `setGrid`; test change, no-op reselect, listener firing
- [x] `src/ui/chip-labels.ts`, `chip-labels.test.ts` -- label helpers; test 4/4, 6/8, 12/8 and all four grid labels
- [x] `src/ui/Picker.svelte` -- sheet/popover container with scrim, Esc, swipe-down, focus trap and return
- [x] `src/ui/GridSheet.svelte` -- levels, divider, disabled clear row
- [x] `src/ui/TopBar.svelte`, `src/ui/App.svelte` -- chips, wiring, layout

**Acceptance Criteria:**
- Given the top bar, when it renders at 375px, then three 48px chips with captions fit in one row without scrolling and METER/CLICK open nothing.
- Given the Grid sheet, when I pick `Triplets`, then the grid shows triplet spokes at once, even while playing, and the sheet closes with focus on the chip.
- Given an open sheet, when I press Tab repeatedly, then focus stays inside; Esc, scrim tap and swipe-down close it.
- Given `npm run check`, `npm test`, `npm run lint`, `npm run build`, then all pass.

## Implementation Notes

Implemented directly (no subagent). `setGrid` in the store; `chip-labels.ts`; `Picker.svelte` (sheet below 768px, popover from 768px, chosen once at mount); `GridSheet.svelte`; `TopBar.svelte` replaces the placeholder in `App.svelte`. Check, tests (193), lint and build pass. Not tested automatically: Picker, GridSheet and TopBar behavior (no DOM runner, already logged for earlier stories); matrix rows other than `Reselect current` and `Invalid grid` are covered by manual check only.

## Spec Change Log

## Review Triage Log

Reviewed inline by the build agent (no subagents), covering blind, edge-case and verification-gap lenses.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Viewport crossing 768px while a picker is open keeps the mode chosen at mount | low | reject: mode is fixed per open; reopening picks the right one, and fixing needs reactive media handling |
| Picker, GridSheet, TopBar behavior has no automated test | medium | defer: no DOM runner (already logged for 2.1-2.5) |
| Anchor click while popover open: outside handler ignores anchor, chip click toggles closed | false | by design; verified in `Picker` outside handler |
| `Clear all markers` is a focusable `aria-disabled` button | false | intended: stays discoverable to screen readers, handler is absent |
| Swipe-down `touch-action: pan-x` blocks vertical scroll in a tall sheet | low | reject: Grid sheet is far shorter than 70dvh; revisit for the Click sheet in Epic 3 |

## Design Notes

`Picker` is generic on purpose: stories 2.7 and 3.x add Meter and Click content without touching behavior. Mute toggle and the `Every beat` label logic belong to later stories, so the CLICK label is a constant here.

## Verification

**Commands:**
- `npm run check && npm test && npm run lint && npm run build` -- expected: all pass

**Manual checks (if no CLI):**
- 375x667: chips fit; GRID opens bottom sheet; selecting `8ths` redraws spokes while playing. 1024 wide: popover under chip.
