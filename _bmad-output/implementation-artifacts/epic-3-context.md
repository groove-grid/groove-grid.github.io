# Epic 3 Context: Train internal time with the click

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give the musician control over the click so they can train internal time: choose which beats click (e.g. 2 & 4, beat 1 only), add an optional quieter between-beats click, mute and unmute in phase to check whether they held the tempo, and pick a click sound that cuts through their instrument. This epic fills in the CLICK chip and Click sheet (left as a placeholder in Epic 2), the mute toggle, and the real click samples that replace Epic 1's placeholders. All of it has to keep the timing guarantees from Epics 1 and 2: no cancelled, doubled or late clicks, and changes land on a beat.

## Stories

- Story 3.1: Choose which beats click
- Story 3.2: Between-beats click
- Story 3.3: Mute and unmute in phase
- Story 3.4: Choose the click sound

## Requirements & Constraints

- **Click on beats:** one toggle per beat of the current meter, any combination, plus an `All` action. Every beat may be off; the chip then reads `No beats`.
- **Accent rule:** the beat-1 (accent) variant plays only when beat 1 is enabled. All other enabled beats use the normal variant.
- **Between beats:** `None` / `8ths` / `16ths` / `Triplets`. These clicks sound only inside enabled beats and use the normal variant at a softer gain. The choice is independent of the visible grid, and the division is relative to the beat in both /4 and /8 meters. Default is `None`.
- **Loudness order:** beat 1 > other beats > between-beat clicks.
- **Mute:** silences every click level at once, between-beat clicks included. Dot, comet tail, beat-1 pulse, glow, crossings and marker sounds all keep running. Unmute resumes in phase on the next scheduled click. The muted state stays across Stop and Start. Previews are never muted.
- **Click sound:** `Beep` (default), `Woodblock`, `Stick`, `Hi-hat`, each with an accent and a normal variant. Beat 1 must be distinguishable by pitch alone for every sound. While stopped, selecting a sound previews accent then normal 300 ms apart, even when muted. While playing there is no preview, and the new sound takes over on the next beat.
- **Apply timing while playing:** click-beat, between-beat and sound changes apply on the next beat. They must never cancel nodes that are already scheduled.
- **Timing bar (still applies):** each click within 1 ms of its ideal time, zero drift, no duplicate or missing events. The event plan needs unit tests for each between-beat division and for disabled beats.
- **Copy:** use the exact copy given here, with no exclamation marks and no coaching.

## Technical Decisions

- `clickBeats`, `betweenBeats` and `clickSound` are **metric** fields stored in the immutable core `Timeline` segment. Changing them goes through `withSettings` and applies at the first beat boundary at or after `committedUntil`, with rapid changes collapsing to the latest. `muted` is a **Live** field (not in the Timeline) and applies at once.
- Settings shape: `clickBeats: boolean[]` (length === `beats`, all false allowed), `betweenBeats: Division` where `1` means None (never a `'none'` string), `clickSound: ClickSoundId`, `muted: boolean`. Core `normalize` is the only validator. Mutate settings only through named store actions in `src/ui/settings.svelte.ts` (e.g. `toggleBeat`).
- The core planner emits `click` events with `level: 'accent' | 'beat' | 'sub'` only for enabled beats, and `sub` only inside enabled beats. Steps use 960 ticks per beat (`960 / division`). Event times are closed-form from the segment start, never accumulated.
- Three audio buses: **click** (mute sets gain to 0 while scheduling continues, which is what makes unmute land in phase), **marker** (never muted) and **preview** (never muted). Gain per level gives the loudness order. Playback goes through the `AudioOut` port: `play(sampleId, time, gain, bus)`.
- `EnginePort.preview(soundId)` is called from components through the injected port. The engine ignores it while playing and plays the two variants 300 ms apart in audio time. `resume()` must be called synchronously inside the preview gesture while stopped. Only `main.ts` calls `engine.apply`.
- Sound ids live in `src/core/constants.ts`: `ClickSoundId = 'beep' | 'woodblock' | 'stick' | 'hi-hat'`. Files are `public/sounds/click-<id>-accent.wav` and `click-<id>-normal.wav`: short mono WAVs with the transient at sample 0, pre-decoded at boot, loaded through the single URL builder based on `BASE_URL`, and precached by the service worker. The samples have to be sourced or created, and checked to be distinct.
- Engine tests run against a fake `AudioOut`, a fake clock and a fake worker. Core tests sit next to the code as `*.test.ts`.

## UX & Interaction Patterns

- **CLICK chip label:** all on gives `Every beat`; only beat 1 gives `Beat 1 only`; a single other beat gives `Beat n only`; two or three beats give a list (`2 & 4`, `1, 2 & 4`); otherwise `n of m beats`. The accessible name adds the sound and between-beats setting (`Click: Beep, 1 & 3, between beats none`).
- **Click sheet main view:** a `Click on beats` header with the `All` text-action (disabled when all beats are on; accessible name `Click on all beats`). Then the `beat-toggle` row: 44px round toggles, ink fill when on, `{spacing.1}` gap, at most 7 per row; 8–14 beats wrap to two balanced rows and 15–16 to three, with the extra toggle in the top row, left-aligned. The last-on toggle shows ink fill at 0.6 opacity and is `aria-disabled`. Below the toggles come the `Between beats` segmented control and the `Sounds ›` nav row with a live summary (`Beep · markers off`, `Woodblock · Cowbell markers`).
- **Sounds level:** opens in the same sheet with no slide animation. Focus moves to `sheet-back` (`Back to Click`), and Esc or back returns to the main view with focus on the Sounds row. This level holds the `Click sound` and `Marker sound` segmented controls. The Marker sound control is listed in the sheet design, but marker sound behavior belongs to Epic 4. The sheet stays open until dismissed and always reopens at the main view.
- **Mute toggle:** a 48px round button in the top bar with `aria-pressed` and the name `Mute click`. Unmuted, it is outlined with a speaker glyph. Muted, it has an ink fill with a `surface-raised` crossed-speaker glyph, so the state does not rely on color alone.
- **Semantics:** beat toggles are toggle buttons with `aria-pressed` named `Click on beat 3`. Segmented controls are `radiogroup`s. Previews are not announced.

## Cross-Story Dependencies

- Uses the Epic 2 pieces already built: `picker-sheet` behavior (scrim, focus trap, live-apply), the top-bar chips (CLICK is a placeholder until 3.1), the `segmented-control`, and the `clickBeats` carry-over rule on meter changes (2.7). The Epic 1 engine, planner and placeholder samples are also in place.
- 3.2 relies on 3.1's enabled-beat filtering. 3.3's mute must cover the between-beat clicks from 3.2. 3.4's Sounds level also hosts Marker sound, which Epic 4 (story 4.4) wires up.
- Epic 4's bulk-removal Undo restores `clickBeats` along with markers and meter. Epic 5 persists and restores all of the click fields, adds `M` as the mute shortcut, and runs the accessibility pass.
