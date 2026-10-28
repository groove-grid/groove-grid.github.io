---
title: 'Story 2.3: Tempo changes land on the beat'
type: 'feature'
created: '2026-10-28'
status: 'done'
route: 'dispatch'
baseline_commit: 'e0a5b5a9b50307ab332cc8a889fec567452e98c7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** While playing, `engine.apply` only stores settings, so a tempo change is never heard until the next Start, and the numeral cannot show that a change is waiting.

**Approach:** Add core `withSettings(timeline, settings, committedUntil)` that starts a new segment at the first beat boundary at or after `committedUntil`. The scheduler uses it in `apply` while playing and reports `pending`; the numeral turns `ink-secondary` while `pending.changed` includes `bpm`.

## Boundaries & Constraints

**Always:** A segment is "uncommitted" when its `startTime >= committedUntil`; `withSettings` drops those first (never the first segment), so at most one future segment exists and rapid changes collapse to the latest. The boundary is the first multiple of `PPQ` ticks (absolute) whose closed-form time is `>= committedUntil` (reuse `firstIndexAtOrAfter`), never earlier than the kept segment's `startTick`. If `beats` or `beatUnit` changed, the boundary moves to the first downbeat at or after that (bar-relative tick 0) and the new segment's `barOriginTick` becomes the boundary; otherwise `barOriginTick` is inherited. The new `startTime` is the old segment's `tickTime(boundary)`, stored once. A snapshot whose metric equals the kept last segment's adds no segment. If the boundary equals the kept segment's `startTick` (start-lead window), replace that segment's metric instead of adding one. `plan` state keeps `committedUntil` and swaps the timeline. `pending` is `null` while stopped or paused; while playing it is `{ changed, settings, atTime }` for the last segment if its `startTime` is after the audio clock `now()`, with `changed` the metric keys that differ from the segment playing now. The scheduler clears `pending` and notifies subscribers when `now() >= atTime`, on `stop` and on pause. `apply` while stopped takes effect immediately and `pending` stays `null`. Numeral is `ink-secondary` iff `pending.changed` includes `bpm`, else `ink`; its value always shows the store's latest tempo.

**Never:** No change to `plan`, `eventsBetween`, `positionAt`, `dotAngle` or the audio output. No meter, grid or click-beat UI (2.6, 2.7, Epic 3). No drag or tap tempo (2.4). No new constants outside `src/core/constants.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tempo change, playing | 80 → 120 mid-beat | clicks stay at 80 until the first beat boundary at or after `committedUntil`, then 120; no click skipped or doubled; dot position continuous | N/A |
| Rapid changes | 80 → 90 → 100 → 110 before the boundary | one future segment at 110; earlier ones dropped | N/A |
| Change back | 80 → 100 → 80 before the boundary | no future segment; `pending` null | N/A |
| Change in start lead | `apply` before beat 1 plays | first segment's metric replaced; no zero-length segment | N/A |
| Meter change (core only) | `beats` 4 → 3 | waits for the first downbeat at or after `committedUntil`; `barOriginTick` is the boundary | N/A |
| Stopped | change tempo, then Start | plays at the new tempo; `pending` null; numeral ink | N/A |
| Switch happens | `now() >= atTime` | `pending` null; subscribers notified once; numeral back to ink | N/A |
| Stop or pause | pending change, then Stop | `pending` null | N/A |

</frozen-after-approval>

## Code Map

- `src/core/timeline.ts` -- add `withSettings` and `changedMetricKeys(a, b)`; reuse `firstIndexAtOrAfter`, `tickTime`, `startTimeline`'s metric copy.
- `src/core/timeline.test.ts` -- new `withSettings` cases across segment boundaries (`eventsBetween` over the join: no duplicate, no gap, ticks monotone, `positionAt` continuous).
- `src/core/simulation.test.ts` -- optional: add a run with tempo changes through `plan`.
- `src/engine/scheduler.ts` -- `apply` (line ~139), `onWake`, `halt`/`pause`, `pending` getter (currently `null`); update `state.timeline` and `Live` while playing.
- `src/engine/scheduler.test.ts` -- `apply` while playing/stopped, rapid changes, `pending` lifecycle, no skipped/doubled clicks across the switch; `setup()` and `run()` already exist.
- `src/core/ports.ts` -- `Pending` and `EnginePort.pending` already defined; do not change.
- `src/ui/App.svelte` -- track `pending` from `engine.subscribe`; numeral color class.
- `src/ui/tokens.css` -- `--ink-secondary` already exists.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/timeline.ts`, `src/core/timeline.test.ts` -- `withSettings`, `changedMetricKeys`; tests for every matrix row except the UI ones
- [x] `src/engine/scheduler.ts`, `src/engine/scheduler.test.ts` -- playing `apply` via `withSettings`, `pending` getter and clearing, `Live` refresh, notifications
- [x] `src/ui/App.svelte` -- numeral `ink-secondary` while `pending.changed` has `bpm`
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- no new entry unless review finds one

