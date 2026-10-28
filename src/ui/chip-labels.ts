import type { Division, Settings } from '../core/settings.ts'

const GRID_LABELS: Record<Division, string> = { 1: 'Beats', 2: '8ths', 4: '16ths', 3: 'Triplets' }

export function meterLabel(settings: Pick<Settings, 'beats' | 'beatUnit'>): string {
  return `${settings.beats}/${settings.beatUnit}`
}

export function gridChipLabel(grid: Division): string {
  return GRID_LABELS[grid]
}

/** Placeholder until the Click sheet (Epic 3) derives it from the beat toggles. */
export function clickLabel(): string {
  return 'Every beat'
}

export const METER_PRESETS: readonly { beats: number; beatUnit: 4 | 8 }[] = [
  { beats: 2, beatUnit: 4 },
  { beats: 3, beatUnit: 4 },
  { beats: 4, beatUnit: 4 },
  { beats: 5, beatUnit: 4 },
  { beats: 6, beatUnit: 8 },
  { beats: 7, beatUnit: 8 },
  { beats: 12, beatUnit: 8 },
]
