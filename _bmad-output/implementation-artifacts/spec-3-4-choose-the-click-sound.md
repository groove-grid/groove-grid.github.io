---
title: 'Story 3.4: Choose the click sound'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_commit: '8bb0aa2df3ba045f49db669bfcf1448679dbd1f0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A musician cannot pick a click that cuts through their instrument. `clickSound` exists in settings and the timeline, but no control sets it, only placeholder `beep` samples exist, and the scheduler reads the latest setting instead of the playing segment, so a change would not land on a beat.

**Approach:** The Click sheet gets a `Sounds ›` nav row with a live summary that opens a Sounds level in the same sheet with a `Click sound` segmented control (`Beep`, `Woodblock`, `Stick`, `Hi-hat`). Selecting while stopped previews accent then normal 300 ms apart on the never-muted preview bus. While playing there is no preview and the scheduler takes the sound from the segment each click falls in, so the change lands on the next beat. All eight samples come from the generator script, are loaded and precached, and `Beep` stays the default.

## Boundaries & Constraints

**Always:** Settings change only through a new store action `setClickSound`. Previews go through a new `EnginePort.preview(sound)` that calls `resume()` synchronously and plays only when `status === 'stopped'`. Preview gains match the click levels (accent 1, normal 0.7). The click sound for an event comes from `segmentAt(timeline, event.time).metric.clickSound`. Every sample is mono 16-bit, at most 120 ms, with its absolute peak in the first 8 samples. Beat 1 sounds higher than the normal variant for every sound. Esc on the Sounds level returns to the main view with focus on the Sounds row and does not close the sheet. The sheet always reopens at the main view.

**Decisions:** All eight samples are synthesized by `scripts/make-click-samples.ts`, not recorded. The Sounds level holds only `Click sound`; the `Marker sound` control comes with Story 4.4, and the summary still reads `Beep · markers off`.

**Never:** No new runtime dependency. No change to the core event union or planner. No slide animation. No marker sound behavior (Epic 4). No network fetch at click time. Previews are not announced.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Preview while stopped | stopped, select `Stick` | accent at t, normal at t+0.3 on `preview` bus; setting saved | bank not ready: preview waits for it; failure swallowed |
| Preview while muted | stopped, muted | preview still plays | N/A |
| Change while playing | playing, select `Hi-hat` | no preview; clicks before the next beat boundary keep the old sound, from it on the new | rapid changes collapse to the latest |
| Paused by system | `paused-by-system`, select a sound | no preview; setting saved | N/A |

</frozen-after-approval>

## Code Map

