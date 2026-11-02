import { describe, expect, it, vi } from 'vitest'
import { createAudioOut } from './audio-out.ts'
import type { SampleBank } from './sample-bank.ts'

function setup() {
  const gains: { gain: { setTargetAtTime: ReturnType<typeof vi.fn> }; connect(): void }[] = []
  const ctx = {
    currentTime: 3,
    destination: {},
    createGain() {
      const node = { gain: { setTargetAtTime: vi.fn() }, connect: vi.fn() }
      gains.push(node)
      return node
    },
  }
  const out = createAudioOut(ctx as unknown as AudioContext, {} as SampleBank)
  const [click, marker, preview] = gains
  return { out, click: click!, marker: marker!, preview: preview! }
}

describe('audio out', () => {
  it('mutes and unmutes the click bus from the current audio time', () => {
    const { out, click } = setup()
    out.setClickMuted(true)
    expect(click.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 3, expect.any(Number))
    expect(click.gain.setTargetAtTime.mock.lastCall![2]).toBeLessThan(0.005)
    out.setClickMuted(false)
    expect(click.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 3, expect.any(Number))
  })

  it('never touches the marker or preview bus', () => {
    const { out, marker, preview } = setup()
    out.setClickMuted(true)
    expect(marker.gain.setTargetAtTime).not.toHaveBeenCalled()
    expect(preview.gain.setTargetAtTime).not.toHaveBeenCalled()
  })
})
