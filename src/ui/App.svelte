<script lang="ts">
  import { onMount } from 'svelte'
  import type { ClockReader, EnginePort, EngineStatus, PausedReason } from '../core/ports.ts'
  import { BPM_MAX, BPM_MIN } from '../core/constants.ts'
  import { gridLabel } from '../core/grid.ts'
  import { createTapTempo } from '../core/tap-tempo.ts'
  import { mount } from '../render/loop.ts'
  import { createDragTempo } from './drag-tempo.ts'
  import { deriveNotice, isIos } from './notice.ts'
  import { settingsStore } from './settings.svelte.ts'
  import SpikePanel from './SpikePanel.svelte'
  import Stepper from './Stepper.svelte'
  import TopBar from './TopBar.svelte'
  import type { SpikeHooks } from './spike.ts'
  import { createWakeLock } from './wake-lock.ts'

  let {
    engine,
    clock,
    spike = null,
  }: { engine: EnginePort; clock: ClockReader; spike?: SpikeHooks | null } = $props()

  let canvas: HTMLCanvasElement

  let status = $state<EngineStatus>('stopped')
  let pausedReason = $state<PausedReason | null>(null)
  let silentHint = $state(false)
  let bpmPending = $state(false)
  // The silent-switch hint shows on the first Start only; kept in memory until Epic 5 persists it.
  let hintUsed = false
  const bpm = $derived(settingsStore.current.bpm)
  const notice = $derived(deriveNotice({ status, pausedReason, silentHint }))

  const tapTempo = createTapTempo()
  const drag = createDragTempo(
    () => settingsStore.current.bpm,
    (value) => settingsStore.setTempo(value),
  )

  // Tap uses the event's monotonic timestamp, so it works before the audio context exists.
  function tap(event: PointerEvent | MouseEvent) {
    const next = tapTempo.tap(event.timeStamp)
    if (next !== null) settingsStore.setTempo(next)
  }

  onMount(() => {
    status = engine.status
    const unmount = mount(canvas, clock, spike?.onFrame, () => settingsStore.current)
    const releaseWakeLock = createWakeLock(navigator, engine)
    const unsubscribe = engine.subscribe(() => {
      status = engine.status
      pausedReason = engine.pausedReason
      bpmPending = engine.pending?.changed.includes('bpm') ?? false
      if (status !== 'playing') silentHint = false
    })
    return () => {
      unmount()
      releaseWakeLock()
      unsubscribe()
    }
  })

  // `start` calls AudioContext.resume() synchronously, so it must run directly in the tap.
  function toggle() {
    if (status === 'playing') engine.stop()
    else {
      if (!hintUsed) {
        hintUsed = true
        silentHint = !engine.audioSessionSupported && isIos(navigator)
      }
      void engine.start(settingsStore.current)
    }
  }
</script>

<main>
  <div class="column">
    <h1 class="sr-only">Groove Grid</h1>
    <TopBar settings={settingsStore.current} />
    <div class="circle">
      <!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
      <canvas bind:this={canvas} role="img" aria-label={gridLabel(settingsStore.current)}></canvas>
    </div>
    <p class="notice" aria-live="polite">{notice}</p>
    <div class="tempo-row">
      <Stepper
        label="Decrease tempo"
        kind="minus"
        disabled={bpm <= BPM_MIN}
        step={() => settingsStore.stepTempo(-1)}
      />
      <div
        class="tempo-value"
        role="presentation"
        onpointerdown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.begin(event.clientY)
        }}
        onpointermove={(event) => drag.move(event.clientY)}
        onpointerup={() => drag.end()}
        onpointercancel={() => drag.end()}
      >
        <div class="readout">
          <span class="bpm-numeral" class:pending={bpmPending}>{bpm}</span>
          <span class="bpm-unit">BPM</span>
        </div>
      </div>
      <Stepper
        label="Increase tempo"
        kind="plus"
        disabled={bpm >= BPM_MAX}
        step={() => settingsStore.stepTempo(1)}
      />
    </div>
    <div class="transport-row">
      <button type="button" class="tap" onclick={tap}>Tap</button>
      <button type="button" class="transport" onclick={toggle}
        >{status === 'playing' ? 'Stop' : 'Start'}</button
      >
    </div>
  </div>
  {#if spike}<SpikePanel snapshot={spike.snapshot} {status} />{/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--pulse, var(--surface));
    color: var(--ink);
    font-family: var(--font);
    font-size: var(--body-size);
    line-height: var(--body-line);
  }

  main {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* UX-DR3: top bar, circle, notice, tempo row, transport row in one centered column. */
  .column {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    max-width: var(--column-max);
    height: 100dvh;
    min-height: 640px;
    display: grid;
    grid-template-rows:
      calc(var(--top-bar-height) + var(--space-2))
      minmax(260px, 1fr)
      var(--target-min)
      88px
      var(--control-lg);
    padding: env(safe-area-inset-top) calc(var(--gutter) + env(safe-area-inset-right))
      calc(env(safe-area-inset-bottom) + var(--space-4))
      calc(var(--gutter) + env(safe-area-inset-left));
  }

  .circle {
    container-type: size;
    display: grid;
    place-items: center;
    min-height: 260px;
  }

  canvas {
    width: min(100cqw, 100cqh);
    aspect-ratio: 1;
    display: block;
  }

  .notice {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--ink-secondary);
    font-size: var(--caption-size);
    font-weight: var(--caption-weight);
    line-height: var(--caption-line);
  }

  .tempo-row {
    display: grid;
    grid-template-columns: var(--control-lg) 1fr var(--control-lg);
    align-items: center;
    padding-top: var(--space-2);
  }

  .tempo-value {
    align-self: stretch;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    display: grid;
    place-content: center;
  }

  .readout {
    display: flex;
    align-items: baseline;
    column-gap: var(--space-2);
  }

  .bpm-numeral {
    text-align: center;
    font-size: var(--bpm-numeral-size);
    font-weight: var(--bpm-numeral-weight);
    line-height: var(--bpm-numeral-line);
    letter-spacing: var(--bpm-numeral-tracking);
    font-variant-numeric: tabular-nums;
  }

  .bpm-numeral.pending {
    color: var(--ink-secondary);
  }

  .bpm-unit {
    font-size: var(--bpm-unit-size);
    font-weight: var(--bpm-unit-weight);
    line-height: var(--bpm-unit-line);
    letter-spacing: var(--bpm-unit-tracking);
    color: var(--ink-secondary);
  }

  .transport-row {
    display: flex;
    gap: var(--space-2);
  }

  button {
    height: var(--control-lg);
    border: 0;
    border-radius: var(--radius-full);
    background: var(--ink);
    color: var(--surface-raised);
    font: inherit;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
  }

  button:active {
    opacity: 0.85;
  }

  .transport {
    flex: 1;
  }

  .tap {
    min-width: 88px;
    padding: 0 var(--space-4);
    border: 1.5px solid var(--ink);
    background: var(--surface-raised);
    color: var(--ink);
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
  }

  .tap:active {
    opacity: 1;
    background: var(--surface-pressed);
  }

  button:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>
