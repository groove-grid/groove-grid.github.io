---
title: 'Story 2.4: Drag and tap tempo'
type: 'feature'
created: '2026-10-28'
status: 'done'
route: 'dispatch'
baseline_commit: '8a69477adcfbc90f538d80b83ab8255349f51f75'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tempo can only change one BPM at a time with the steppers, so big jumps are slow and there is no way to match a record by ear.

**Approach:** Add vertical drag on the tempo numeral and a `Tap` pill beside Start/Stop. Both only call `settingsStore.setTempo`, so the story 2.3 next-beat rule and pending numeral color apply unchanged.

## Boundaries & Constraints

**Always:** The numeral's hit area is the full tempo-row height, between the steppers; it uses `touch-action: none` and pointer capture. Drag is measured from pointer-down: nothing happens until vertical travel reaches 8 px; from then on `bpm = startBpm + sign * (floor((|dy| - 8) / 6) + 1)`, dragging up raises tempo. Result is clamped to 30–250 by `normalize`; reversing back inside the threshold returns to `startBpm`. The numeral updates live on each pointer move. Tap tempo averages the last 4 intervals (at most 5 taps), rounds to an integer and clamps to 30–250. The first tap, or the first tap after a gap over 2000 ms, starts a fresh sequence and changes nothing; the second tap sets tempo from one interval. Tap never calls `engine.start` and works while stopped or playing. `Tap` is a 56px pill, min 88px wide, left of Start/Stop in the transport row, same border style as steppers (1.5px ink border, surface-raised fill, pressed surface-pressed), label "Tap". New constants live only in `src/core/constants.ts` (drag threshold, px per BPM, tap window, tap reset ms, tap max intervals).

**Never:** No change to the engine, scheduler, timeline or settings store API. No keyboard or wheel handling on the numeral (steppers cover it). No tap-tempo visual feedback or coaching copy. No Start/Stop restyling.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Below threshold | drag 7 px up | tempo unchanged | N/A |
| Drag up | 80, drag 8 / 14 / 26 px up | 81 / 82 / 84 | N/A |
| Drag down at limit | 32, drag 100 px down | clamps to 30 | N/A |
| Drag reversal | up 30 px then back to 3 px | returns to start value | N/A |
| Drag while playing | drag mid-bar | numeral shows pending color; click tempo follows next beat | N/A |
| One tap | single tap | tempo unchanged | N/A |
| Two taps | 500 ms apart at 80 BPM | tempo 120 | N/A |
| Six taps | 500 ms, then 400 ms intervals | uses only the last 4 intervals | N/A |
| Pause | tap, wait 2.5 s, tap | second tap starts a new sequence; tempo unchanged | N/A |
| Extreme | two taps 100 ms apart / 2000 ms apart | 250 (clamped from 600) / 30 (a gap of exactly 2000 ms does not reset) | N/A |
| Pointer cancel | `pointercancel` mid-drag | drag ends; keeps current value | N/A |

</frozen-after-approval>

## Code Map

- `src/core/constants.ts` -- add `DRAG_THRESHOLD_PX = 8`, `DRAG_PX_PER_BPM = 6`, `TAP_MAX_INTERVALS = 4`, `TAP_RESET_MS = 2000`; keep `BPM_MIN/MAX`.
- `src/core/tap-tempo.ts` (+ `.test.ts`) -- pure `createTapTempo(now?)` returning `tap(timeMs): number | null`, `reset()`; no DOM.
- `src/ui/drag-tempo.ts` (+ `.test.ts`) -- pure `dragTempo(startBpm, dy): number` plus a small controller turning pointer events into `setTempo` calls.
- `src/ui/settings.svelte.ts` -- `setTempo` already exists and rounds via `normalize`; do not change.
- `src/ui/App.svelte` -- tempo row (`.tempo-value`, line ~75): pointer handlers, `touch-action: none`, full-height hit area; transport row (line ~86): add Tap pill; adjust `button` style so Start/Stop keeps `flex: 1`. `bpmPending` already drives numeral color.
- `src/ui/Stepper.svelte` -- reference for the 1.5px border/pressed styling; do not change.
- `src/ui/hold-repeat.ts` -- pattern for injectable timers in tests.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/constants.ts` -- add the five constants
- [x] `src/core/tap-tempo.ts`, `src/core/tap-tempo.test.ts` -- tap averaging, reset, clamp; tests for each tap matrix row
- [x] `src/ui/drag-tempo.ts`, `src/ui/drag-tempo.test.ts` -- `dragTempo` and pointer controller; tests for each drag matrix row
- [x] `src/ui/App.svelte` -- wire drag on the tempo value area, add Tap pill to the transport row
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- no new entry unless review finds one (none: the DOM-runner gap is already logged)

**Acceptance Criteria:**
- Given the tempo row, when I drag on the numeral anywhere in the row's height, then the page does not scroll and the numeral updates live.
- Given playing, when I drag or tap, then playback continues, the click tempo changes on the next beat, and the numeral is `ink-secondary` until then.
- Given stopped, when I tap twice, then the transport stays stopped.
- Given `npm run check`, `npm test`, `npm run lint`, `npm run build`, then all pass.

## Implementation Notes

- Implemented directly (no subagent). `createTapTempo` in `src/core/tap-tempo.ts`, `dragTempo`/`createDragTempo` in `src/ui/drag-tempo.ts`; `App.svelte` wires pointer capture on `.tempo-value` (stretched to row height) and the Tap pill. Tap time is `event.timeStamp`. Not tested automatically: `App.svelte` wiring (no DOM runner, as in earlier stories). Check, tests (172), lint and build pass.

## Spec Change Log

## Review Triage Log

Reviewed inline by the build agent (no subagents), covering blind, edge-case and verification-gap lenses.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Stretching `.tempo-value` to full row height moved the numeral to the top of the row (flex baseline alignment) | medium | patch: applied; inner `.readout` wrapper with `place-content: center` |
| Tap pill label/size/border vs UX-DR11 | false | 56px height, min 88px, 1.5px ink border, pressed fill all present |
| Tap `click` timestamp is delayed on touch | low | reject: `touch-action: manipulation` removes the 300 ms delay; fix would need pointerdown handling plus keyboard fallback |
| Drag and Tap share no state, so tap after drag is unaffected | false | both only call `setTempo`; tap sequence is independent by design |
| Drag during playback skips pending handling | false | goes through `setTempo` and the 2.3 subscription; numeral pending color is driven by `engine.pending` |
| Non-primary pointer or multi-touch drag | low | reject: `button !== 0` is ignored; capture keeps one pointer; a second pointer cannot start a drag because capture is held |
| `App.svelte` drag/tap wiring has no automated test | medium | defer: no DOM runner (already logged for 2.1-2.3) |
| Tap while paused/interrupted | false | tap only changes settings; no engine call |

## Design Notes

Tap time uses `event.timeStamp` (monotonic, same clock as `performance.now()`), not the audio clock, so tapping works before the audio context exists. The tap timing is a deliberate human-time measure and is unrelated to engine scheduling.

## Verification

**Commands:**
- `npm run check && npm test && npm run lint && npm run build` -- expected: all pass

**Manual checks (if no CLI):**
- Dev server on a phone or touch emulation: drag the numeral up/down, the page stays still; tap along to a song and the numeral settles near its tempo; Tap never starts the click.
