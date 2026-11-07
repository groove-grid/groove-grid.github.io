import { describe, expect, it, vi } from 'vitest'
import { START_LEAD, WAKEUP_INTERVAL } from '../core/constants.ts'
import { DEFAULT_SETTINGS } from '../core/settings.ts'
import { createFakeClock, createFakeOut, createFakeWakeup } from './fakes.ts'
import type { PausedReason } from '../core/ports.ts'
import { createScheduler } from './scheduler.ts'

function setup(overrides: { resume?: () => Promise<void>; ready?: Promise<unknown> } = {}) {
  let pauseListener: (reason: PausedReason) => void = () => {}
  const order: string[] = []
  const out = createFakeOut()
  const wakeup = createFakeWakeup()
  const clock = createFakeClock(10)
  const resume = vi.fn(() => {
    order.push('resume')
    return (overrides.resume ?? (() => Promise.resolve()))()
  })
  const recreate = vi.fn(() => {
    order.push('recreate')
    return Promise.resolve()
  })
  const scheduler = createScheduler({
    out,
    wakeup,
    now: clock.now,
    resume,
    ready: overrides.ready ?? Promise.resolve(),
    recreate,
    onSystemPause: (listener) => {
      pauseListener = listener
      return () => {}
    },
    audioSessionSupported: true,
    resumeTimeoutMs: 1000,
  })
  /** Runs wake-ups on the worker cadence for `seconds` of audio time. */
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += WAKEUP_INTERVAL) {
      clock.advance(WAKEUP_INTERVAL)
      wakeup.wake()
    }
  }
  return {
    out,
    wakeup,
    clock,
    resume,
    recreate,
    order,
    scheduler,
    run,
    pause: pauseListener,
    system: (r: PausedReason) => pauseListener(r),
  }
}

const secondsPerBeat = 60 / DEFAULT_SETTINGS.bpm

