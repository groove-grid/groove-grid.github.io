import type { ClickSoundId, MarkerSoundId } from '../core/constants.ts'
import type { Division, Settings } from '../core/settings.ts'

const GRID_LABELS: Record<Division, string> = { 1: 'Beats', 2: '8ths', 4: '16ths', 3: 'Triplets' }

export function meterLabel(settings: Pick<Settings, 'beats' | 'beatUnit'>): string {
  return `${settings.beats}/${settings.beatUnit}`
}

export function gridChipLabel(grid: Division): string {
  return GRID_LABELS[grid]
}

/** Names the enabled beats: `Every beat`, `No beats`, `Beat n only`, `2 & 4`, `1, 2 & 4` or `n of m beats` (UX-DR12). */
export function clickLabel(clickBeats: readonly boolean[]): string {
  const on = clickBeats.flatMap((enabled, i) => (enabled ? [i + 1] : []))
  if (on.length === clickBeats.length) return 'Every beat'
  if (on.length === 0) return 'No beats'
  if (on.length === 1) return `Beat ${on[0]} only`
  if (on.length <= 3) return `${on.slice(0, -1).join(', ')} & ${on[on.length - 1]}`
  return `${on.length} of ${clickBeats.length} beats`
}

export function betweenBeatsLabel(betweenBeats: Division): string {
  return betweenBeats === 1 ? 'None' : GRID_LABELS[betweenBeats]
}

const CLICK_SOUND_LABELS: Record<ClickSoundId, string> = {
  beep: 'Beep',
  woodblock: 'Woodblock',
  stick: 'Stick',
  'hi-hat': 'Hi-hat',
}

const MARKER_SOUND_LABELS: Record<MarkerSoundId, string> = {
  clap: 'Clap',
  cowbell: 'Cowbell',
  conga: 'Conga',
}

export function clickSoundLabel(sound: ClickSoundId): string {
  return CLICK_SOUND_LABELS[sound]
}

export function markerSoundLabel(sound: MarkerSoundId): string {
  return MARKER_SOUND_LABELS[sound]
}

/** The Sounds row summary: `Beep · markers off`, `Woodblock · Cowbell markers`. */
export function soundsSummary(
  clickSound: ClickSoundId,
  markerSound: MarkerSoundId | null,
  separator = ' · ',
): string {
  const markers = markerSound ? `${markerSoundLabel(markerSound)} markers` : 'markers off'
  return `${clickSoundLabel(clickSound)}${separator}${markers}`
}

/** Accessible name of the Sounds row: `Sounds: Woodblock, Cowbell markers`. */
export function soundsRowName(clickSound: ClickSoundId, markerSound: MarkerSoundId | null): string {
  return `Sounds: ${soundsSummary(clickSound, markerSound, ', ')}`
}

/** The chip shows only the beats; the sound and between-beats setting are in its accessible name. */
export function clickChipName(
  clickSound: ClickSoundId,
  clickBeats: readonly boolean[],
  betweenBeats: Division,
): string {
  const between = betweenBeatsLabel(betweenBeats).toLowerCase()
  return `Click, ${clickSoundLabel(clickSound)}, ${clickLabel(clickBeats)}, between beats ${between}`
}

const BEAT_TOGGLES_PER_ROW = 7

/** Splits beats 1…n into balanced rows of at most 7, extra toggles in the top rows. */
export function beatToggleRows(beats: number): number[][] {
  const rows = Math.ceil(beats / BEAT_TOGGLES_PER_ROW)
  const result: number[][] = []
  let next = 1
  for (let r = 0; r < rows; r++) {
    const size = Math.floor(beats / rows) + (r < beats % rows ? 1 : 0)
    result.push(Array.from({ length: size }, (_, i) => next + i))
    next += size
  }
  return result
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
