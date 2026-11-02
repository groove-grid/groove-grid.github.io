---
title: 'Story 3.2: Between-beats click'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A musician who keeps only some beats (2 & 4, beat 1 only) cannot hear subdivisions, because nothing in the UI sets `betweenBeats`, though the settings, planner and gains already support it.

**Approach:** Below the beat toggles the Click sheet gets a `Between beats` section header and a `segmented-control` (`None` / `8ths` / `16ths` / `Triplets`, a `radiogroup` named `Between beats`; DESIGN.md: 48px pill split into equal segments, 1.5px ink outline, selected segment ink fill with `surface-raised` label). A new store action `setBetweenBeats(division)` commits through `normalize`, the sheet stays open, and the choice is independent of `grid`. The chip's visible label does not change; its accessible name becomes `Click, {label}, between beats {none|8ths|16ths|triplets}`. Clicks sound only inside enabled beats, use the normal sample at a softer gain, loudness order beat 1 > other beats > between beats, divisions are relative to the beat in /4 and /8, a change while playing applies on the next beat without cancelling scheduled nodes, and the default is `None`. No change to planner, engine or `normalize` is expected: add tests that pin these behaviours for each division and for disabled beats. The sound name in the accessible name and the `Sounds ›` row belong to story 3.4.

</frozen-after-approval>

## Implementation Notes

Investigation confirmed the planner, `normalize`, gains (1 / 0.7 / 0.45) and `clickSampleId` already behave as required, so core and engine are unchanged and only gained tests. New `SegmentedControl.svelte` follows DESIGN.md (`Beat unit` in the Meter sheet does not, deferred); it is generic because story 3.4 needs it twice more. Decision: arrow keys and a roving tabindex are included because EXPERIENCE.md asks for them and this is a new control; arrows select as they move, like native radios. `betweenBeatsLabel` and `clickChipName` are in `chip-labels.ts`. `Picker.svelte` changed: its focus trap counted roving segments. Check, tests, lint and build pass. No visual check: no headless browser on this machine; sheet interaction has no DOM test.

## Review Triage Log

Blind Hunter review (one subagent, same model level). Edge-case and other layers are not configured for oneshot.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Focus trap counts `tabindex="-1"` radios, so Tab escapes the dialog from `None` | high | patch: confirmed in `Picker.svelte` `FOCUSABLE`; buttons with tabindex -1 excluded |
| Arrow handler swallows Alt/Cmd/Ctrl+Arrow | low | patch: early return on those modifiers (Shift left in: harmless, simple) |
| /8 test could pass on two wrong outputs, and covers one division | medium | patch: asserts ticks for all three divisions |
| All beats off with a division not pinned | low | patch: test added |
| Accent followed by subs not pinned | false | existing test `places between-beat clicks only inside enabled beats` covers it |
| Switching back to None or across divisions not pinned | low | patch: planner test added |
| `setGrid`/`setMeter` keep `betweenBeats`, chip name for 8ths/16ths untested | low | patch: tests added |
| No overflow rule in `SegmentedControl` | medium | defer: logged for 3.4, current labels fit |
| `MeterSheet` keeps its own segmented control | medium | defer: logged |
| No tests of the control's interaction logic | medium | defer: logged with the existing no-DOM-runner gap |
| `deferred-work.md` entry and `Click:` separator out of date | low | defer: new entry logged, old entries are not edited |
| Selected segment relies on background only in forced-colors | low | defer: logged for 5.5 |
| No feedback when choosing a division with `No beats` | low | reject: correct by spec, the user chose silent all-off bars, and the fix needs new copy |
| Division order duplicated in four places | low | reject: rarely hit, and sharing it means a new export across core and two sheets |
| Selected-and-pressed state only works through source order | false | same specificity, `.segment.selected` comes last and stays ink, as intended |
