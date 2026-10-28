import { PPQ } from './constants.ts'
import type { Division, Settings } from './settings.ts'

export type SpokeLevel = 'quarter' | 'eighth' | 'sixteenth' | 'triplet'

type GridSettings = Pick<Settings, 'beats' | 'beatUnit' | 'grid' | 'markers'>

const DIVISION_NAMES: Record<Division, string> = {
  1: 'beats',
  2: '8ths',
  4: '16ths',
  3: 'triplets',
}

/** Level of the spoke at a bar tick on a grid whose finest visible level is `grid`. */
export function spokeLevel(tick: number, grid: Division): SpokeLevel {
  if (tick % PPQ === 0) return 'quarter'
  if (grid === 3) return 'triplet'
  if (tick % (PPQ / 2) === 0) return 'eighth'
  return 'sixteenth'
}

/** Nearest line of the finest visible level for a fraction of the bar; wraps to 0 at 12 o'clock. */
export function snap(barFraction: number, settings: GridSettings): number {
  const barTicks = settings.beats * PPQ
  const step = PPQ / settings.grid
  const fraction = ((barFraction % 1) + 1) % 1
  return (Math.round((fraction * barTicks) / step) * step) % barTicks
}

const SPOKE_NAMES: Record<number, string> = {
  [PPQ / 4]: 'e',
  [PPQ / 2]: 'and',
  [(PPQ * 3) / 4]: 'a',
  [PPQ / 3]: 'trip',
  [(PPQ * 2) / 3]: 'let',
}

/** Spoken name of a bar tick, e.g. `2`, `and of 2`, `a of 3`. Off-name ticks read `N + ticks`. */
export function tickLabel(tick: number, settings: Pick<Settings, 'beats'>): string {
  const barTicks = settings.beats * PPQ
  const into = ((tick % barTicks) + barTicks) % barTicks
  const beat = Math.floor(into / PPQ) + 1
  const rest = into % PPQ
  if (rest === 0) return String(beat)
  const name = SPOKE_NAMES[rest]
  return name ? `${name} of ${beat}` : `${beat} + ${rest}`
}

/** Accessible name of the grid canvas. */
export function gridLabel(settings: GridSettings): string {
  const head = `Grid: ${settings.beats}/${settings.beatUnit}, ${DIVISION_NAMES[settings.grid]}`
  const n = settings.markers.length
  if (n === 0) return `${head}, no markers`
  const names = settings.markers.map((t) => tickLabel(t, settings)).join(', ')
  return `${head}, ${n} ${n === 1 ? 'marker' : 'markers'}: ${names}`
}
