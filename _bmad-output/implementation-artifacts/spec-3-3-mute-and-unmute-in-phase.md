---
title: 'Story 3.3: Mute and unmute in phase'
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

**Problem:** A musician cannot silence the click to test whether they held the tempo: `muted` exists in settings, but no control sets it and nothing in the audio path reads it.

**Approach:** The top bar gets a 48px round `mute-toggle` at its right edge with no caption, a toggle button named `Mute click` with `aria-pressed`. Unmuted it is outlined with a speaker glyph; muted it has an ink fill with a `surface-raised` crossed-speaker glyph, so the state does not rely on color alone. A new store action flips `muted`. Muting sets the click-bus gain to 0 at once while clicks keep being scheduled, so unmuting resumes on the next scheduled click, in phase. Every click level is silenced, between-beat clicks included. Dot, tail, pulse, glow and crossings keep running; the marker and preview buses are never muted. The muted state stays across Stop and Start, including an audio rebuild after a system pause. The keyboard shortcut belongs to Epic 5.

</frozen-after-approval>

## Implementation Notes

New port method `AudioOut.setClickMuted(muted)` rather than a generic bus gain, so the port cannot mute markers or previews. Decision: a roughly 5 ms `setTargetAtTime` ramp instead of a hard step, as the architecture review advised, so a click cut mid-sample does not pop. `apply` touches the bus only when `muted` changes. `start` always reapplies it, because a rebuilt output starts unmuted. `main.ts` swallows the rejection when mute is tapped after a failed bank load. Chips now ellipsize: mute takes 56px from a row DESIGN.md verified at 375px with almost no slack; the accessible names stay full. Known limit: unmuting during a sounding click fades in the rest of that sample, accepted in the architecture review. Previews do not exist until 3.4, so that half of the AC only holds by bus separation. Check, tests and lint pass. No browser check: glyphs, narrow widths and audible in-phase resume are unverified on a real device.

## Review Triage Log

Blind Hunter review (one subagent, same model level). Edge-case and other layers are not configured for oneshot.

| Finding | Verdict | Route / evidence |
|---|---|---|
| Top bar overflows below 375px, chip slides under mute | medium | patch: chips ellipsize; inferred from CSS, not measured |
| `start` builds `Live` from a stale `muted` | low | reject: nothing reads `live.muted`, audio is right because the bus is set, and the same staleness applies to every field |
| Unmute not aligned to the next click | low | reject: accepted in the architecture review; alignment needs the next click time in the adapter |
| Ramp comment loose, constant untested | low | patch: comment corrected, test bounds the constant |
| Stop and Start test never restarts | medium | patch: test restarts with the fake reset |
| Pause paths untested | low | patch: test for unmuting during a pause added; toggling on the old output is harmless, Start reapplies |
| `main.ts` rejection handler untested | low | reject: composition root has no tests, one-line handler |
| Bus test ran only while stopped, pending boundary not pinned | low | patch: test now runs while playing, pending-boundary test added; `atTime` holds |
| Mute button and preview-while-muted untested | medium | defer: logged, no DOM runner and no preview path until 3.4 |
| Spec has no notes or verification record | false | spec was still in progress; notes above record it |