- `scripts/make-click-samples.ts` -- WAV writer for `beep`; extend to all four sounds, export a pure `renderClickSample(id, variant): Int16Array` so tests run without writing files.
- `public/sounds/` -- regenerate all eight `click-<id>-{accent,normal}.wav`.
- `src/engine/sample-bank.ts` -- `BANK_IDS` holds only beep; derive it from `CLICK_SOUND_IDS`. Keep `sampleUrl` as the one URL builder.
- `vite.config.ts` -- `globPatterns` already include `wav`; no change.
- `src/core/ports.ts` -- add `preview(sound: ClickSoundId): void` to `EnginePort`.
- `src/engine/scheduler.ts` -- `onWake` uses `settings.clickSound`; use the event's segment. Add `preview`. Reuse `resumeWithTimeout`, `LEVEL_GAIN`, `clickSampleId`.
- `src/core/timeline.ts` -- reuse `segmentAt`; do not change.
- `src/ui/settings.svelte.ts` -- add `setClickSound`.
- `src/ui/chip-labels.ts` -- add sound labels and `soundsSummary(clickSound, markerSound)`; extend `clickChipName` to `Click, Beep, 1 & 3, between beats none` (comma, like the other chips).
- `src/ui/ClickSheet.svelte` -- add the nav row and Sounds level, local `level` state.
- `src/ui/SegmentedControl.svelte` -- drop all labels to caption size when any label overflows (DESIGN.md), for `Woodblock`.
- `src/ui/Picker.svelte` -- Esc closes the sheet; let the content handle Esc first (for example `event.defaultPrevented`).
- `src/ui/TopBar.svelte`, `src/ui/App.svelte` -- pass `engine.preview` down to `ClickSheet`.
- `src/engine/fakes.ts`, `src/engine/scheduler.test.ts`, `src/engine/sample-bank.test.ts`, `src/ui/*.test.ts` -- existing fakes and tests to extend.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/make-click-samples.ts` -- synthesize four distinct sounds with an accent and a normal variant, write all eight files -- AD-11 assets
- [x] `scripts/make-click-samples.test.ts` -- per sample: mono, length, peak in the first 8 samples, accent pitch higher than normal; sounds differ from each other; committed files equal the generator output -- distinctness and sync
- [x] `src/engine/sample-bank.ts` (+ test) -- bank ids from `CLICK_SOUND_IDS` -- load all eight
- [x] `src/core/ports.ts`, `src/engine/scheduler.ts` (+ test) -- segment sound per event; `preview` -- next-beat takeover and preview rules
- [x] `src/ui/settings.svelte.ts`, `src/ui/chip-labels.ts` (+ tests) -- action, labels, summary, chip name
- [x] `src/ui/SegmentedControl.svelte`, `src/ui/Picker.svelte`, `src/ui/ClickSheet.svelte`, `src/ui/TopBar.svelte`, `src/ui/App.svelte` -- Sounds level, overflow caption size, Esc handling, preview wiring

**Acceptance Criteria:**
- Given the Click sheet, when I tap `Sounds ›`, then the Sounds level replaces the main view, focus is on `Back to Click`, and back or Esc returns to the main view with focus on the Sounds row.
- Given any sound, when a click plays, then beat 1 is higher in pitch than the other beats.
- Given the default settings, when the app starts, then the sound is `Beep`.

## Implementation Notes

Samples are sums of decaying cosines (all peak at sample 0), with fixed-seed high-passed noise for stick and hi-hat; the accent multiplies every partial by 1.5. Beep is byte-identical to the old placeholders. `preview` acts only while `stopped` and not `starting`; only the latest pending preview plays once the bank and resume settle, and one still waiting when Start begins is dropped. Esc on the Sounds level is handled in `ClickSheet` with `preventDefault`, and `Picker` skips a prevented Esc. `SegmentedControl` measures overflow at label size with a ResizeObserver and after fonts load. Sounds row name follows EXPERIENCE.md: `Sounds: Beep, markers off`. Known limits: quick previews after load can overlap; after a system pause then Stop, a preview resumes the old context and stays silent until the next Start rebuilds it. Check (0 errors), 275 tests and lint pass; generator rerun leaves files unchanged. Not checked by ear or in a browser.

## Spec Change Log

## Review Triage Log

Three layers (Blind Hunter, Edge Case Hunter, Verification Gap), same model level.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Esc on Sounds closes the sheet when focus is on the panel or body (3 reviewers) | medium | patch: panel has `tabindex="-1"`, so a tap on plain sheet content focuses it, outside the wrapper div; handled in window capture phase now |
| Entering the Sounds level is not announced | medium | patch: dialog stays named `Click`, focus lands on `Back to Click`; level wrapped in a labelled group |
| Quick selections overlap previews | medium | patch: arrow keys select as they move; `previewGeneration` only drops waiting previews; preview now cancels earlier preview nodes |
| Start within 300 ms of a preview plays its normal note over the first clicks | low | patch: `start` cancels preview nodes and pending previews |
| Preview after a system pause then Stop stays silent | medium | patch: `needsRebuild` stays true after Stop; preview now rebuilds like `start` |
| Committed-file test needs bit-exact float math | low | patch: samples compared with a ±1 tolerance, header exact |
| Sounds level, Esc, focus, label fit and preview wiring have no automated test | medium | defer: no DOM runner in the repo; manual phone check required |
| Sprint status says in-progress while the spec says in-review | false | the sprint file is synced when the story is presented |
| Preview's first note scheduled at `now()` plays late or cut | low | reject: a past start time plays the buffer from sample 0 at once; a few ms late is inaudible in a preview |
| One missing sample blocks every sound | low | reject: all eight files ship and are precached together, the same all-or-nothing as before with two; per-file tolerance adds branches |
| Hi-hat accent differs too little because the noise is not shifted | low | reject: partial amplitudes sum to about 4.5 against 0.6 noise, so the 1.5x partial shift dominates; confirm by ear in the manual check |
| Label fit: no ellipsis at caption size, ResizeObserver re-trigger, class set outside Svelte | low | reject: `Woodblock` is expected to fit at caption size; the re-trigger settles in one pass; the class attribute is static, so Svelte never rewrites it |
| `?? settings.clickSound` fallback hides a missing segment | false | `segmentAt` returns the first segment before the start, so it is never undefined while playing |
| Segment found by float time can pick the neighbour at a boundary | false | a boundary click is computed from the new segment with `tickTime(next, next.startTick)`, which equals `next.startTime` exactly, and `segmentAt` uses `<=` |
| `BANK_IDS` lost its literal types | low | reject: no caller relies on them; adding template-literal types is more than a direct fix |
| `ResizeObserver` missing in old WebViews | low | reject: available in every supported browser; the app already needs newer APIs |

## Verification

**Commands:**
- `npm run check && npm test && npm run lint` -- expected: all pass
- `node scripts/make-click-samples.ts && git status --short public/sounds` -- expected: rerun leaves files unchanged

**Manual checks (if no CLI):**
- On a phone: listen to all four sounds while stopped and while playing; check `Woodblock` fits at 375px and the Esc and back behavior.
