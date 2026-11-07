import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CLICK_SOUND_IDS, type ClickSoundId } from '../src/core/constants.ts'

export const SAMPLE_RATE = 44100

export type ClickVariant = 'accent' | 'normal'

/** Beat 1 plays every partial this much higher, so it is distinguishable by pitch alone. */
const ACCENT_RATIO = 1.5

/** Samples of linear fade at the end, so the cut does not pop. */
const FADE_SAMPLES = 64

const PEAK = 0.9

interface Partial {
  /** Hz for the normal variant. */
  frequency: number
  amplitude: number
  /** Exponential decay rate in 1/s. */
  decay: number
}

interface Recipe {
  /** Seconds. */
  duration: number
  partials: Partial[]
  /** High-passed noise mixed in under the partials. */
  noise?: { amplitude: number; decay: number }
}

/**
 * Every partial is a cosine, so all of them are at their maximum together at sample 0 and the
 * transient sits at the start of the file (AD-11).
 */
const RECIPES: Record<ClickSoundId, Recipe> = {
  beep: { duration: 0.03, partials: [{ frequency: 1200, amplitude: 1, decay: 150 }] },
  woodblock: {
    duration: 0.06,
    partials: [
      { frequency: 780, amplitude: 1, decay: 70 },
      { frequency: 2140, amplitude: 0.35, decay: 160 },
      { frequency: 3900, amplitude: 0.12, decay: 300 },
    ],
  },
  stick: {
    duration: 0.025,
    partials: [
      { frequency: 1900, amplitude: 1, decay: 260 },
      { frequency: 4700, amplitude: 0.55, decay: 400 },
    ],
    noise: { amplitude: 0.35, decay: 500 },
  },
  'hi-hat': {
    duration: 0.08,
    // Inharmonic metallic partials, in the spirit of the classic six-oscillator hat.
    partials: [
      { frequency: 3150, amplitude: 1, decay: 55 },
      { frequency: 4510, amplitude: 0.9, decay: 60 },
      { frequency: 5470, amplitude: 0.8, decay: 65 },
      { frequency: 6980, amplitude: 0.7, decay: 70 },
      { frequency: 7600, amplitude: 0.6, decay: 75 },
      { frequency: 9860, amplitude: 0.5, decay: 80 },
    ],
    noise: { amplitude: 0.6, decay: 60 },
  },
}

/** Deterministic noise, so the committed files can be checked against the generator. */
function noiseSource(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1
  }
}

/** Mono 16-bit PCM of one click variant, peak-normalized, with the peak in the first samples. */
export function renderClickSample(id: ClickSoundId, variant: ClickVariant): Int16Array {
  const recipe = RECIPES[id]
  const ratio = variant === 'accent' ? ACCENT_RATIO : 1
  const count = Math.round(SAMPLE_RATE * recipe.duration)
  const raw = new Float64Array(count)
  const noise = noiseSource(0x5eed)
  let previousNoise = 0
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE
    let value = 0
    for (const p of recipe.partials) {
      value +=
        p.amplitude * Math.cos(2 * Math.PI * p.frequency * ratio * t) * Math.exp(-t * p.decay)
    }
    if (recipe.noise) {
      // A first difference is a cheap high-pass: it keeps the hiss and drops the rumble.
      const white = noise()
      value +=
        recipe.noise.amplitude * ((white - previousNoise) / 2) * Math.exp(-t * recipe.noise.decay)
      previousNoise = white
    }
    raw[i] = value * Math.min(1, (count - i) / FADE_SAMPLES)
  }
  let peak = 0
  for (const value of raw) peak = Math.max(peak, Math.abs(value))
  const samples = new Int16Array(count)
  for (let i = 0; i < count; i++) samples[i] = Math.round((raw[i]! / peak) * PEAK * 32767)
  return samples
}

/** Wraps mono 16-bit PCM in a WAV container. */
export function encodeWav(samples: Int16Array): Buffer {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((value, i) => data.writeInt16LE(value, i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

export const SOUNDS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sounds')

export const VARIANTS: readonly ClickVariant[] = ['accent', 'normal']

export function sampleFileName(id: ClickSoundId, variant: ClickVariant): string {
  return `click-${id}-${variant}.wav`
}

function writeAll(): void {
  mkdirSync(SOUNDS_DIR, { recursive: true })
  for (const id of CLICK_SOUND_IDS) {
    for (const variant of VARIANTS) {
      writeFileSync(
        resolve(SOUNDS_DIR, sampleFileName(id, variant)),
        encodeWav(renderClickSample(id, variant)),
      )
    }
  }
}

// Writes only when run directly (`node scripts/make-click-samples.ts`), not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) writeAll()
