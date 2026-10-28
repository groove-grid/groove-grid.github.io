<script lang="ts">
  import type { Division } from '../core/settings.ts'
  import { gridChipLabel } from './chip-labels.ts'

  let {
    grid,
    onselect,
  }: { grid: Division; onselect: (grid: Division) => void } = $props()

  const LEVELS: Division[] = [1, 2, 4, 3]
</script>

<h2 class="title">Grid</h2>
<div role="radiogroup" aria-label="Finest visible level">
  {#each LEVELS as level (level)}
    <button
      type="button"
      class="row"
      role="radio"
      aria-checked={level === grid}
      onclick={() => onselect(level)}
    >
      <span class="check" aria-hidden="true">{level === grid ? '✓' : ''}</span>
      {gridChipLabel(level)}
    </button>
  {/each}
</div>
<hr class="divider" />
<button type="button" class="row clear" aria-disabled="true">
  <span class="check" aria-hidden="true"></span>
  Clear all markers
</button>

<style>
  .title {
    margin: 0 0 var(--space-2);
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    line-height: var(--label-line);
  }

  .row {
    display: flex;
    align-items: center;
    width: 100%;
    height: var(--target-min);
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: var(--body-size);
    line-height: var(--body-line);
    text-align: left;
    cursor: pointer;
  }

  .row:active {
    background: var(--surface-pressed);
  }

  .row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  .check {
    width: var(--space-5);
    flex: none;
    font-weight: 600;
  }

  .divider {
    margin: var(--space-2) 0;
    border: 0;
    border-top: 1px solid var(--border-hairline);
  }

  .clear {
    color: var(--ink-disabled);
    cursor: default;
  }

  .clear:active {
    background: none;
  }
</style>
