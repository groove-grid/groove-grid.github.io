import { describe, expect, it } from 'vitest'
import {
  beatToggleRows,
  betweenBeatsLabel,
  clickChipName,
  clickLabel,
  gridChipLabel,
  meterLabel,
} from './chip-labels.ts'

describe('chip labels', () => {
  it('formats the meter', () => {
    expect(meterLabel({ beats: 4, beatUnit: 4 })).toBe('4/4')
    expect(meterLabel({ beats: 6, beatUnit: 8 })).toBe('6/8')
    expect(meterLabel({ beats: 12, beatUnit: 8 })).toBe('12/8')
  })

  it('names every grid level', () => {
    expect([1, 2, 4, 3].map((g) => gridChipLabel(g as 1 | 2 | 4 | 3))).toEqual([
      'Beats',
      '8ths',
      '16ths',
      'Triplets',
    ])
  })

  it('names the enabled beats', () => {
    const on = (beats: number, ...enabled: number[]) =>
      Array.from({ length: beats }, (_, i) => enabled.includes(i + 1))
    expect(clickLabel(on(4, 1, 2, 3, 4))).toBe('Every beat')
    expect(clickLabel(on(1, 1))).toBe('Every beat')
    expect(clickLabel(on(3, 1, 2, 3))).toBe('Every beat')
    expect(clickLabel(on(2, 1, 2))).toBe('Every beat')
    expect(clickLabel(on(3, 1, 3))).toBe('1 & 3')
    expect(clickLabel(on(5, 2, 3, 5))).toBe('2, 3 & 5')
    expect(clickLabel(on(4))).toBe('No beats')
    expect(clickLabel(on(4, 1))).toBe('Beat 1 only')
    expect(clickLabel(on(4, 3))).toBe('Beat 3 only')
    expect(clickLabel(on(4, 2, 4))).toBe('2 & 4')
    expect(clickLabel(on(4, 1, 2, 4))).toBe('1, 2 & 4')
    expect(clickLabel(on(7, 1, 2, 3, 5, 6))).toBe('5 of 7 beats')
    expect(clickLabel(on(12, 1, 4, 7, 10))).toBe('4 of 12 beats')
  })

  it('wraps beat toggles at 7 per row, balanced, extra in the top row', () => {
    expect(beatToggleRows(1)).toEqual([[1]])
    expect(beatToggleRows(7)).toEqual([[1, 2, 3, 4, 5, 6, 7]])
    expect(beatToggleRows(8).map((r) => r.length)).toEqual([4, 4])
    expect(beatToggleRows(9)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9],
    ])
    expect(beatToggleRows(14).map((r) => r.length)).toEqual([7, 7])
    expect(beatToggleRows(15).map((r) => r.length)).toEqual([5, 5, 5])
    expect(beatToggleRows(16).map((r) => r.length)).toEqual([6, 5, 5])
  })
})

describe('between beats labels', () => {
  it('names each division, with None instead of the grid label Beats', () => {
    expect(([1, 2, 4, 3] as const).map(betweenBeatsLabel)).toEqual([
      'None',
      '8ths',
      '16ths',
      'Triplets',
    ])
  })

  it('adds the between-beats setting to the accessible name only', () => {
    const beats = [true, false, true, false]
    expect(clickChipName(beats, 1)).toBe('Click, 1 & 3, between beats none')
    expect(clickChipName(beats, 2)).toBe('Click, 1 & 3, between beats 8ths')
    expect(clickChipName(beats, 4)).toBe('Click, 1 & 3, between beats 16ths')
    expect(clickChipName(beats, 3)).toBe('Click, 1 & 3, between beats triplets')
    expect(clickLabel(beats)).toBe('1 & 3')
  })
})
