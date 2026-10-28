import { describe, expect, it } from 'vitest'
import { gridLabel, snap, spokeLevel, tickLabel } from './grid.ts'
import type { Division } from './settings.ts'

const meter = (beats: number, beatUnit: 4 | 8 = 4, grid: Division = 4, markers: number[] = []) => ({
  beats,
  beatUnit,
  grid,
  markers,
})

describe('snap', () => {
  it('wraps near the end of the bar to 0', () => {
    expect(snap(0.999, meter(4))).toBe(0)
  })
  it('lands on the nearest 16th', () => {
    expect(snap(0.125, meter(4))).toBe(480)
  })
  it('lands on beats at the Beats level', () => {
    expect(snap(0.6, meter(4, 4, 1))).toBe(1920)
  })
  it('uses the bar length of the meter', () => {
    expect(snap(0.5, meter(3, 4, 1))).toBe(1920) // 1.5 beats rounds up to beat 3
    expect(snap(0.5, meter(7, 8, 2))).toBe(3360)
    expect(snap(0.999, meter(16))).toBe(0)
    expect(snap(0.5, meter(16))).toBe(7680)
  })
  it('snaps to triplets', () => {
    expect(snap(0.1, meter(4, 4, 3))).toBe(320 * 1) // 384 ticks -> 320
  })
  it('wraps negative fractions', () => {
    expect(snap(-0.01, meter(4))).toBe(0)
  })
})

describe('tickLabel', () => {
  const s = meter(4)
  it('names beats, 8ths and 16ths', () => {
    expect(tickLabel(0, s)).toBe('1')
    expect(tickLabel(960, s)).toBe('2')
    expect(tickLabel(1200, s)).toBe('e of 2')
    expect(tickLabel(1440, s)).toBe('and of 2')
    expect(tickLabel(1680, s)).toBe('a of 2')
  })
  it('names triplets', () => {
    expect(tickLabel(960 * 2 + 320, s)).toBe('trip of 3')
    expect(tickLabel(960 * 2 + 640, s)).toBe('let of 3')
  })
  it('never throws on off-name ticks', () => {
    expect(tickLabel(1000, s)).toBe('2 + 40')
  })
  it('handles 3/4, 7/8 and 16 beats', () => {
    expect(tickLabel(960 * 2 + 480, meter(3))).toBe('and of 3')
    expect(tickLabel(960 * 6, meter(7, 8))).toBe('7')
    expect(tickLabel(960 * 15 + 720, meter(16))).toBe('a of 16')
  })
})

describe('spokeLevel', () => {
  it('ranks levels per grid', () => {
    expect(spokeLevel(0, 4)).toBe('quarter')
    expect(spokeLevel(480, 2)).toBe('eighth')
    expect(spokeLevel(480, 4)).toBe('eighth')
    expect(spokeLevel(240, 4)).toBe('sixteenth')
    expect(spokeLevel(320, 3)).toBe('triplet')
  })
})

describe('gridLabel', () => {
  it('reads no markers', () => {
    expect(gridLabel(meter(4))).toBe('Grid: 4/4, 16ths, no markers')
  })
  it('lists markers', () => {
    expect(gridLabel(meter(4, 4, 4, [0, 1440, 2640]))).toBe(
      'Grid: 4/4, 16ths, 3 markers: 1, and of 2, a of 3',
    )
    expect(gridLabel(meter(7, 8, 1, [960]))).toBe('Grid: 7/8, beats, 1 marker: 2')
  })
  it('names the other levels', () => {
    expect(gridLabel(meter(3, 4, 3))).toBe('Grid: 3/4, triplets, no markers')
    expect(gridLabel(meter(16, 4, 2))).toBe('Grid: 16/4, 8ths, no markers')
  })
})
