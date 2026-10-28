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
