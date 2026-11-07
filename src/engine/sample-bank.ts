import type { ClickLevel } from '../core/timeline.ts'
import { CLICK_SOUND_IDS, type ClickSoundId } from '../core/constants.ts'

export type SampleBank = ReadonlyMap<string, AudioBuffer>

/** Accent and normal variant of every click sound (AD-11). */
export const BANK_IDS: readonly string[] = CLICK_SOUND_IDS.flatMap((sound) => [
  clickSampleId(sound, 'accent'),
  clickSampleId(sound, 'beat'),
])

/** One URL builder for every sample, derived from the deploy base path. */
export function sampleUrl(id: string, base: string = import.meta.env.BASE_URL): string {
  return `${base}sounds/${id}.wav`
}

export function clickSampleId(sound: ClickSoundId, level: ClickLevel): string {
  return `click-${sound}-${level === 'accent' ? 'accent' : 'normal'}`
}

export async function loadBank(
  ctx: BaseAudioContext,
  ids: readonly string[] = BANK_IDS,
  fetchFn: typeof fetch = fetch,
): Promise<SampleBank> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const response = await fetchFn(sampleUrl(id))
      if (!response.ok) throw new Error(`sample ${id}: HTTP ${response.status}`)
      return [id, await ctx.decodeAudioData(await response.arrayBuffer())] as const
    }),
  )
  return new Map(entries)
}
