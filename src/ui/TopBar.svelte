<script lang="ts">
  import type { Settings } from '../core/settings.ts'
  import { clickLabel, gridChipLabel, meterLabel } from './chip-labels.ts'
  import GridSheet from './GridSheet.svelte'
  import MeterSheet from './MeterSheet.svelte'
  import Picker from './Picker.svelte'
  import { settingsStore } from './settings.svelte.ts'

  let { settings }: { settings: Settings } = $props()

  let gridChip = $state<HTMLButtonElement>()
  let gridOpen = $state(false)
  let meterChip = $state<HTMLButtonElement>()
  let meterOpen = $state(false)
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
    <button type="button" class="chip" aria-label={`Click, ${clickLabel()}`}>{clickLabel()}</button>
  </div>
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

  .chip:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
</style>
