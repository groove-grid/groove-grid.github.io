<script lang="ts">
  import { onMount, type Snippet } from 'svelte'

  let {
    anchor,
    title,
    onclose,
    children,
  }: { anchor: HTMLElement; title: string; onclose: () => void; children: Snippet } = $props()

  const WIDE = '(min-width: 768px)'
  const POPOVER_WIDTH = 360
  const SWIPE_CLOSE_PX = 60

  let panel: HTMLDivElement
  const wide = window.matchMedia(WIDE).matches
  let left = $state(0)
  let top = $state(0)
  let swipeStart: number | null = null

  const FOCUSABLE = 'button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])'

  function focusables(): HTMLElement[] {
    return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
  }

  function close() {
    onclose()
    anchor.focus()
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!panel.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  onMount(() => {
    if (wide) {
      const rect = anchor.getBoundingClientRect()
      left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8))
      top = rect.bottom + 8
    }
    ;(focusables()[0] ?? panel).focus()
    // A click on the anchor itself toggles the picker, so only outside clicks close it here.
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (wide && !panel.contains(target) && !anchor.contains(target)) onclose()
    }
    window.addEventListener('pointerdown', outside)
    return () => window.removeEventListener('pointerdown', outside)
  })
</script>

<svelte:window {onkeydown} />

{#if !wide}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={close}></div>
{/if}
<div
  bind:this={panel}
  class={wide ? 'popover' : 'sheet'}
  style:left={wide ? `${left}px` : null}
  style:top={wide ? `${top}px` : null}
  role="dialog"
  aria-modal={wide ? undefined : 'true'}
  aria-label={title}
  tabindex="-1"
  onpointerdown={(event) => {
    if (!wide) swipeStart = event.clientY
  }}
  onpointerup={(event) => {
    if (swipeStart !== null && event.clientY - swipeStart > SWIPE_CLOSE_PX) close()
    swipeStart = null
  }}
  onpointercancel={() => (swipeStart = null)}
>
  {@render children()}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: var(--scrim);
    opacity: 0.32;
    z-index: 10;
  }

  .sheet,
  .popover {
    position: fixed;
    z-index: 11;
    box-sizing: border-box;
    background: var(--surface-raised);
    padding: var(--space-4);
    overflow-y: auto;
    outline: none;
  }

  .sheet {
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 100%;
    max-width: var(--column-max);
    max-height: 70dvh;
    padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    touch-action: pan-x;
  }

  .popover {
    width: 360px;
    border: 1px solid var(--border-hairline);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgb(28 27 25 / 0.16);
  }
</style>
