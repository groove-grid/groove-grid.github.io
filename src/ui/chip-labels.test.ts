import { describe, expect, it } from 'vitest'
import { clickLabel, gridChipLabel, meterLabel } from './chip-labels.ts'

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

  it('has a placeholder click label', () => {
    expect(clickLabel()).toBe('Every beat')
  })
})