describe('scheduler', () => {
  it('start calls resume synchronously, then plays beat 1 at now + START_LEAD', async () => {
    const { scheduler, resume, out, run } = setup()
    const started = scheduler.start(DEFAULT_SETTINGS)
    expect(resume).toHaveBeenCalledTimes(1)
    expect(scheduler.status).toBe('stopped')
    await started
    expect(scheduler.status).toBe('playing')
    run(WAKEUP_INTERVAL)
    expect(out.played[0]).toMatchObject({
      sampleId: 'click-beep-accent',
      time: 10 + START_LEAD,
      bus: 'click',
    })
  })

  it('accents beat 1 only and plays the other beats with the normal sample at closed-form times', async () => {
    const { scheduler, out, run } = setup()
    await scheduler.start(DEFAULT_SETTINGS)
    run(8 * secondsPerBeat)
    const ids = out.played.map((p) => p.sampleId)
    expect(ids.slice(0, 8)).toEqual([
      'click-beep-accent',
      'click-beep-normal',
      'click-beep-normal',
      'click-beep-normal',
      'click-beep-accent',
      'click-beep-normal',
      'click-beep-normal',
      'click-beep-normal',
    ])
    out.played.slice(0, 8).forEach((p, n) => {
      expect(p.time).toBeCloseTo(10 + START_LEAD + n * secondsPerBeat, 9)
    })
    expect(scheduler.skipped).toBe(0)
  })

  it('exposes the playing timeline and clears it on stop', async () => {
    const { scheduler } = setup()
    expect(scheduler.timeline).toBeNull()
    await scheduler.start(DEFAULT_SETTINGS)
    expect(scheduler.timeline?.segments[0]?.startTime).toBe(10 + START_LEAD)
    scheduler.stop()
    expect(scheduler.timeline).toBeNull()
  })

  it('waits for the sample bank before starting', async () => {
    let release!: () => void
    const ready = new Promise<void>((resolve) => (release = resolve))
    const { scheduler, wakeup } = setup({ ready })
    const started = scheduler.start(DEFAULT_SETTINGS)
    await Promise.resolve()
    expect(scheduler.status).toBe('stopped')
    expect(wakeup.running).toBe(false)
    release()
    await started
    expect(scheduler.status).toBe('playing')
  })

  it('stays stopped and warns when the bank fails to decode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { scheduler } = setup({ ready: Promise.reject(new Error('decode')) })
    await scheduler.start(DEFAULT_SETTINGS)
    expect(scheduler.status).toBe('stopped')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('stop cancels scheduled nodes, halts the wake-up and silences later wake-ups', async () => {
    const { scheduler, out, wakeup, run } = setup()
    await scheduler.start(DEFAULT_SETTINGS)
    scheduler.stop()
    expect(scheduler.status).toBe('stopped')
    expect(out.cancelled).toBe(1)
    expect(wakeup.running).toBe(false)
    run(1)
    expect(out.played).toHaveLength(0)
  })

  it('skips and counts an event whose time already passed', async () => {
    const { scheduler, out, clock, wakeup } = setup()
    await scheduler.start(DEFAULT_SETTINGS)
    out.played.length = 0
    clock.advance(3 * secondsPerBeat)
    wakeup.wake()
    expect(scheduler.skipped).toBeGreaterThan(0)
    expect(out.played.every((p) => p.time >= clock.now())).toBe(true)
  })

  it('restart begins again from beat 1 at the new time', async () => {
    const { scheduler, out, clock, run } = setup()
    await scheduler.start(DEFAULT_SETTINGS)
    run(2)
    scheduler.stop()
    clock.advance(5)
    await scheduler.start(DEFAULT_SETTINGS)
    const startTime = clock.now() + START_LEAD
    run(WAKEUP_INTERVAL)
    expect(out.played[0]).toMatchObject({
      sampleId: 'click-beep-accent',
      time: startTime,
    })
  })

  it('ignores start while playing or already starting', async () => {
    const { scheduler, resume } = setup()
    const first = scheduler.start(DEFAULT_SETTINGS)
    void scheduler.start(DEFAULT_SETTINGS)
    await first
    await scheduler.start(DEFAULT_SETTINGS)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('stop during a pending start prevents playback', async () => {
    const { scheduler, wakeup } = setup()
    const started = scheduler.start(DEFAULT_SETTINGS)
    scheduler.stop()
    await started
    expect(scheduler.status).toBe('stopped')
    expect(wakeup.running).toBe(false)
  })

  it('notifies subscribers on status change', async () => {
    const { scheduler } = setup()
    const listener = vi.fn()
    scheduler.subscribe(listener)
    await scheduler.start(DEFAULT_SETTINGS)
    scheduler.stop()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  describe('platform lifecycle', () => {
    it.each(['hidden', 'interrupted'] as const)(
      'stops on %s and does not resume by itself',
      async (reason) => {
        const { scheduler, out, wakeup, system, run, resume } = setup()
        await scheduler.start(DEFAULT_SETTINGS)
        system(reason)
        expect(scheduler.status).toBe('paused-by-system')
        expect(scheduler.pausedReason).toBe(reason)
        expect(scheduler.timeline).toBeNull()
        expect(wakeup.running).toBe(false)
        expect(out.cancelled).toBe(1)
        run(1)
        expect(out.played).toHaveLength(0)
        expect(resume).toHaveBeenCalledTimes(1)
      },
    )

    it('ignores system pauses while not playing', () => {
      const { scheduler, system } = setup()
      system('hidden')
      expect(scheduler.status).toBe('stopped')
      expect(scheduler.pausedReason).toBeNull()
    })

    it('treats a resume that never settles as resume-failed after the timeout', async () => {
      vi.useFakeTimers()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { scheduler, wakeup } = setup({ resume: () => new Promise(() => {}) })
      const started = scheduler.start(DEFAULT_SETTINGS)
      await vi.advanceTimersByTimeAsync(1000)
      await started
      expect(scheduler.status).toBe('paused-by-system')
      expect(scheduler.pausedReason).toBe('resume-failed')
      expect(wakeup.running).toBe(false)
      expect(scheduler.timeline).toBeNull()
      warn.mockRestore()
      vi.useRealTimers()
    })

    it('treats a rejected or throwing resume as resume-failed without throwing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      for (const resume of [
        () => Promise.reject(new Error('no')),
        () => {
          throw new Error('closed')
        },
      ]) {
        const { scheduler } = setup({ resume })
        await scheduler.start(DEFAULT_SETTINGS)
        expect(scheduler.pausedReason).toBe('resume-failed')
      }
      warn.mockRestore()
    })

    it('recreates before resuming on Start after a pause, then plays from beat 1', async () => {
      const { scheduler, order, out, run, system } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      system('interrupted')
      order.length = 0
      const started = scheduler.start(DEFAULT_SETTINGS)
      expect(order).toEqual(['recreate', 'resume'])
      await started
      expect(scheduler.status).toBe('playing')
      expect(scheduler.pausedReason).toBeNull()
      run(WAKEUP_INTERVAL)
      expect(out.played[0]?.sampleId).toBe('click-beep-accent')
    })

    it('does not recreate on a normal Start, and stop clears the reason', async () => {
      const { scheduler, recreate, system } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      expect(recreate).not.toHaveBeenCalled()
      system('hidden')
      scheduler.stop()
      expect(scheduler.status).toBe('stopped')
      expect(scheduler.pausedReason).toBeNull()
    })

    it('rebuilds on the next Start after a bank failure', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { scheduler, recreate } = setup({ ready: Promise.reject(new Error('decode')) })
      await scheduler.start(DEFAULT_SETTINGS)
      expect(scheduler.status).toBe('stopped')
      await scheduler.start(DEFAULT_SETTINGS)
      expect(recreate).toHaveBeenCalledTimes(1)
      expect(scheduler.status).toBe('playing')
      warn.mockRestore()
    })
  })

  describe('apply while playing', () => {
    const at = (bpm: number) => ({ ...DEFAULT_SETTINGS, bpm })
    const spb = (bpm: number) => 60 / bpm

    it('keeps the old tempo up to the beat boundary, then switches with no skipped or doubled click', async () => {
      const { scheduler, out, clock, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      run(spb(80) * 1.5)
      scheduler.apply(at(120))
      run(5)
      const beats = out.played.map((p) => p.time)
      const startTime = 10 + START_LEAD
      const boundary = scheduler.timeline!.segments[1]!
      expect(boundary.startTick % 960).toBe(0)
      expect(boundary.startTime).toBeCloseTo(startTime + (boundary.startTick / 960) * spb(80), 9)
      beats.forEach((time, n) => {
        const expected =
          n <= boundary.startTick / 960
            ? startTime + n * spb(80)
            : boundary.startTime + (n - boundary.startTick / 960) * spb(120)
        expect(time).toBeCloseTo(expected, 9)
      })
      expect(scheduler.skipped).toBe(0)
      expect(clock.now()).toBeGreaterThan(boundary.startTime)
    })

    it('reports pending with changed keys and clears it when the switch time passes', async () => {
      const { scheduler, clock, run } = setup()
      const seen: (string[] | null)[] = []
      scheduler.subscribe(() => seen.push(scheduler.pending ? scheduler.pending.changed : null))
      await scheduler.start(DEFAULT_SETTINGS)
      seen.length = 0
      run(spb(80) * 1.5)
      scheduler.apply(at(120))
      const pending = scheduler.pending!
      expect(pending.changed).toEqual(['bpm'])
      expect(pending.settings.bpm).toBe(120)
      expect(pending.atTime).toBe(scheduler.timeline!.segments[1]!.startTime)
      expect(pending.atTime).toBeGreaterThan(clock.now())
      run(pending.atTime - clock.now() + WAKEUP_INTERVAL)
      expect(scheduler.pending).toBeNull()
      expect(seen).toEqual([['bpm'], null])
    })

    it('collapses rapid changes to one future segment and the latest value', async () => {
      const { scheduler, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      run(spb(80) * 1.5)
      for (const bpm of [90, 100, 110]) scheduler.apply(at(bpm))
      expect(scheduler.timeline!.segments).toHaveLength(2)
      expect(scheduler.pending?.settings.bpm).toBe(110)
    })

    it('leaves nothing pending when the change is undone before the boundary', async () => {
      const { scheduler, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      run(spb(80) * 1.5)
      scheduler.apply(at(120))
      scheduler.apply(DEFAULT_SETTINGS)
      expect(scheduler.pending).toBeNull()
      expect(scheduler.timeline!.segments).toHaveLength(1)
    })

    it('has no pending change for a tempo applied during the start lead', async () => {
      const { scheduler, out, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      scheduler.apply(at(120))
      expect(scheduler.pending).toBeNull()
      expect(scheduler.timeline!.segments).toHaveLength(1)
      run(spb(120) * 2)
      expect(out.played[1]!.time - out.played[0]!.time).toBeCloseTo(spb(120), 9)
    })

    it('clears pending on stop', async () => {
      const { scheduler, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      run(spb(80) * 1.5)
      scheduler.apply(at(120))
      scheduler.stop()
      expect(scheduler.pending).toBeNull()
    })

    it('applies beat toggles from the next beat, never cancels scheduled clicks, and drops the accent with beat 1', async () => {
      const { scheduler, out, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      run(spb(80) * 1.5)
      const scheduled = out.played.length
      scheduler.apply({ ...DEFAULT_SETTINGS, clickBeats: [false, true, false, true] })
      expect(scheduler.pending!.changed).toEqual(['clickBeats'])
      run(spb(80) * 8)
      const boundary = scheduler.timeline!.segments[1]!.startTick / 960
      expect(boundary).toBe(scheduled)
      // `+ 0` turns -0 into 0 so toEqual matches.
      const beatsPlayed = out.played.map(
        (p) => Math.round((p.time - 10 - START_LEAD) / spb(80)) + 0,
      )
      const before = Array.from({ length: boundary }, (_, n) => n)
      expect(beatsPlayed.slice(0, boundary)).toEqual(before)
      expect(out.played[0]!.sampleId).toBe('click-beep-accent')
      const after = beatsPlayed.slice(boundary)
      expect(after.length).toBeGreaterThan(2)
      expect(after.every((n) => n >= boundary && n % 4 !== 0 && n % 4 !== 2)).toBe(true)
      expect(out.played.slice(boundary).every((p) => p.sampleId === 'click-beep-normal')).toBe(true)
      expect(out.cancelled).toBe(0)
    })

    it('applies between beats from the next beat, softer than beats, without cancelling', async () => {
      const { scheduler, out, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      run(spb(80) * 1.5)
      const scheduled = out.played.length
      scheduler.apply({ ...DEFAULT_SETTINGS, betweenBeats: 2 })
      expect(scheduler.pending!.changed).toEqual(['betweenBeats'])
      run(spb(80) * 8)
      // `+ 0` turns -0 into 0 so toEqual matches.
      const eighths = out.played.map(
        (p) => Math.round((p.time - 10 - START_LEAD) / (spb(80) / 2)) + 0,
      )
      const before = Array.from({ length: scheduled }, (_, n) => 2 * n)
      expect(eighths.slice(0, scheduled)).toEqual(before)
      const boundary = 2 * scheduled
      expect(eighths.slice(scheduled, scheduled + 3)).toEqual([
        boundary,
        boundary + 1,
        boundary + 2,
      ])
      const accent = out.played[0]!
      const sub = out.played[scheduled + 1]!
      const beat = out.played[scheduled + 2]!
      expect(sub.sampleId).toBe('click-beep-normal')
      expect(accent.gain).toBeGreaterThan(beat.gain)
      expect(beat.gain).toBeGreaterThan(sub.gain)
      expect(out.cancelled).toBe(0)
    })

    it('takes the click sound from the segment each click falls in, from the next beat', async () => {
      // 16ths, so clicks handed out after the change can still fall before the beat boundary.
      const sixteenths = { ...DEFAULT_SETTINGS, betweenBeats: 4 as const }
      const { scheduler, out, run } = setup()
      await scheduler.start(sixteenths)
      run(spb(80) * 1.3)
      const scheduled = out.played.length
      scheduler.apply({ ...sixteenths, clickSound: 'woodblock' })
      scheduler.apply({ ...sixteenths, clickSound: 'hi-hat' })
      expect(scheduler.pending!.changed).toEqual(['clickSound'])
      expect(scheduler.timeline!.segments).toHaveLength(2)
      run(spb(80) * 8)
      const boundary = scheduler.timeline!.segments[1]!.startTime
      const before = out.played.filter((p) => p.time < boundary - 1e-9)
      const after = out.played.filter((p) => p.time >= boundary - 1e-9)
      // Some clicks before the boundary were handed out after the change and keep the old sound.
      expect(before.length).toBeGreaterThan(scheduled)
      expect(before.every((p) => p.sampleId.startsWith('click-beep-'))).toBe(true)
      expect(after.length).toBeGreaterThan(4 * 4)
      expect(after.every((p) => p.sampleId.startsWith('click-hi-hat-'))).toBe(true)
      expect(after.some((p) => p.sampleId === 'click-hi-hat-accent')).toBe(true)
      out.played.forEach((p, n) => {
        expect(p.time).toBeCloseTo(10 + START_LEAD + n * (spb(80) / 4), 9)
      })
      expect(scheduler.skipped).toBe(0)
      expect(out.cancelled).toBe(0)
    })

    it('mutes at once and keeps scheduling every level at unchanged times and gains', async () => {
      const subdivided = { ...DEFAULT_SETTINGS, betweenBeats: 2 as const }
      const heard = setup()
      const silent = setup()
      await heard.scheduler.start(subdivided)
      await silent.scheduler.start(subdivided)
      heard.run(spb(80))
      silent.run(spb(80))
      silent.scheduler.apply({ ...subdivided, muted: true })
      expect(silent.out.clickMuted).toBe(true)
      expect(silent.scheduler.pending).toBeNull()
      expect(silent.scheduler.timeline!.segments).toHaveLength(1)
      heard.run(spb(80) * 4)
      silent.run(spb(80) * 4)
      expect(silent.out.played).toEqual(heard.out.played)
      expect(silent.out.played.every((p) => p.bus === 'click')).toBe(true)
      expect(new Set(silent.out.played.map((p) => p.gain)).size).toBe(3)

      silent.scheduler.apply({ ...subdivided, muted: false })
      expect(silent.out.clickMuted).toBe(false)
      heard.run(spb(80) * 2)
      silent.run(spb(80) * 2)
      expect(silent.out.played).toEqual(heard.out.played)
      expect(silent.out.cancelled).toBe(0)
    })

    it('mutes while stopped and keeps the state across Stop and Start', async () => {
      const { scheduler, out, run } = setup()
      const muted = { ...DEFAULT_SETTINGS, muted: true }
      scheduler.apply(muted)
      expect(out.clickMuted).toBe(true)
      await scheduler.start(muted)
      expect(out.clickMuted).toBe(true)
      run(spb(80))
      expect(out.played.length).toBeGreaterThan(0)
      scheduler.stop()
      out.clickMuted = false
      await scheduler.start(muted)
      expect(out.clickMuted).toBe(true)
    })

    it('leaves the bus alone when other settings change while playing', async () => {
      const { scheduler, out } = setup()
      await scheduler.start(at(80))
      const setClickMuted = vi.spyOn(out, 'setClickMuted')
      scheduler.apply(at(120))
      expect(setClickMuted).not.toHaveBeenCalled()
    })

    it('keeps a pending tempo change on its boundary when mute is tapped', async () => {
      const { scheduler, run } = setup()
      await scheduler.start(at(80))
      run(spb(80) / 2)
      scheduler.apply(at(120))
      const { atTime } = scheduler.pending!
      scheduler.apply({ ...at(120), muted: true })
      expect(scheduler.pending!.atTime).toBe(atTime)
    })

    it('starts unmuted when unmuted during a system pause', async () => {
      const { scheduler, out, system } = setup()
      const muted = { ...DEFAULT_SETTINGS, muted: true }
      scheduler.apply(muted)
      await scheduler.start(muted)
      system('hidden')
      scheduler.apply(DEFAULT_SETTINGS)
      await scheduler.start(DEFAULT_SETTINGS)
      expect(out.clickMuted).toBe(false)
    })

    it('reapplies mute to the output rebuilt after a system pause', async () => {
      const { scheduler, out, order, system } = setup()
      const muted = { ...DEFAULT_SETTINGS, muted: true }
      scheduler.apply(muted)
      await scheduler.start(muted)
      system('hidden')
      out.clickMuted = false // a rebuilt output starts unmuted
      await scheduler.start(muted)
      expect(order.filter((step) => step === 'recreate')).toHaveLength(1)
      expect(out.clickMuted).toBe(true)
    })

    it('applies immediately while stopped, with no pending', async () => {
      const { scheduler, out, run } = setup()
      scheduler.apply(at(120))
      expect(scheduler.pending).toBeNull()
      await scheduler.start(at(120))
      run(spb(120) * 2)
      expect(out.played[1]!.time - out.played[0]!.time).toBeCloseTo(spb(120), 9)
    })
  })

  describe('preview', () => {
    const previews = (out: ReturnType<typeof createFakeOut>) =>
      out.played.filter((p) => p.bus === 'preview')
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

    it('resumes synchronously, then plays accent then normal 300 ms apart on the preview bus', async () => {
      const { scheduler, resume, out, clock } = setup()
      scheduler.preview('stick')
      expect(resume).toHaveBeenCalledTimes(1)
      await settle()
      expect(out.played).toEqual([
        { sampleId: 'click-stick-accent', time: clock.now(), gain: 1, bus: 'preview' },
        { sampleId: 'click-stick-normal', time: clock.now() + 0.3, gain: 0.7, bus: 'preview' },
      ])
    })

    it('plays while muted', async () => {
      const { scheduler, out } = setup()
      scheduler.apply({ ...DEFAULT_SETTINGS, muted: true })
      scheduler.preview('woodblock')
      await settle()
      expect(out.clickMuted).toBe(true)
      expect(previews(out).map((p) => p.sampleId)).toEqual([
        'click-woodblock-accent',
        'click-woodblock-normal',
      ])
    })

    it('waits for the sample bank, and only the latest of several previews plays', async () => {
      let release!: () => void
      const ready = new Promise<void>((resolve) => (release = resolve))
      const { scheduler, out } = setup({ ready })
      scheduler.preview('stick')
      scheduler.preview('hi-hat')
      await settle()
      expect(out.played).toEqual([])
      release()
      await settle()
      expect(previews(out).map((p) => p.sampleId)).toEqual([
        'click-hi-hat-accent',
        'click-hi-hat-normal',
      ])
    })

    it('swallows a failed bank or resume', async () => {
      const failedBank = setup({ ready: Promise.reject(new Error('decode')) })
      expect(() => failedBank.scheduler.preview('stick')).not.toThrow()
      const failedResume = setup({ resume: () => Promise.reject(new Error('locked')) })
      expect(() => failedResume.scheduler.preview('stick')).not.toThrow()
      await settle()
      expect(failedBank.out.played).toEqual([])
      expect(failedResume.out.played).toEqual([])
    })

    it('does nothing while playing', async () => {
      const { scheduler, resume, out, run } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      resume.mockClear()
      scheduler.preview('hi-hat')
      await settle()
      run(secondsPerBeat)
      expect(resume).not.toHaveBeenCalled()
      expect(previews(out)).toEqual([])
    })

    it('does nothing while paused by the system', async () => {
      const { scheduler, resume, out, system } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      system('hidden')
      expect(scheduler.status).toBe('paused-by-system')
      resume.mockClear()
      scheduler.preview('stick')
      await settle()
      expect(resume).not.toHaveBeenCalled()
      expect(previews(out)).toEqual([])
    })

    it('a new preview cancels the last one, so its normal note does not overlap', async () => {
      const { scheduler, out } = setup()
      scheduler.preview('stick')
      await settle()
      scheduler.preview('hi-hat')
      await settle()
      expect(out.cancelled).toBe(1)
      expect(out.played.map((p) => p.sampleId)).toEqual([
        'click-hi-hat-accent',
        'click-hi-hat-normal',
      ])
    })

    it('Start cancels a preview still sounding before the first click', async () => {
      const { scheduler, out, run } = setup()
      scheduler.preview('stick')
      await settle()
      await scheduler.start(DEFAULT_SETTINGS)
      expect(out.cancelled).toBe(1)
      run(WAKEUP_INTERVAL)
      expect(previews(out)).toEqual([])
      expect(out.played[0]!.sampleId).toBe('click-beep-accent')
    })

    it('rebuilds audio broken by a system pause before previewing', async () => {
      const { scheduler, out, recreate, order, system } = setup()
      await scheduler.start(DEFAULT_SETTINGS)
      system('interrupted')
      scheduler.stop()
      order.length = 0
      scheduler.preview('woodblock')
      expect(recreate).toHaveBeenCalledTimes(1)
      expect(order).toEqual(['recreate', 'resume'])
      await settle()
      expect(previews(out).map((p) => p.sampleId)).toEqual([
        'click-woodblock-accent',
        'click-woodblock-normal',
      ])
      // Already rebuilt, so the next Start does not rebuild again.
      await scheduler.start(DEFAULT_SETTINGS)
      expect(recreate).toHaveBeenCalledTimes(1)
    })

    it('drops a preview still waiting when Start begins', async () => {
      let release!: () => void
      const ready = new Promise<void>((resolve) => (release = resolve))
      const { scheduler, out } = setup({ ready })
      scheduler.preview('stick')
      const started = scheduler.start(DEFAULT_SETTINGS)
      release()
      await started
      await settle()
      expect(previews(out)).toEqual([])
    })
  })
})
