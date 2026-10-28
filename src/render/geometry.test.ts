import { describe, expect, it } from 'vitest'
import {
  DOT_DIAMETER,
  DOT_HALO,
  LABEL_SIZE,
  SPOKES,
  labelRadius,
  pointOnRing,
  ringRadius,
} from './geometry.ts'

describe('pointOnRing', () => {
  const size = 300
  const r = ringRadius(size)
  const p = { x: 0, y: 0 }

  it("puts angle 0 at 12 o'clock", () => {
    pointOnRing(size, 0, p)
    expect(p.x).toBeCloseTo(150, 9)
    expect(p.y).toBeCloseTo(150 - r, 9)
  })

  it("goes clockwise: a quarter turn is 3 o'clock", () => {
    pointOnRing(size, Math.PI / 2, p)
    expect(p.x).toBeCloseTo(150 + r, 9)
    expect(p.y).toBeCloseTo(150, 9)
  })

  it("half a turn is 6 o'clock", () => {
    pointOnRing(size, Math.PI, p)
    expect(p.x).toBeCloseTo(150, 9)
    expect(p.y).toBeCloseTo(150 + r, 9)
  })
})

describe('spokes and labels', () => {
  it('matches the spoke table', () => {
    expect(SPOKES.quarter).toEqual({ width: 3, length: 0.18 })
    expect(SPOKES.eighth).toEqual({ width: 2, length: 0.11 })
    expect(SPOKES.sixteenth).toEqual({ width: 1.5, length: 0.06 })
    expect(SPOKES.triplet).toEqual({ width: 1.5, length: 0.08 })
  })

  it('keeps every label inside the canvas, even the widest', () => {
    for (const size of [260, 325, 358]) {
      expect(labelRadius(size) + LABEL_SIZE * 0.6).toBeLessThanOrEqual(size / 2)
    }
  })

  it('keeps the dot inside the canvas', () => {
    expect(ringRadius(260) + DOT_DIAMETER / 2 + DOT_HALO).toBeLessThanOrEqual(130)
  })
})
