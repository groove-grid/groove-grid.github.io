---
title: 'Story 2.7: Any meter'
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

**Problem:** The METER chip is an inert placeholder, so a musician cannot set the time signature.

**Approach:** The METER chip opens a Meter picker (reusing `Picker`) with presets `2/4 3/4 4/4 5/4 6/8 7/8 12/8` (max 4 per row, 48px pills, selected = ink fill) and an `Other` section: a beats stepper (1–16) and a `Beat unit` 4/8 segmented control. A new store action `setMeter(beats, beatUnit)` sets both together; `clickBeats` follows `beats` by carry-over (kept toggles stay; new beats on only if every previous beat was on). The preset matching the current meter is highlighted, none if no match. Preset tap applies and closes; stepper and unit edits apply live and keep the sheet open. Stopped: the circle redraws at once; playing: the engine already defers meter changes to the next downbeat. Dialog title `Meter`; the chip keeps label `{beats}/{beatUnit}`. Exact copy, no exclamation marks; BPM counts the beat unit and the accent stays on beat 1 (engine unchanged). No change to engine, timeline, `normalize` or grid drawing.

</frozen-after-approval>

## Implementation Notes

Implemented `setMeter` (with exported `carryOverClickBeats`) in the store, `METER_PRESETS` in `chip-labels.ts`, new `MeterSheet.svelte` (presets, beats stepper reusing `Stepper`, beat unit segmented control) mounted from `TopBar.svelte` via `Picker`. `normalize` untouched: the carry-over rule lives in the store action because `normalize` fills new beats with `true`. Check, tests (196), lint and build pass. Sheet interaction is not covered by automated tests (no DOM runner, already deferred).

## Review Triage Log

Reviewed inline by the build agent (no subagents).

| Finding | Verdict | Route / evidence |
|---|---|---|
| Stepper that becomes disabled at 1 or 16 while focused drops focus out of the focus trap | low | reject: Tab/Esc still work via the panel; negligible |
| Meter sheet interactions have no automated test | medium | defer: no DOM runner, logged for 2.6 |
