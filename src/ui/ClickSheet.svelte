<script lang="ts">
  import { tick } from 'svelte'
  import { CLICK_SOUND_IDS, type ClickSoundId, type MarkerSoundId } from '../core/constants.ts'
  import type { Division } from '../core/settings.ts'
  import {
    beatToggleRows,
    betweenBeatsLabel,
    clickSoundLabel,
    soundsRowName,
    soundsSummary,
  } from './chip-labels.ts'
  import SegmentedControl from './SegmentedControl.svelte'

  let {
    clickBeats,
    betweenBeats,
    clickSound,
    markerSound,
    ontoggle,
    onall,
    onbetweenbeats,
    onclicksound,
  }: {
    clickBeats: readonly boolean[]
    betweenBeats: Division
    clickSound: ClickSoundId
    markerSound: MarkerSoundId | null
    ontoggle: (index: number) => void
    onall: () => void
    onbetweenbeats: (division: Division) => void
    onclicksound: (sound: ClickSoundId) => void
  } = $props()

  const BETWEEN_BEATS: readonly Division[] = [1, 2, 4, 3]
  const betweenOptions = BETWEEN_BEATS.map((value) => ({ value, label: betweenBeatsLabel(value) }))
  const soundOptions = CLICK_SOUND_IDS.map((value) => ({ value, label: clickSoundLabel(value) }))
  const uid = $props.id()
  const betweenId = `${uid}-between`
  const soundId = `${uid}-sound`
  const levelTitleId = `${uid}-sounds-title`

  const rows = $derived(beatToggleRows(clickBeats.length))
  const allOn = $derived(clickBeats.every(Boolean))

  // Local, so the sheet always reopens at the main view.
  let level = $state<'main' | 'sounds'>('main')
  let soundsRow = $state<HTMLButtonElement>()
  let backButton = $state<HTMLButtonElement>()

  async function openSounds() {
    level = 'sounds'
    await tick()
    backButton?.focus()
  }

  async function backToMain() {
    level = 'main'
    await tick()
    soundsRow?.focus()
  }

  // Capture phase on the window, so Esc goes back wherever focus is (panel or body), before the
  // picker's bubble-phase listener sees it.
  function onkeydowncapture(event: KeyboardEvent) {
    if (event.key !== 'Escape' || level !== 'sounds') return
    // Marked handled so the picker does not also close the sheet.
    event.preventDefault()
    void backToMain()
  }
</script>

<svelte:window {onkeydowncapture} />

{#if level === 'main'}
  {@render main()}
{:else}
  <div role="group" aria-labelledby={levelTitleId}>
    <div class="back-head">
      <button
        type="button"
        class="back"
        bind:this={backButton}
        aria-label="Back to Click"
        onclick={backToMain}>&lsaquo;</button
      >
      <h2 class="title level-title" id={levelTitleId}>Sounds</h2>
    </div>
    <h3 class="section between" id={soundId}>Click sound</h3>
    <SegmentedControl
      labelledby={soundId}
      options={soundOptions}
      value={clickSound}
      onselect={onclicksound}
    />
  </div>
{/if}

{#snippet main()}
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
  <button
    type="button"
    class="nav-row"
    bind:this={soundsRow}
    aria-label={soundsRowName(clickSound, markerSound)}
    onclick={openSounds}
  >
    <span>Sounds</span>
    <span class="summary">{soundsSummary(clickSound, markerSound)}</span>
    <span class="chevron" aria-hidden="true">&rsaquo;</span>
  </button>
{/snippet}

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

  .nav-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    box-sizing: border-box;
    width: 100%;
    height: var(--target-min);
    margin-top: var(--space-5);
    padding: 0;
    border: 0;
    border-top: 1px solid var(--border-hairline);
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: var(--body-size);
    font-weight: var(--body-weight);
    line-height: var(--body-line);
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
  }

  .nav-row:active {
    background: var(--surface-pressed);
  }

  .summary {
    margin-left: auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--caption-size);
    font-weight: var(--caption-weight);
    line-height: var(--caption-line);
    color: var(--ink-secondary);
  }

  .chevron {
    font-size: 22px;
    line-height: 1;
  }

  .back-head {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .back {
    flex: none;
    width: var(--target-min);
    height: var(--target-min);
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    touch-action: manipulation;
  }

  .back:active {
    background: var(--surface-pressed);
  }

  .level-title {
    flex: 1;
    margin: 0 var(--target-min) 0 0;
    text-align: center;
  }

  .all:focus-visible,
  .toggle:focus-visible,
  .nav-row:focus-visible,
  .back:focus-visible {
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
