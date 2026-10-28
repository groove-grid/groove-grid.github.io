import { PPQ } from './constants.ts'
import { positionAt, segmentAt, type Timeline } from './timeline.ts'

/** Dot angle in radians, clockwise from 12 o'clock; 0 when stopped or before beat 1. */
export function dotAngle(timeline: Timeline | null, now: number): number {
  const segment = timeline && segmentAt(timeline, now)
  if (!timeline || !segment) return 0
  const barTicks = segment.metric.beats * PPQ
  return (positionAt(timeline, now) / barTicks) * 2 * Math.PI
}
