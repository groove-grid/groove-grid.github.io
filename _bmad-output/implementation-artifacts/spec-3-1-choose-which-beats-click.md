---
title: 'Story 3.1: Choose which beats click'
type: 'feature'
created: '2026-10-28'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The CLICK chip is an inert placeholder that always reads `Every beat`, so a musician cannot train with fewer clicks (2 & 4, beat 1 only).

**Approach:** The CLICK chip opens a Click sheet (reusing `Picker`, dialog title `Click`) whose main view has a `Click on beats` section header with an `All` text action (borderless, 48×48 target, `aria-label` `Click on all beats`, disabled in `ink-disabled` when every beat is on) and one 44px round `beat-toggle` per beat of the current meter (numerals `1`…`n` in beat-label type, 1.5px ink outline, on = ink fill with `surface-raised` numeral, off = `surface-raised` fill with ink numeral, `{spacing.1}` gap, at most 7 per row, rows balanced with the extra toggle in the top row, left-aligned: 8–14 beats two rows, 15–16 three). Toggles are `aria-pressed` buttons named `Click on beat n`. A new store action `toggleClickBeat(index)` flips one beat and `setAllClickBeats()` turns all on; when only one beat is on, that toggle is `aria-disabled` (ink fill at 0.6 opacity, not operable, toggling it is a no-op) and the caption `Use Mute for silence.` shows below the row and is its accessible description. The sheet stays open on toggles. `clickLabel(clickBeats)` replaces the placeholder: all on → `Every beat`; only beat 1 → `Beat 1 only`; one other beat → `Beat n only`; two or three on → the list (`2 & 4`, `1, 2 & 4`); otherwise `n of m beats`. The chip shows it and its accessible name is `Click, {label}`. Audio needs no core change: the timeline already emits clicks only for enabled beats, uses the accent only when beat 1 is on, and applies a `clickBeats` change from the next beat without cancelling scheduled nodes (AD-6, AD-7); add tests that pin these three behaviours. No change to engine, scheduler, `normalize`, grid drawing or the Between beats / Sounds parts of the sheet (stories 3.2, 3.4).

</frozen-after-approval>

## Implementation Notes

Store: `toggleClickBeat(index)` (ignores non-integer or out-of-range indices, refuses to turn off the last enabled beat) and `setAllClickBeats()` in `settings.svelte.ts`. `chip-labels.ts`: `clickLabel(clickBeats)` replaces the placeholder (all on wins over the list rule, so `2/4` with both on reads `Every beat`), and `beatToggleRows(beats)` does the balanced 7-per-row wrap. New `ClickSheet.svelte` (header, `All`, toggle rows, caption) is mounted from `TopBar.svelte` through `Picker`, using the same chip/open/focus pattern as Meter and Grid. The last-on toggle uses `aria-disabled` rather than `disabled` so it stays focusable and can announce its `aria-describedby` caption. Core and engine unchanged: a new scheduler test pins that a `clickBeats` change while playing is pending until the next beat, keeps already-scheduled clicks (`cancelAll` never called), plays only enabled beats afterwards, and uses only the normal sample when beat 1 is off. Accessible name stays `Click, {label}` like the other chips; the longer name with sound and between beats (epic context) belongs to 3.2/3.4. Check, tests (214), lint and build pass. No visual check: no headless browser on this machine; sheet interaction has no DOM test (no DOM runner, already deferred).

## Review Triage Log

Blind Hunter review (one subagent, same model level). Edge-case and other layers are not configured for oneshot.

| Finding | Verdict | Route / evidence |
|---|---|---|
| 7 toggles (332px) overflow the popover content box (326px) and phones under 375px | medium | patch: toggles are `flex: 0 1 44px` with `aspect-ratio: 1`, so they shrink only where 7 do not fit |
| `All` becomes `disabled` when pressed, so focus drops to `<body>` | medium | patch: `aria-disabled` and a no-op handler, like the last-on toggle |
| `Use Mute for silence.` not announced when it appears | low | patch: caption is an always-present `aria-live="polite"` paragraph with reserved height (no sheet jump) |
| Scheduler test reads the boundary from the result it checks | low | patch: asserts the boundary is the first beat not yet scheduled at apply time, and that beat 1 was accented before it |
| `+ 0` in the beat mapping is a no-op | false | it turns `-0` into `0`; `toEqual` failed without it. Comment added |
| `clickLabel` renders `" & undefined"` for all-false input | false | unreachable: `normalize` keeps at least one beat on and every store action commits through it. Added 2-of-2, 2-of-3, 3-of-5 label cases |
| Store edge cases untested (All no-op, 1-beat meter, carry-over after toggle) | low | patch: three tests added |
| Hard-coded caption id | low | patch: `$props.id()` |
| Toggle size hard-coded instead of a token | low | reject: cosmetic; other sheets also use local sizes (Meter segment 72px) |
| `sprint-status.yaml` `last_updated` moved backwards | low | reject: the new value is the real system time; the previous value was ahead of the clock |
| CLICK accessible name differs from the epic context | low | defer: logged; depends on 3.2/3.4 settings |
| No DOM test or visual check for sheet interactions | medium | defer: logged (no DOM runner, no headless browser) |
| `aria-disabled` toggles get press feedback | false | `.toggle` has no `:active` or `:hover` style |
| On/off not distinguishable in forced-colors mode | low | defer: logged for the 5.5 accessibility pass |
