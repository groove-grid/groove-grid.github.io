import type { Division } from '../../core/settings.ts'
import type { Timeline } from '../../core/timeline.ts'

export interface Theme {
  ink: string
  inkSecondary: string
  gridEighth: string
  gridSixteenth: string
  surface: string
  surfacePulse: string
  font: string
}

/** Filled in place once per animation frame; layers must not allocate or keep it. */
export interface Frame {
  now: number
  timeline: Timeline | null
  /** Square canvas side in CSS px. */
  size: number
  dpr: number
  /** Beats in the bar playing now (the settings meter while stopped). */
  beats: number
  /** Finest visible subdivision level. */
  grid: Division
  /** `prefers-reduced-motion: reduce`: tail and pulse off, the dot still sweeps. */
  reducedMotion: boolean
  theme: Theme
}

export type Layer = (ctx: CanvasRenderingContext2D, frame: Frame) => void
