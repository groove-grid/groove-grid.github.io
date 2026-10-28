import type { ClockReader } from '../core/ports.ts'
import type { Division } from '../core/settings.ts'
import { pulseLevel } from '../core/pulse.ts'
import { segmentAt } from '../core/timeline.ts'
import { mixRgb, parseHex, type Rgb } from './color.ts'
import { createDotLayer } from './layers/dot.ts'
import { createGridLayer } from './layers/grid.ts'
import { createTailLayer } from './layers/tail.ts'
import type { Frame, Layer } from './layers/types.ts'

/** What the grid shows when no timeline is playing; the grid level always comes from here. */
export interface GridView {
  beats: number
  grid: Division
}

/**
 * Mounts the one animation loop on `canvas` (AD-9). Sizing follows the canvas's CSS box and the
 * screen's pixel density. The loop is the only writer of `--pulse` on the root element, the page
 * background during the beat-1 pulse. Returns a dispose function.
 */
export function mount(
  canvas: HTMLCanvasElement,
  clock: ClockReader,
  onFrame?: (timeMs: number) => void,
  view: () => GridView = () => ({ beats: 4, grid: 4 }),
): () => void {
  const ctx = canvas.getContext('2d')!
  const layers: Layer[] = [createGridLayer(), createTailLayer(), createDotLayer()]
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const root = document.documentElement
  const frame: Frame = {
    now: 0,
    timeline: null,
    size: 0,
    dpr: 1,
    beats: 4,
    grid: 4,
    reducedMotion: false,
    theme: {
      ink: '#000',
      inkSecondary: '#555',
      gridEighth: '#444',
      gridSixteenth: '#777',
      surface: '#fff',
      surfacePulse: '#eee',
      font: 'sans-serif',
    },
  }

  function readTheme(): void {
    const style = getComputedStyle(document.documentElement)
    frame.theme.ink = style.getPropertyValue('--ink').trim() || frame.theme.ink
    frame.theme.surface = style.getPropertyValue('--surface').trim() || frame.theme.surface
    const t = frame.theme
    t.inkSecondary = style.getPropertyValue('--ink-secondary').trim() || t.inkSecondary
    t.gridEighth = style.getPropertyValue('--grid-eighth').trim() || t.gridEighth
    t.gridSixteenth = style.getPropertyValue('--grid-sixteenth').trim() || t.gridSixteenth
    t.font = style.getPropertyValue('--font').trim() || t.font
    t.surfacePulse = style.getPropertyValue('--surface-pulse').trim() || t.surfacePulse
    pulseFrom = parseHex(t.surfacePulse)
    pulseTo = parseHex(t.surface)
  }

  // Both ends are tokens at or above luminance 0.80, so every blend between them is too (DESIGN flash safety).
  let pulseFrom: Rgb | null = null
  let pulseTo: Rgb | null = null
  let pulse = ''
  function writePulse(): void {
    const level = frame.reducedMotion ? 0 : pulseLevel(frame.timeline, frame.now)
    const value =
      level > 0 && pulseFrom && pulseTo ? mixRgb(pulseFrom, pulseTo, level) : 'var(--surface)'
    if (value === pulse) return
    pulse = value
    root.style.setProperty('--pulse', value)
  }

  function resize(): void {
    const size = canvas.clientWidth
    const dpr = window.devicePixelRatio || 1
    if (size === frame.size && dpr === frame.dpr) return
    frame.size = size
    frame.dpr = dpr
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
  }

  readTheme()
  let raf = 0
  function tick(timeMs: number): void {
    onFrame?.(timeMs)
    resize()
    if (frame.size > 0) {
      frame.now = clock.now()
      frame.timeline = clock.timeline()
      frame.reducedMotion = reducedMotion.matches
      writePulse()
      const shown = view()
      const segment = frame.timeline && segmentAt(frame.timeline, frame.now)
      frame.beats = segment ? segment.metric.beats : shown.beats
      frame.grid = shown.grid
      ctx.setTransform(frame.dpr, 0, 0, frame.dpr, 0, 0)
      ctx.clearRect(0, 0, frame.size, frame.size)
      for (const layer of layers) layer(ctx, frame)
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(raf)
    root.style.removeProperty('--pulse')
  }
}
