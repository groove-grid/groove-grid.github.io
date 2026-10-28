import { PPQ } from '../../core/constants.ts'
import { spokeLevel, type SpokeLevel } from '../../core/grid.ts'
import { LABEL_SIZE, RING_WIDTH, SPOKES, labelRadius, ringRadius } from '../geometry.ts'
import type { Frame, Layer, Theme } from './types.ts'

function spokeColor(level: SpokeLevel, theme: Theme): string {
  if (level === 'quarter') return theme.ink
  return level === 'eighth' ? theme.gridEighth : theme.gridSixteenth
}

function draw(g: CanvasRenderingContext2D, frame: Frame): void {
  const { size, beats, grid, theme } = frame
  const c = size / 2
  const r = ringRadius(size)
  const step = PPQ / grid
  const barTicks = beats * PPQ

  g.lineCap = 'butt'
  for (let tick = 0; tick < barTicks; tick += step) {
    const level = spokeLevel(tick, grid)
    const spec = SPOKES[level]
    const angle = (tick / barTicks) * Math.PI * 2
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    const inner = r * (1 - spec.length)
    g.strokeStyle = spokeColor(level, theme)
    g.lineWidth = spec.width
    g.beginPath()
    g.moveTo(c + sin * r, c - cos * r)
    g.lineTo(c + sin * inner, c - cos * inner)
    g.stroke()
  }

  g.strokeStyle = theme.ink
  g.lineWidth = RING_WIDTH
  g.beginPath()
  g.arc(c, c, r, 0, Math.PI * 2)
  g.stroke()

  g.fillStyle = theme.inkSecondary
  g.font = `600 ${LABEL_SIZE}px ${theme.font}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const lr = labelRadius(size)
  for (let beat = 0; beat < beats; beat++) {
    const angle = (beat / beats) * Math.PI * 2
    g.fillText(String(beat + 1), c + Math.sin(angle) * lr, c - Math.cos(angle) * lr)
  }
}

/** Spokes, ring and beat numbers, drawn once to an offscreen canvas and rebuilt only when an input changes. */
export function createGridLayer(): Layer {
  let cache: HTMLCanvasElement | null = null
  let size = 0
  let dpr = 0
  let beats = 0
  let grid = 0
  let ink = ''
  let inkSecondary = ''
  let gridEighth = ''
  let gridSixteenth = ''
  let font = ''
  return (ctx, frame) => {
    const { theme } = frame
    if (
      !cache ||
      frame.size !== size ||
      frame.dpr !== dpr ||
      frame.beats !== beats ||
      frame.grid !== grid ||
      theme.ink !== ink ||
      theme.inkSecondary !== inkSecondary ||
      theme.gridEighth !== gridEighth ||
      theme.gridSixteenth !== gridSixteenth ||
      theme.font !== font
    ) {
      size = frame.size
      dpr = frame.dpr
      beats = frame.beats
      grid = frame.grid
      ink = theme.ink
      inkSecondary = theme.inkSecondary
      gridEighth = theme.gridEighth
      gridSixteenth = theme.gridSixteenth
      font = theme.font
      cache ??= document.createElement('canvas')
      const px = Math.round(frame.size * frame.dpr)
      cache.width = px
      cache.height = px
      const g = cache.getContext('2d')!
      g.scale(frame.dpr, frame.dpr)
      draw(g, frame)
    }
    ctx.drawImage(cache, 0, 0, frame.size, frame.size)
  }
}