**Acceptance Criteria:**
- Given playing at 80, when the tempo changes to 120, then the click times before the boundary are the 80 BPM closed form, from the boundary on the 120 closed form, with no skipped or doubled event.
- Given a pending tempo change, then the numeral is `ink-secondary`, and after the boundary it is `ink`.
- Given `npm run check`, `npm test`, `npm run lint`, `npm run build`, then all pass.

## Implementation Notes

- Implemented directly (no subagent). `withSettings` and `changedMetricKeys` live in `src/core/timeline.ts`; `startTimeline` now shares the private `metricOf`. Scheduler `apply` swaps the timeline and `Live` when playing and calls `refreshPending(now())`; `onWake` clears pending once `now() >= atTime`; `halt` clears it. `pending` is computed against the segment playing at `now()`, so a segment inside the lookahead still counts as pending until its start time. The numeral class is set from `engine.subscribe`. Audio-clock `now()` (not the latency-corrected clock) drives clearing, so the numeral can turn ink up to the output latency early. Not tested automatically: `App.svelte` wiring (no DOM runner, as in 2.1 and 2.2). Last task (deferred-work entry) needs none so far.

## Spec Change Log

## Review Triage Log

Reviewed inline by the build agent (no subagents; user chose option 2), covering blind, edge-case and verification-gap lenses.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Boundary tick equals a kept later segment's `startTick` (zero-length segment) | false | Kept non-first segments have `startTime < committedUntil`, so the boundary is strictly later; only the first segment can hit the replace branch, and it is tested |
| Float mismatch between boundary time and the old segment's last event | false | New `startTime` is `tickTime(last, tick)`, the same closed form `eventsBetween` uses; the join test checks exact times |
| Second change after a segment was committed but not yet audible builds two future segments | false | Intended by the "committed" rule; `pending` compares the final segment with the one playing at `now()`; covered by "keeps a segment that is already committed" |
| `refreshPending` notifies on every apply even when `pending` is unchanged | low | reject: harmless extra state write; fix adds a comparison |
| Numeral can turn ink up to the output latency before the audible switch | low | reject: `now()` is the raw context clock; imperceptible and the engine has no latency-corrected clock |
| `apply` refreshing `Live` is not observable in tests | low | reject: `Live` is unused until markers (Epic 4); trivial pass-through |
| `App.svelte` pending numeral wiring has no automated test | medium | defer: no DOM runner (already logged for 2.1 and 2.2) |
| Meter change through the scheduler (not core) untested | low | reject: only core exercises it until story 2.7; core cases cover it |

## Design Notes

The kept last segment `s` gives the boundary: `m = firstIndexAtOrAfter(s, PPQ, committedUntil)`, `tick = max(m * PPQ, ceil(s.startTick / PPQ) * PPQ)`. For a meter change, round `tick` up to the next `(tick - s.barOriginTick) % (beats * PPQ) === 0`. Because the new `startTime` is `tickTime(s, tick)`, the old segment's last event and the new segment's first agree at the join and the event at `tick` belongs to the new segment (decided in ticks).

## Verification

**Commands:**
- `npm run check && npm test && npm run lint && npm run build` -- expected: all pass

**Manual checks (if no CLI):**
- Dev server: Start, hold `+`; the numeral stays grey until the click tempo changes on a beat, then returns to ink; the dot never jumps.
