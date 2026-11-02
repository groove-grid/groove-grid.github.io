<script lang="ts">
  import type { Division } from '../core/settings.ts'
  import { beatToggleRows, betweenBeatsLabel } from './chip-labels.ts'
  import SegmentedControl from './SegmentedControl.svelte'

  let {
    clickBeats,
    betweenBeats,
    ontoggle,
    onall,
    onbetweenbeats,
  }: {
    clickBeats: readonly boolean[]
    betweenBeats: Division
    ontoggle: (index: number) => void
    onall: () => void
    onbetweenbeats: (division: Division) => void
  } = $props()

  const BETWEEN_BEATS: readonly Division[] = [1, 2, 4, 3]
  const betweenOptions = BETWEEN_BEATS.map((value) => ({ value, label: betweenBeatsLabel(value) }))
  const betweenId = $props.id()

  const rows = $derived(beatToggleRows(clickBeats.length))
  const allOn = $derived(clickBeats.every(Boolean))
</script>

<h2 class="title">Click</h2>
<div class="head">
  <h3 class="section">Click on beats</h3>
  <!-- aria-disabled, not disabled, so focus stays here after pressing All. -->
  <button
    type="button"
    class="all"
    aria-label="Click on all beats"
    aria-disabled={allOn}
    onclick={() => {
      if (!allOn) onall()
    }}>All</button
  >
</div>
<div class="rows">
  {#each rows as row, r (r)}
    <div class="row">
      {#each row as beat (beat)}
        {@const on = clickBeats[beat - 1] ?? false}
        <button
          type="button"
          class="toggle"
          class:on
          aria-label={`Click on beat ${beat}`}
          aria-pressed={on}
          onclick={() => ontoggle(beat - 1)}>{beat}</button
        >
      {/each}
    </div>
  {/each}
</div>
<h3 class="section between" id={betweenId}>Between beats</h3>
<SegmentedControl
  labelledby={betweenId}
  options={betweenOptions}
  value={betweenBeats}
  onselect={onbetweenbeats}
/>

<style>
  .title {
    margin: 0 0 var(--space-2);
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    line-height: var(--label-line);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section {
    margin: 0;
    font-size: var(--chip-caption-size);
    font-weight: var(--chip-caption-weight);
    line-height: var(--chip-caption-line);
    letter-spacing: var(--chip-caption-tracking);
    text-transform: uppercase;
    color: var(--ink-secondary);
  }

  .between {
    margin: var(--space-3) 0 var(--space-1);
  }

  .all {
    min-width: var(--target-min);
    height: var(--target-min);
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    text-align: right;
    cursor: pointer;
    touch-action: manipulation;
  }

  .all[aria-disabled='true'] {
    color: var(--ink-disabled);
    cursor: default;
  }

  .all:focus-visible,
  .toggle:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .row {
    display: flex;
    gap: var(--space-1);
  }

  /* 44px, shrinking only where 7 do not fit (popover content box, phones under 375px). */
  .toggle {
    flex: 0 1 44px;
    min-width: 0;
    aspect-ratio: 1;
    padding: 0;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-full);
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    font-size: var(--beat-label-size);
    font-weight: var(--beat-label-weight);
    line-height: var(--beat-label-line);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    touch-action: manipulation;
  }

  .toggle.on {
    background: var(--ink);
    color: var(--surface-raised);
  }
</style>
