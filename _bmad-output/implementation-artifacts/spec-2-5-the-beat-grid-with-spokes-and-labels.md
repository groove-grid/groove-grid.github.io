---
title: 'Story 2.5: The beat grid with spokes and labels'
type: 'feature'
created: '2026-10-28'
status: 'done'
route: 'dispatch'
baseline_commit: 'cb7d4d889d8b4a0b499a64cb33258c934b845d03'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The grid circle is a bare ring, so a musician cannot find a position in the bar.

**Approach:** Draw subdivision spokes with a clear hierarchy and beat numbers outside the ring, cached offscreen per meter and grid level. Add core `snap` and `tickLabel`, and label the canvas for assistive tech from `tickLabel`.

## Boundaries & Constraints

**Always:** Beat 1 at 12 o'clock, clockwise; spokes run inward from the ring. Spoke specs (width / length as % of ring radius / color): quarter 3px / 18% / `ink`; eighth 2px / 11% / `grid-eighth`; sixteenth 1.5px / 6% / `grid-sixteenth`; triplet 1.5px / 8% / `grid-sixteenth`. Levels relative to the beat (8ths = beat/2, 16ths = beat/4, triplets = beat/3); hidden levels are not drawn: `Beats` draws quarters only, `8ths` quarters + eighths, `16ths` quarters + eighths + sixteenths, `Triplets` quarters + triplets. Beat numbers 1..beats sit just outside the ring in `beat-label` style (15/600, tabular), `ink-secondary`. The ring radius shrinks to leave room for labels (about 31px inset, per the key-practice mockup). The grid layer renders from the meter of the segment playing now (settings meter when stopped) and the current `settings.grid`, is cached offscreen, and rebuilds only when size, DPR, beats, grid or theme colors change. Core `snap(barFraction, settings) → tick` returns the nearest line of the finest visible level, wrapping to 0 at 12 o'clock; core `tickLabel(tick, settings)` returns: beat → `N`, 8th → `and of N`, 16ths → `e of N` / `a of N`, triplets → `trip of N` / `let of N`. The canvas becomes `role="img"` with an `aria-label` like `Grid: 4/4, 16ths, no markers` (with markers: `Grid: 4/4, 16ths, 3 markers: 1, and of 2, a of 3`; one marker is `1 marker: ...`), updated on change. Default grid stays `16ths`.

