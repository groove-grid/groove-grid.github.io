import { describe, expect, it } from 'vitest'
import { mixRgb, parseHex, withAlpha } from './color.ts'

describe('color', () => {
  it('parses long and short hex, rejects anything else', () => {
    expect(parseHex('#F0EADD')).toEqual([240, 234, 221])
    expect(parseHex(' #fff ')).toEqual([255, 255, 255])
    expect(parseHex('rgb(1 2 3)')).toBeNull()
  })

  it('blends from one color to the other', () => {
    const pulse = parseHex('#f0eadd')!
    const surface = parseHex('#f7f3ea')!
    expect(mixRgb(pulse, surface, 1)).toBe('rgb(240 234 221)')
    expect(mixRgb(pulse, surface, 0)).toBe('rgb(247 243 234)')
    expect(withAlpha(pulse, 0.45)).toBe('rgb(240 234 221 / 0.45)')
  })
})
