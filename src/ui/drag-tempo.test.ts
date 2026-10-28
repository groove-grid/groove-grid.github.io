import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../core/settings.ts'
import { createDragTempo, dragTempo } from './drag-tempo.ts'
import { createSettingsStore } from './settings.svelte.ts'

describe('dragTempo', () => {
  it('does nothing below the 8 px threshold', () => {
    expect(dragTempo(80, -7)).toBe(80)
    expect(dragTempo(80, 7)).toBe(80)
  })

  it('moves 1 BPM per 6 px once past the threshold, up raising tempo', () => {
    expect(dragTempo(80, -8)).toBe(81)
    expect(dragTempo(80, -14)).toBe(82)
    expect(dragTempo(80, -26)).toBe(84)
    expect(dragTempo(80, 14)).toBe(78)
  })
})

describe('drag controller', () => {
  function setup(bpm: number) {
    const store = createSettingsStore({ ...DEFAULT_SETTINGS, bpm })
    const drag = createDragTempo(
      () => store.current.bpm,
      (v) => store.setTempo(v),
    )
    return { store, drag }
  }

  it('clamps at the limits', () => {
    const { store, drag } = setup(32)
    drag.begin(0)
    drag.move(100)
    expect(store.current.bpm).toBe(30)
  })

  it('returns to the start value when reversed inside the threshold', () => {
    const { store, drag } = setup(80)
    drag.begin(100)
    drag.move(70)
    expect(store.current.bpm).toBe(84)
    drag.move(97)
    expect(store.current.bpm).toBe(80)
  })

  it('ignores moves after end (pointer cancel) and keeps the value', () => {
    const { store, drag } = setup(80)
    drag.begin(0)
    drag.move(-20)
    const kept = store.current.bpm
    drag.end()
    drag.move(-200)
    expect(store.current.bpm).toBe(kept)
  })
})
