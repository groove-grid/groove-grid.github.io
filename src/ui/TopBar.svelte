<script lang="ts">
  import type { ClickSoundId } from '../core/constants.ts'
  import type { Settings } from '../core/settings.ts'
  import { clickChipName, clickLabel, gridChipLabel, meterLabel } from './chip-labels.ts'
  import ClickSheet from './ClickSheet.svelte'
  import GridSheet from './GridSheet.svelte'
  import MeterSheet from './MeterSheet.svelte'
  import Picker from './Picker.svelte'
  import { settingsStore } from './settings.svelte.ts'

  let { settings, preview }: { settings: Settings; preview: (sound: ClickSoundId) => void } =
    $props()

  let gridChip = $state<HTMLButtonElement>()
  let gridOpen = $state(false)
  let meterChip = $state<HTMLButtonElement>()
  let meterOpen = $state(false)
  let clickChip = $state<HTMLButtonElement>()
  let clickOpen = $state(false)
</script>

<div class="top-bar">
  <div class="pair">
    <span class="caption" aria-hidden="true">Meter</span>
    <button
      type="button"
      class="chip"
      class:open={meterOpen}
      bind:this={meterChip}
      aria-label={`Meter, ${meterLabel(settings)}`}
      aria-haspopup="dialog"
      aria-expanded={meterOpen}
      onclick={() => (meterOpen = !meterOpen)}>{meterLabel(settings)}</button
    >
  </div>
  <div class="pair">
    <span class="caption" aria-hidden="true">Grid</span>
    <button
      type="button"
      class="chip"
      class:open={gridOpen}
      bind:this={gridChip}
      aria-label={`Grid, ${gridChipLabel(settings.grid)}`}
      aria-haspopup="dialog"
      aria-expanded={gridOpen}
      onclick={() => (gridOpen = !gridOpen)}>{gridChipLabel(settings.grid)}</button
    >
  </div>
  <div class="pair">
    <span class="caption" aria-hidden="true">Click</span>
    <button
      type="button"
      class="chip"
      class:open={clickOpen}
      bind:this={clickChip}
      aria-label={clickChipName(settings.clickSound, settings.clickBeats, settings.betweenBeats)}
      aria-haspopup="dialog"
      aria-expanded={clickOpen}
      onclick={() => (clickOpen = !clickOpen)}>{clickLabel(settings.clickBeats)}</button
    >
  </div>
  <button
    type="button"
    class="mute"
    aria-label="Mute click"
    aria-pressed={settings.muted}
    onclick={() => settingsStore.toggleMuted()}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path
        d={settings.muted
          ? 'M16 9.5l5 5M21 9.5l-5 5'
          : 'M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12'}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </button>
</div>

{#if meterOpen && meterChip}
  <Picker anchor={meterChip} title="Meter" onclose={() => (meterOpen = false)}>
    <MeterSheet
      beats={settings.beats}
      beatUnit={settings.beatUnit}
      onpreset={(beats, beatUnit) => {
        settingsStore.setMeter(beats, beatUnit)
        meterOpen = false
        meterChip?.focus()
      }}
      onchange={(beats, beatUnit) => settingsStore.setMeter(beats, beatUnit)}
    />
  </Picker>
{/if}

{#if gridOpen && gridChip}
  <Picker anchor={gridChip} title="Grid" onclose={() => (gridOpen = false)}>
    <GridSheet
      grid={settings.grid}
      onselect={(level) => {
        settingsStore.setGrid(level)
        gridOpen = false
        gridChip?.focus()
      }}
    />
  </Picker>
{/if}

{#if clickOpen && clickChip}
  <Picker anchor={clickChip} title="Click" onclose={() => (clickOpen = false)}>
    <ClickSheet
      clickBeats={settings.clickBeats}
      betweenBeats={settings.betweenBeats}
      clickSound={settings.clickSound}
      markerSound={settings.markerSound}
      ontoggle={(index) => settingsStore.toggleClickBeat(index)}
      onall={() => settingsStore.setAllClickBeats()}
      onbetweenbeats={(division) => settingsStore.setBetweenBeats(division)}
      onclicksound={(sound) => {
        settingsStore.setClickSound(sound)
        // Synchronous, inside the gesture; the engine plays it only while stopped.
        preview(sound)
      }}
    />
  </Picker>
{/if}

<style>
  .top-bar {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
    min-width: 0;
  }

  .pair {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .caption {
    padding-left: var(--chip-padding-x);
    font-size: var(--chip-caption-size);
    font-weight: var(--chip-caption-weight);
    line-height: var(--chip-caption-line);
    letter-spacing: var(--chip-caption-tracking);
    text-transform: uppercase;
    color: var(--ink-secondary);
  }

  .chip {
    height: var(--target-min);
    box-sizing: border-box;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 var(--chip-padding-x);
    border: 1px solid var(--border-hairline);
    border-radius: var(--radius-full);
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    white-space: nowrap;
    cursor: pointer;
    touch-action: manipulation;
  }

  .chip:active {
    background: var(--surface-pressed);
  }

  .chip.open {
    border: 1.5px solid var(--ink);
  }

  .mute {
    flex: none;
    box-sizing: border-box;
    width: var(--target-min);
    height: var(--target-min);
    margin-left: auto;
    padding: 0;
    display: grid;
    place-items: center;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-full);
    background: var(--surface-raised);
    color: var(--ink);
    cursor: pointer;
    touch-action: manipulation;
  }

  .mute:active {
    background: var(--surface-pressed);
  }

  .mute[aria-pressed='true'] {
    background: var(--ink);
    color: var(--surface-raised);
  }

  .mute[aria-pressed='true']:active {
    opacity: 0.85;
  }

  .chip:focus-visible,
  .mute:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
</style>
