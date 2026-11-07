<script lang="ts" generics="T">
  let {
    labelledby,
    options,
    value,
    onselect,
  }: {
    labelledby: string
    options: readonly { value: T; label: string }[]
    value: T
    onselect: (value: T) => void
  } = $props()

  const OFFSETS: Record<string, number> = {
    ArrowLeft: -1,
    ArrowUp: -1,
    ArrowRight: 1,
    ArrowDown: 1,
  }

  /**
   * If any label would overflow at label size, every label in the control drops to caption size
   * (DESIGN.md segmented-control). Measured at label size each time, so it can grow back.
   */
  function fitLabels(group: HTMLElement): () => void {
    let disposed = false
    const fit = () => {
      if (disposed) return
      group.classList.remove('compact')
      const overflows = [...group.querySelectorAll('button')].some(
        (button) => button.scrollWidth > button.clientWidth,
      )
      group.classList.toggle('compact', overflows)
    }
    const observer = new ResizeObserver(fit)
    observer.observe(group)
    fit()
    void document.fonts?.ready.then(fit)
    return () => {
      disposed = true
      observer.disconnect()
    }
  }

  /** Arrows move and select within the group; Tab enters only at the selected segment. */
  function onkeydown(event: KeyboardEvent, index: number): void {
    const offset = OFFSETS[event.key]
    if (offset === undefined || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    const next = (index + offset + options.length) % options.length
    onselect(options[next]!.value)
    const group = (event.currentTarget as HTMLElement).parentElement
    group?.querySelectorAll('button')[next]?.focus()
  }
</script>

<div
  class="segmented"
  role="radiogroup"
  aria-labelledby={labelledby}
  {@attach (group) => {
    void options
    return fitLabels(group)
  }}
>
  {#each options as option, index (option.value)}
    <button
      type="button"
      class="segment"
      class:selected={option.value === value}
      role="radio"
      aria-checked={option.value === value}
      tabindex={option.value === value ? 0 : -1}
      onclick={() => onselect(option.value)}
      onkeydown={(event) => onkeydown(event, index)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .segmented {
    display: flex;
    box-sizing: border-box;
    height: var(--target-min);
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .segmented:has(:focus-visible) {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  .segment {
    flex: 1 1 0;
    min-width: 0;
    padding: 0;
    border: 0;
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    white-space: nowrap;
    cursor: pointer;
    outline: none;
    touch-action: manipulation;
  }

  .segmented:global(.compact) .segment {
    font-size: var(--caption-size);
  }

  .segment + .segment {
    border-left: 1px solid var(--border-hairline);
  }

  .segment:active {
    background: var(--surface-pressed);
  }

  .segment.selected {
    background: var(--ink);
    color: var(--surface-raised);
  }
</style>
