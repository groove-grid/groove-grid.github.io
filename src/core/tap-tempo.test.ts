import { describe, expect, it } from 'vitest'
import { createTapTempo } from './tap-tempo.ts'

describe('tap tempo', () => {
  it('changes nothing on one tap', () => {
    expect(createTapTempo().tap(1000)).toBeNull()
  })

  it('sets tempo from one interval on the second tap', () => {
    const t = createTapTempo()
    t.tap(0)
    expect(t.tap(500)).toBe(120)
  })

  it('uses only the last 4 intervals', () => {
    const t = createTapTempo()
    for (const time of [0, 500, 1000]) t.tap(time)
    t.tap(1400)
    t.tap(1800)
    // intervals 500, 500, 400, 400 -> after the 6th tap, the first 500 drops out
    expect(t.tap(2200)).toBe(Math.round(60000 / ((500 + 400 + 400 + 400) / 4)))
  })

  it('starts a fresh sequence after a pause over 2 s', () => {
    const t = createTapTempo()
    t.tap(0)
    t.tap(500)
    expect(t.tap(3000)).toBeNull()
    expect(t.tap(3500)).toBe(120)
  })

  it('clamps extremes and keeps a 2000 ms gap', () => {
    const fast = createTapTempo()
    fast.tap(0)
    expect(fast.tap(100)).toBe(250)
    const slow = createTapTempo()
    slow.tap(0)
    expect(slow.tap(2000)).toBe(30)
  })

  it('ignores taps with no elapsed time', () => {
    const t = createTapTempo()
    t.tap(10)
    expect(t.tap(10)).toBeNull()
  })

  it('reset forgets earlier taps', () => {
    const t = createTapTempo()
    t.tap(0)
    t.reset()
    expect(t.tap(500)).toBeNull()
  })
})
