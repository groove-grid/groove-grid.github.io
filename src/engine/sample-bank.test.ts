import { describe, expect, it } from 'vitest'
import { CLICK_SOUND_IDS } from '../core/constants.ts'
import { BANK_IDS, clickSampleId, loadBank, sampleUrl } from './sample-bank.ts'

describe('sample bank ids', () => {
  it('builds URLs from the base path', () => {
    expect(sampleUrl('click-beep-accent', '/')).toBe('/sounds/click-beep-accent.wav')
    expect(sampleUrl('click-beep-accent', '/app/')).toBe('/app/sounds/click-beep-accent.wav')
  })

  it('accent uses the accent sample; beat and sub use the normal one', () => {
    expect(clickSampleId('beep', 'accent')).toBe('click-beep-accent')
    expect(clickSampleId('beep', 'beat')).toBe('click-beep-normal')
    expect(clickSampleId('beep', 'sub')).toBe('click-beep-normal')
  })

  it('banks both variants of every click sound', () => {
    expect(BANK_IDS).toEqual([
      'click-beep-accent',
      'click-beep-normal',
      'click-woodblock-accent',
      'click-woodblock-normal',
      'click-stick-accent',
      'click-stick-normal',
      'click-hi-hat-accent',
      'click-hi-hat-normal',
    ])
    for (const sound of CLICK_SOUND_IDS) {
      expect(BANK_IDS).toContain(clickSampleId(sound, 'accent'))
      expect(BANK_IDS).toContain(clickSampleId(sound, 'sub'))
    }
  })

  it('loads and decodes every banked sample by default', async () => {
    const fetched: string[] = []
    const fetchFn = (async (url: string) => {
      fetched.push(url)
      return new Response(new ArrayBuffer(4))
    }) as unknown as typeof fetch
    const ctx = {
      decodeAudioData: async () => ({}) as AudioBuffer,
    } as unknown as BaseAudioContext
    const bank = await loadBank(ctx, undefined, fetchFn)
    expect([...bank.keys()]).toEqual(BANK_IDS)
    expect(fetched).toEqual(BANK_IDS.map((id) => sampleUrl(id)))
  })
})