**Never:** No change to the engine, scheduler, timeline segment shape or settings store API. No marker, glow, pulse or comet-tail drawing. No grid chip, sheet or meter picker (stories 2.6, 2.7). No `e & a` syllables on the canvas. No `requestAnimationFrame` outside `src/render/loop.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 4/4 at 16ths | beats 4, grid 4 | 4 quarter, 4 eighth, 8 sixteenth spokes; labels 1-4 | N/A |
| 3/4 at Beats | beats 3, grid 1 | 3 quarter spokes only; labels 1-3 | N/A |
| 7/8 at Triplets | beats 7, beatUnit 8, grid 3 | 7 quarter + 14 triplet spokes; labels 1-7 | N/A |
| 16 beats | beats 16, grid 4 | 16 labels, 64 spokes, no overlap clipping the canvas | N/A |
| Snap near end | fraction 0.999 in 4/4 at 16ths | tick 0 (wraps) | N/A |
| Snap midway | fraction 0.125 in 4/4 at 16ths | tick 480 | N/A |
| Snap at beats | fraction 0.6 in 4/4 at Beats | tick 1920 (beat 3) | N/A |
| Labels | ticks 1200 / 1440 / 1680 (beat 2 plus 240 / 480 / 720) | `e of 2` / `and of 2` / `a of 2` | tick not on a named position → `N` plus offset, never throws |
| Meter change while playing | next segment has other beats | grid redraws when that segment starts playing | N/A |

</frozen-after-approval>

## Code Map

- `src/core/grid.ts` (+ `.test.ts`) -- new: `snap`, `tickLabel`, `gridLabel(settings)`, `spokeLevel(tick, grid)` → `'quarter' | 'eighth' | 'sixteenth' | 'triplet'`. Pure; imports `PPQ`, `Settings`.
- `src/core/timeline.ts` -- add exported `segmentAt(timeline, now)`; reuse in `src/core/dot-angle.ts` (same loop is inlined there).
- `src/render/geometry.ts` (+ `.test.ts`) -- `ringRadius` inset change; add spoke specs and `labelRadius`; keep `pointOnRing`.
- `src/render/layers/types.ts` -- extend `Theme` (inkSecondary, gridEighth, gridSixteenth, font) and `Frame` (`beats`, `grid`).
- `src/render/layers/grid.ts` -- draw spokes, ring and labels into the cache; key on size/DPR/beats/grid/theme.
- `src/render/loop.ts` -- `mount(canvas, clock, onFrame?, view?)` where `view: () => { beats; grid }` supplies settings; beats come from `segmentAt(timeline, now).metric.beats` when a timeline exists. Reads the new tokens in `readTheme`.
- `src/ui/App.svelte` -- pass `view`; canvas `role="img"` + `aria-label={gridLabel(settingsStore.current)}` (drop `aria-hidden`).
- `src/ui/tokens.css`, `src/core/settings.ts` -- reference only (`--grid-eighth`, `--grid-sixteenth`, `--ink-secondary`, `--font`; `Division`, `Settings`).

## Tasks & Acceptance

**Execution:**
- [x] `src/core/grid.ts`, `src/core/grid.test.ts` -- snap, tickLabel, gridLabel, spokeLevel; tests for 3/4, 4/4, 7/8 and 16 beats, every matrix row
- [x] `src/core/timeline.ts`, `src/core/dot-angle.ts` -- extract `segmentAt`, keep dot behavior (existing tests pass)
- [x] `src/render/geometry.ts`, `src/render/geometry.test.ts` -- new radius, spoke specs, label radius; test spoke percentages and that labels stay inside the canvas
- [x] `src/render/layers/types.ts`, `grid.ts`, `src/render/loop.ts` -- spokes, labels, cache invalidation, view wiring
- [x] `src/ui/App.svelte` -- view callback and canvas ARIA

**Acceptance Criteria:**
- Given 4/4 at 16ths, when the grid draws, then quarter, eighth and sixteenth spokes use the specified width, length and color, and hidden levels are absent.
- Given an unchanged meter and grid, when frames draw, then the offscreen cache is reused (rebuilt only on size, DPR, beats, grid or theme change).
- Given a screen reader, when the canvas is read, then it is an image named `Grid: 4/4, 16ths, no markers`.
- Given `npm run check`, `npm test`, `npm run lint`, `npm run build`, then all pass.

## Implementation Notes

- Implemented directly (no subagent). New `src/core/grid.ts`; `segmentAt` in `timeline.ts`; spokes, labels and cache key in `render/layers/grid.ts`; `mount` takes a `view` callback (`settingsStore.current`). Matrix row "Snap at beats" said tick 2880 for beat 3; beat 3 is tick 1920 (0.6 of 4 beats rounds to beat 3), so the number was corrected, not the code. Not tested automatically: canvas drawing, cache reuse and `App.svelte` wiring (no DOM runner). Check, tests (189), lint and build pass.

## Spec Change Log

## Review Triage Log

Reviewed inline by the build agent (no subagents), covering blind, edge-case and verification-gap lenses.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Matrix row `Snap at beats` said tick 2880 for beat 3 | low | patch: applied; beat 3 starts at tick 1920 and 0.6 of 4 beats rounds to it, so the typo was fixed in the row |
| Dot and beat labels could collide | false | label centre is 17px outside the ring, dot reaches 11px; a geometry test keeps both inside the canvas |
| Theme colors are read once at mount, so token changes need a reload | low | reject: light theme only, no runtime theme switch; cache key still includes colors |
| Grid level read from settings, beats from the playing segment, so a pending meter change redraws only when the new segment starts | false | intended by the matrix row `Meter change while playing` |
| Canvas drawing, cache reuse and `App.svelte` wiring have no automated test | medium | defer: no DOM runner (already logged for 2.1-2.4) |
| `tickLabel` off-name fallback `N + ticks` is unreachable for normal markers | low | reject: marker ticks are validated to grid steps; fallback only prevents a throw |

## Design Notes

Triplet names (`trip`, `let`) are a build-time choice; the UX docs only fix the 8th and 16th names. Markers always sit on grid steps, so the off-name fallback is unreachable in normal use. `segmentAt` has one definition so the dot and the grid never disagree about which segment is playing. The grid level lives in settings (not the timeline), so `mount` takes a small `view` callback instead of widening `ClockReader`.

## Verification

**Commands:**
- `npm run check && npm test && npm run lint && npm run build` -- expected: all pass

**Manual checks (if no CLI):**
- Dev server on a 375x667 viewport: 4/4 at 16ths shows 16 spokes with three weights and labels 1-4 outside the ring; the dot still sweeps in sync and does not clip labels.
