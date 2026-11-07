- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-ci-and-live-deploy.md`
  summary: Register the generated service worker and wire the prompt-update flow.
  evidence: vite-plugin-pwa builds `sw.js` but nothing registers it (`injectRegister: false`); belongs with Epic 5 story 5.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-ci-and-live-deploy.md`
  summary: Tighten CSP `style-src` (drop `'unsafe-inline'`) if no inline styles are needed.
  evidence: Svelte production CSS is extracted, so inline styles may be unnecessary; confirm once canvas/UI exist.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-ci-and-live-deploy.md`
  summary: Give worker code its own tsconfig (WebWorker lib) instead of a global DOM+WebWorker lib list.
  evidence: Both libs in one config can clash on globals; hidden today by `skipLibCheck`. First worker is story 1.3.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-hear-a-steady-click-start-and-stop.md`
  summary: Handle sample-bank decode failure at boot (no unhandled rejection, allow retry on next Start).
  evidence: `loadBank` rejection in `main.ts` is only warned when Start is tapped; fits the 1.5 audio lifecycle story.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-iphone-timing-spike-and-platform-gate.md`
  summary: Add a test that `loop.mount` calls `onFrame` and that the spike BPM reaches the engine.
  evidence: Spike wiring in `main.ts`/`App.svelte`/`loop.ts` has no automated test; verification gap review, low risk for throwaway harness.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-design-tokens-and-the-practice-screen-layout.md`
  summary: Add a DOM component test for `App.svelte` (BPM numeral, Start/Stop label, notice) once a DOM test environment exists.
  evidence: No automated check renders `App`; layout verified only by headless screenshots; verification-gap review.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-settings-store-and-tempo-steppers.md`
  summary: Test the store-to-engine wiring (`apply` receives new tempo) and `Stepper.svelte` pointer/keyboard handling.
  evidence: Only the store and hold-repeat logic are unit-tested; wiring and component handlers need a DOM test setup or a device check. Fits story 2.3's `apply` tests.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-tempo-changes-land-on-the-beat.md`
  summary: Test that `App.svelte` greys the numeral while `engine.pending.changed` includes `bpm` (needs a DOM test environment).
  evidence: Only the engine and core sides of pending are unit-tested; the class binding in `App.svelte` is verified by reading, same gap as 2.1 and 2.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-5-the-beat-grid-with-spokes-and-labels.md`
  summary: Test grid layer drawing and cache reuse (spokes, labels, rebuild only on input change) once a canvas or DOM test environment exists.
  evidence: Only the pure core and geometry sides are unit-tested; the layer and `App.svelte` ARIA binding are verified by reading and a build, same gap as 2.1-2.4.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-6-choose-visible-subdivisions.md`
  summary: Picker, GridSheet and TopBar interactions (focus trap, Esc, scrim, swipe, popover placement) have no automated test.
  evidence: No DOM test runner is installed; verified by type check and manual inspection only.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-7-any-meter.md`
  summary: Revisit post-MVP: meter changes feel slow while playing, because they wait for the next downbeat (up to a full bar, about 3s at 80 BPM in 4/4); consider faster feedback or a visible pending state on the METER chip.
  evidence: User observation after 2.7; the delay is by design (AD-6, FR13) but the lack of feedback reads as lag.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-7-any-meter.md`
  summary: Revisit post-MVP: the Meter sheet and settings pickers in general (layout, Other section, beat unit control) do not feel right to the user.
  evidence: User said they are "not really happy with the settings" after trying 2.7; rework with real usage once the MVP is complete.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-7-any-meter.md`
  summary: Revisit post-MVP: X/8 meters (6/8, 7/8, 12/8) are confusing because BPM still counts a quarter-note-sized beat on the grid; decide whether beat unit 8 should change what the beat means, or be dropped or reframed (e.g. grouping).
  evidence: User observation: "X/8 doesn't make much sense if the beat stays as quarter"; today `beatUnit` only changes the label and the BPM unit.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-choose-which-beats-click.md`
  summary: Extend the CLICK chip's accessible name to include the sound and the between-beats setting (`Click: Beep, 1 & 3, between beats none`) once 3.2 and 3.4 add them.
  evidence: 3.1 keeps `Click, {label}` like the other chips; the longer name in the epic context depends on settings that 3.2/3.4 add.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-choose-which-beats-click.md`
  summary: Click sheet interactions (sheet stays open on toggles, last toggle inert, aria-pressed/aria-disabled, live chip label, focus return) have no DOM test or browser check.
  evidence: No DOM runner and no headless browser on the dev machine; verified by type check and reading only. Do a manual pass at 320px and 768px+ widths.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-choose-which-beats-click.md`
  summary: Beat toggles differ only by background colour, which forced-colors mode overrides; add a `forced-colors: active` style for the on state.
  evidence: `.toggle.on` sets only background and colour; belongs with the Epic 5 accessibility pass (5.5).
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-between-beats-click.md`
  summary: The CLICK chip's accessible name still needs the sound (story 3.4); the docs write `Click: Beep, ...` while the code uses `Click, ...` like the other chips, so settle the separator then.
  evidence: 3.2 added only the between-beats part; `clickChipName` in `chip-labels.ts`, epic-3-context line 40, EXPERIENCE.md line 237.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-between-beats-click.md`
  summary: `SegmentedControl` does not drop labels to caption size on overflow (DESIGN.md); needed once `Woodblock` joins the 4-segment `Click sound` control in 3.4.
  evidence: Labels are `nowrap` in a clipped group. `Triplets` fits a quarter of a 320px sheet, `Woodblock` likely does not.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-between-beats-click.md`
  summary: Move `Beat unit` in `MeterSheet.svelte` to `SegmentedControl`, which also gives it the DESIGN.md look and arrow keys.
  evidence: `MeterSheet.svelte` lines 61-72 are hand-rolled separate pills with no arrow navigation.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-between-beats-click.md`
  summary: The selected segment differs only by background colour, which forced-colors mode overrides; add it to the 5.5 accessibility pass with the beat toggles.
  evidence: `.segment.selected` sets only background and colour; no `forced-colors` rule exists in `src`.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-between-beats-click.md`
  summary: Between beats sheet interactions (arrow keys, roving tabindex, Tab trap with a roving group, stays open, chip name) have no DOM test or browser check.
  evidence: No DOM runner and no headless browser on the dev machine; verified by type check and reading only. Check Tab and arrows in a manual pass.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-between-beats-click.md`
  summary: Idea, not planned: turn individual sub-beats on or off for the click (user question, 2026-11-02). Try Epic 4 markers with a marker sound first, since they already allow custom sub-beat patterns; a real version would go through `bmad-correct-course`.
  evidence: `betweenBeats` is one division for the whole bar. Markers differ: separate sound, not muted, tied to the visible grid. Per-sub-beat toggles need a new settings shape and a much denser Click sheet (16ths in 4/4 is 16 toggles).

