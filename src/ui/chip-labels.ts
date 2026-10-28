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
