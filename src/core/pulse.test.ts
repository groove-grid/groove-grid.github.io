import { describe, expect, it } from 'vitest'
import { PULSE_DECAY_MS } from './constants.ts'
import { pulseLevel } from './pulse.ts'
import { DEFAULT_SETTINGS } from './settings.ts'
import { startTimeline } from './timeline.ts'

describe('pulseLevel', () => {
  const timeline = startTimeline(DEFAULT_SETTINGS, 10)
  const bar = (60 / DEFAULT_SETTINGS.bpm) * DEFAULT_SETTINGS.beats
  const decay = PULSE_DECAY_MS / 1000

  it('is 0 while stopped and before beat 1', () => {
    expect(pulseLevel(null, 12)).toBe(0)
    expect(pulseLevel(timeline, 9.99)).toBe(0)
  })

  it('peaks at each downbeat and eases out to 0 over the decay', () => {
    expect(pulseLevel(timeline, 10)).toBe(1)
    expect(pulseLevel(timeline, 10 + bar)).toBeCloseTo(1, 6)
    const half = pulseLevel(timeline, 10 + decay / 2)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(0.5)
    expect(pulseLevel(timeline, 10 + decay + 1e-6)).toBe(0)
  })

  it('stays off on the other beats', () => {
    expect(pulseLevel(timeline, 10 + bar / 4 + 0.01)).toBe(0)
  })

  it('runs while muted, since it reads the timeline and not the click plan', () => {
    const silent = startTimeline({ ...DEFAULT_SETTINGS, clickBeats: [false, true, true, true] }, 10)
    expect(pulseLevel(silent, 10 + bar)).toBeCloseTo(1, 6)
  })
})
