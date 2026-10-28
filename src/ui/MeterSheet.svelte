<script lang="ts">
  import { BEATS_MAX, BEATS_MIN } from '../core/constants.ts'
  import { METER_PRESETS, meterLabel } from './chip-labels.ts'
  import Stepper from './Stepper.svelte'

  let {
    beats,
    beatUnit,
    onpreset,
    onchange,
  }: {
    beats: number
    beatUnit: 4 | 8
    onpreset: (beats: number, beatUnit: 4 | 8) => void
    onchange: (beats: number, beatUnit: 4 | 8) => void
  } = $props()

  function stepBeats(delta: number): boolean {
    const next = Math.min(BEATS_MAX, Math.max(BEATS_MIN, beats + delta))
    onchange(next, beatUnit)
    return delta > 0 ? next < BEATS_MAX : next > BEATS_MIN
  }
</script>

<h2 class="title">Meter</h2>
<div class="presets" role="radiogroup" aria-label="Presets">
  {#each METER_PRESETS as preset (meterLabel(preset))}
    {@const selected = preset.beats === beats && preset.beatUnit === beatUnit}
    <button
      type="button"
      class="preset"
      class:selected
      role="radio"
      aria-checked={selected}
      onclick={() => onpreset(preset.beats, preset.beatUnit)}>{meterLabel(preset)}</button
    >
  {/each}
</div>

<h3 class="section">Other</h3>
<div class="other">
  <span class="name">Beats</span>
  <div class="beats">
    <Stepper
      label="Fewer beats"
      kind="minus"
      disabled={beats <= BEATS_MIN}
      step={() => stepBeats(-1)}
    />
    <output class="count" aria-live="polite">{beats}</output>
    <Stepper
      label="More beats"
      kind="plus"
      disabled={beats >= BEATS_MAX}
      step={() => stepBeats(1)}
    />
  </div>
</div>
<div class="other">
  <span class="name" id="unit-name">Beat unit</span>
  <div class="segmented" role="radiogroup" aria-labelledby="unit-name">
    {#each [4, 8] as const as unit (unit)}
      <button
        type="button"
        class="segment"
        class:selected={unit === beatUnit}
        role="radio"
        aria-checked={unit === beatUnit}
        onclick={() => onchange(beats, unit)}>{unit}</button
      >
    {/each}
  </div>
</div>

<style>
  .title {
    margin: 0 0 var(--space-2);
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    line-height: var(--label-line);
  }

  .section {
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--chip-caption-size);
    font-weight: var(--chip-caption-weight);
    line-height: var(--chip-caption-line);
    letter-spacing: var(--chip-caption-tracking);
    text-transform: uppercase;
    color: var(--ink-secondary);
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
  }

  .preset,
  .segment {
    height: var(--target-min);
    padding: 0;
    border: 1px solid var(--border-hairline);
    border-radius: var(--radius-full);
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    cursor: pointer;
    touch-action: manipulation;
  }

  .preset:active,
  .segment:active {
    background: var(--surface-pressed);
  }

  .selected,
  .selected:active {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--surface-raised);
  }

  .preset:focus-visible,
  .segment:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  .other {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--control-lg);
  }

  .name {
    font-size: var(--body-size);
    line-height: var(--body-line);
  }

  .beats {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .count {
    min-width: var(--space-5);
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .segmented {
    display: flex;
    gap: var(--space-2);
  }

  .segment {
    width: 72px;
  }
</style>
