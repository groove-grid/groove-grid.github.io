import { PULSE_DECAY_MS } from './constants.ts'
import { lastDownbeatTime, type Timeline } from './timeline.ts'

/**
 * Beat-1 pulse strength at audio time `now`: 1 at a downbeat, easing out to 0 over `PULSE_DECAY_MS`;
 * 0 while stopped or before beat 1. Derived from the timeline, so it runs while muted too.
 */
export function pulseLevel(timeline: Timeline | null, now: number): number {
  const downbeat = timeline && lastDownbeatTime(timeline, now)
  if (downbeat === null) return 0
  const p = ((now - downbeat) * 1000) / PULSE_DECAY_MS
  if (p >= 1) return 0
  // Ease-out: fast departure from the peak, slow settle onto the surface.
  return (1 - p) ** 3
}
