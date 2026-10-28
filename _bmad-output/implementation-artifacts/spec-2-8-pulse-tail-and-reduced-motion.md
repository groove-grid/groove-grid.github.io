---
title: 'Story 2.8: Pulse, tail and reduced motion'
type: 'feature'
created: '2026-10-28'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** While playing, nothing marks beat 1 in peripheral vision, and the dot has no comet tail, so the bar start is easy to miss without staring at the circle.

**Approach:** The render loop becomes the only writer of the CSS variable `--pulse` on the root element; the page background uses `var(--pulse, var(--surface))`. While playing, each frame finds the most recent downbeat at or before `now` (pure core helper over the timeline, honoring segment `barOriginTick`, tested) and sets `--pulse` to `surface-pulse` at the downbeat, decaying to `surface` over 180 ms ease-out (`PULSE_DECAY_MS` in `src/core/constants.ts`); the pulse color is an interpolation between the two tokens, so it never goes below the token's luminance 0.826. Stopped (no timeline or before beat 1): `--pulse` is `surface`, and it fires whether muted or not (derived from the timeline, not from clicks or engine callbacks). A new `comet-tail` layer, drawn just before the dot, renders a 30° arc on the ring trailing the dot, ink, opacity 0.45 to 0 and width 18 px to 2 px, constant angle at every tempo, clamped to the arc travelled since playback started, hidden when stopped. `prefers-reduced-motion: reduce` is read in render via `matchMedia` (live changes followed), passed in `Frame`, and turns the tail and pulse off while the dot keeps sweeping. No change to engine, scheduler, timeline semantics, settings or UI controls.

</frozen-after-approval>

## Implementation Notes

Core: `lastDownbeatTime` in `timeline.ts` (walks back to the owning segment, so a mid-bar tempo change still finds the bar start), `pulse.ts` (`pulseLevel`, cubic ease-out), `PULSE_DECAY_MS` and `TAIL_ARC_DEG` in constants. Render: `color.ts` (hex parse, blend, alpha), `layers/tail.ts` (filled tapered band with a conic-gradient fade; a first-bar tail is the full tail cut short), `loop.ts` reads `prefers-reduced-motion` each frame into `Frame.reducedMotion`, writes `--pulse` only when its value changes, and removes it on dispose. `App.svelte` body background is `var(--pulse, var(--surface))`. Check, tests (206), lint and build pass. Tail drawing and the CSS pulse are not covered by automated tests (no DOM/canvas runner, already deferred); the timing they derive from is.

## Review Triage Log

Reviewed inline by the build agent (no subagents), blind and edge-case lenses.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Tail layer created two closures per frame, against the `Frame` no-allocation note | low | patch: hoisted to module scope |
| Dot halo stays `surface` while the background is mid-pulse, a 2px slightly lighter ring for under 180 ms | low | reject: DESIGN specifies a `surface` halo; barely visible |
| `lastDownbeatTime` float error at an exact downbeat could step back one bar | false | 1e-6 tick epsilon plus `min(…, t)` clamp; covered by the exact-downbeat tests |
| Pulse blend could dip below luminance 0.80 | false | every channel of `surface-pulse` is below `surface`, so the blend is monotone between 0.826 and 0.898 |
| Tail and pulse rendering have no automated test | medium | defer: no DOM/canvas runner (already logged) |

