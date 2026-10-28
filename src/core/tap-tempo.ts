import { BPM_MAX, BPM_MIN, TAP_MAX_INTERVALS, TAP_RESET_MS } from './constants.ts'

/**
 * Tap tempo from tap times in milliseconds. `tap` returns the tempo once there are two taps,
 * otherwise null. A pause longer than `TAP_RESET_MS` starts a fresh sequence.
 */
export function createTapTempo() {
  let taps: number[] = []

  return {
    tap(timeMs: number): number | null {
      const last = taps[taps.length - 1]
      if (last !== undefined && timeMs - last > TAP_RESET_MS) taps = []
      taps = [...taps, timeMs].slice(-(TAP_MAX_INTERVALS + 1))
      if (taps.length < 2) return null
      const mean = (timeMs - taps[0]!) / (taps.length - 1)
      if (!(mean > 0)) return null
      return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(60000 / mean)))
    },
    reset(): void {
      taps = []
    },
  }
}