- source_spec: `_bmad-output/implementation-artifacts/spec-3-3-mute-and-unmute-in-phase.md`
  summary: The mute button's name, `aria-pressed` and glyph swap have no automated test, and nothing yet proves a preview plays while muted.
  evidence: The repo has no DOM test runner and the preview path arrives in story 3.4, whose AC should assert `play` routes to the preview bus and audibility while muted.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-choose-the-click-sound.md`
  summary: The Sounds level (nav row, focus to `Back to Click` and back, Esc going back without closing), the segmented-control caption fallback and the TopBar preview wiring have no automated test.
  evidence: No DOM or component test runner in the repo (no jsdom, testing-library or Playwright); only pure label and store tests run. Removing `preview(sound)` from TopBar or the Esc `preventDefault` would pass all tests. Needs a tooling decision, such as vitest with jsdom and Svelte `mount`.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-choose-the-click-sound.md`
  summary: The click sound choice is hard to find: it sits behind the `Sounds ›` row at the bottom of the Click sheet, a second level most users will never open. Rethink where sound selection lives (for example on the Click sheet's main view, or its own entry point).
  evidence: User feedback after 3.4 (2026-11-07): "the UX is very bad the sounds menu is hidden". The two-level layout follows UX-DR16 / EXPERIENCE.md, so changing it is a UX decision, likely via `bmad-ux` or `bmad-correct-course`.
