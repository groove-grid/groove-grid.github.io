import type { SpokeLevel } from '../core/grid.ts'

export const RING_WIDTH = 3
export const DOT_DIAMETER = 18
export const DOT_HALO = 2

/** Space between the canvas edge and the ring, leaving room for the beat numbers (key-practice mockup). */
export const RING_INSET = 31
/** Distance from the ring to the centre of a beat number. */
export const LABEL_OFFSET = 17
export const LABEL_SIZE = 15

export interface SpokeSpec {
  width: number
  /** Fraction of the ring radius. */
  length: number
}

export const SPOKES: Record<SpokeLevel, SpokeSpec> = {
  quarter: { width: 3, length: 0.18 },
  eighth: { width: 2, length: 0.11 },
  sixteenth: { width: 1.5, length: 0.06 },
  triplet: { width: 1.5, length: 0.08 },
}

export interface Point {
  x: number
  y: number
}

/** Ring radius in CSS px for a square canvas of `size`, leaving room for the beat numbers. */
export function ringRadius(size: number): number {
  return size / 2 - RING_INSET
}

/** Radius at which beat numbers are centred. */
export function labelRadius(size: number): number {
  return ringRadius(size) + LABEL_OFFSET
}

/** Point on the ring for `angle` (radians clockwise from 12 o'clock); writes into `out`. */
export function pointOnRing(size: number, angle: number, out: Point): Point {
  const r = ringRadius(size)
  out.x = size / 2 + Math.sin(angle) * r
  out.y = size / 2 - Math.cos(angle) * r
  return out
}
