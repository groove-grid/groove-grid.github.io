import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLICK_SOUND_IDS } from '../src/core/constants.ts'
import {
  encodeWav,
  renderClickSample,
  sampleFileName,
  SAMPLE_RATE,
  SOUNDS_DIR,
  VARIANTS,
} from './make-click-samples.ts'

const MAX_SAMPLES = Math.round(SAMPLE_RATE * 0.12)

/** Sign changes per second over the first 20 ms, where the click has its energy. */
function crossingRate(samples: Int16Array): number {
  const window = Math.min(samples.length, Math.round(SAMPLE_RATE * 0.02))
  let crossings = 0
  let previous = 0
  for (let i = 0; i < window; i++) {
    const sign = Math.sign(samples[i]!)
    if (sign !== 0 && previous !== 0 && sign !== previous) crossings++
    if (sign !== 0) previous = sign
  }
  return crossings / (window / SAMPLE_RATE)
}

/** Normalized correlation at zero lag over the shorter length. */
function correlation(a: Int16Array, b: Int16Array): number {
  const n = Math.min(a.length, b.length)
  let ab = 0
  let aa = 0
  let bb = 0
  for (let i = 0; i < n; i++) {
    ab += a[i]! * b[i]!
    aa += a[i]! * a[i]!
    bb += b[i]! * b[i]!
  }
  return ab / Math.sqrt(aa * bb)
}

describe.each(CLICK_SOUND_IDS)('click sample %s', (id) => {
  it.each(VARIANTS)('%s is short, with its absolute peak in the first 8 samples', (variant) => {
    const samples = renderClickSample(id, variant)
    expect(samples.length).toBeGreaterThan(0)
    expect(samples.length).toBeLessThanOrEqual(MAX_SAMPLES)
    let peakIndex = 0
    samples.forEach((v, i) => {
      if (Math.abs(v) > Math.abs(samples[peakIndex]!)) peakIndex = i
    })
    expect(peakIndex).toBeLessThan(8)
  })

  it('writes mono 16-bit PCM', () => {
    const wav = encodeWav(renderClickSample(id, 'normal'))
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(1)
    expect(wav.readUInt16LE(34)).toBe(16)
  })

  it('accent is higher in pitch than normal', () => {
    const accent = crossingRate(renderClickSample(id, 'accent'))
    const normal = crossingRate(renderClickSample(id, 'normal'))
    expect(accent).toBeGreaterThan(normal * 1.2)
  })

  it.each(VARIANTS)('committed %s file matches the generator output', (variant) => {
    const committed = readFileSync(resolve(SOUNDS_DIR, sampleFileName(id, variant)))
    const generated = encodeWav(renderClickSample(id, variant))
    // Header exact; samples within ±1, since a last-bit Math.cos/exp difference can flip a rounding.
    expect(committed.length).toBe(generated.length)
    expect(committed.subarray(0, 44).equals(generated.subarray(0, 44))).toBe(true)
    for (let i = 44; i < generated.length; i += 2) {
      expect(Math.abs(committed.readInt16LE(i) - generated.readInt16LE(i))).toBeLessThanOrEqual(1)
    }
  })
})

describe('click sounds', () => {
  it('differ from each other in both variants', () => {
    for (const variant of VARIANTS) {
      for (const [i, a] of CLICK_SOUND_IDS.entries()) {
        for (const b of CLICK_SOUND_IDS.slice(i + 1)) {
          const r = correlation(renderClickSample(a, variant), renderClickSample(b, variant))
          expect(Math.abs(r), `${a} vs ${b} (${variant})`).toBeLessThan(0.5)
        }
      }
    }
  })
})
