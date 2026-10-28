import { DRAG_PX_PER_BPM, DRAG_THRESHOLD_PX } from '../core/constants.ts'

/** Tempo for a vertical drag of `dy` px (negative is up) from `startBpm`; the caller clamps. */
export function dragTempo(startBpm: number, dy: number): number {
  const distance = Math.abs(dy)
  if (distance < DRAG_THRESHOLD_PX) return startBpm
  const steps = Math.floor((distance - DRAG_THRESHOLD_PX) / DRAG_PX_PER_BPM) + 1
  return startBpm + (dy < 0 ? steps : -steps)
}

/** Pointer-driven drag. `move` reports the pointer's clientY; `setTempo` normalizes and clamps. */
export function createDragTempo(getBpm: () => number, setTempo: (bpm: number) => void) {
  let startY = 0
  let startBpm = 0
  let active = false

  return {
    begin(y: number): void {
      active = true
      startY = y
      startBpm = getBpm()
    },
    move(y: number): void {
      if (active) setTempo(dragTempo(startBpm, y - startY))
    },
    end(): void {
      active = false
    },
  }
}
