import { START_LEAD, type ClickSoundId } from '../core/constants.ts'
import { createPlanState, plan, type PlanState } from '../core/plan.ts'
import type {
  AudioOut,
  EnginePort,
  EngineStatus,
  Pending,
  PausedReason,
  Wakeup,
} from '../core/ports.ts'
import { DEFAULT_SETTINGS, type Settings } from '../core/settings.ts'
import {
  changedMetricKeys,
  segmentAt,
  startTimeline,
  withSettings,
  type ClickLevel,
  type Live,
  type Timeline,
} from '../core/timeline.ts'
import { clickSampleId } from './sample-bank.ts'

export interface SchedulerDeps {
  out: AudioOut
  wakeup: Wakeup
  /** Raw audio-clock `currentTime` in seconds. */
  now: () => number
  /** Called synchronously inside `start`, before any await; resolves once audio is running. */
  resume: () => Promise<void>
  /** Resolves when the sample bank is decoded. */
  ready: Promise<unknown>
  /** Replaces the audio context and sample bank; returns the new bank's readiness. Called synchronously inside `start`. */
  recreate: () => Promise<unknown>
  /** Page-hidden and context interruption reports (AD-8). Returns an unsubscribe. */
  onSystemPause: (listener: (reason: PausedReason) => void) => () => void
  audioSessionSupported: boolean
  /** How long `resume()` may stay unsettled before it counts as failed. */
  resumeTimeoutMs?: number
}

export interface Scheduler extends EnginePort {
  /** Events dropped because their time had already passed (AD-7). */
  readonly skipped: number
  /** The timeline being played, or null while stopped. */
  readonly timeline: Timeline | null
}

const RESUME_TIMEOUT_MS = 1000

const LEVEL_GAIN: Record<ClickLevel, number> = { accent: 1, beat: 0.7, sub: 0.45 }

/** Seconds between the accent and the normal variant of a preview. */
const PREVIEW_GAP = 0.3

export function createScheduler(deps: SchedulerDeps): Scheduler {
  const { out, wakeup, now, resume, recreate, onSystemPause, audioSessionSupported } = deps
  const resumeTimeoutMs = deps.resumeTimeoutMs ?? RESUME_TIMEOUT_MS
  let ready = deps.ready
  let needsRebuild = false
  let pausedReason: PausedReason | null = null
  const listeners = new Set<() => void>()
  let status: EngineStatus = 'stopped'
  let settings: Settings = DEFAULT_SETTINGS
  let state: PlanState | null = null
  let pending: Pending | null = null
  let skipped = 0
  let starting = false
  /** Bumped by `stop` so a `start` still waiting on audio can tell it was cancelled. */
  let generation = 0
  /** Bumped by each preview and by Start, so only the latest preview plays once audio is ready. */
  let previewGeneration = 0
  /** True once a preview was handed to the output and not yet cancelled. */
  let previewLive = false

  function setStatus(next: EngineStatus): void {
    status = next
    for (const listener of listeners) listener()
  }

  /** Recomputes `pending` from the timeline at audio time `t`; notifies when it changes. */
  function refreshPending(t: number): void {
    const before = pending
    pending = null
    const segments = state?.timeline.segments ?? []
    const last = segments[segments.length - 1]
    if (state && last && segments.length > 1 && last.startTime > t) {
      const playing = segments.findLast((s) => s.startTime <= t) ?? segments[0]!
      const changed = changedMetricKeys(playing.metric, last.metric)
      if (changed.length > 0) pending = { changed, settings, atTime: last.startTime }
    }
    if (before || pending) for (const listener of listeners) listener()
  }

  function onWake(): void {
    if (!state) return
    const current = now()
    const planned = plan(state, current)
    state = planned.state
    if (pending && current >= pending.atTime) refreshPending(current)
    const timeline = state.timeline
    for (const event of planned.events) {
      if (event.kind !== 'click') continue
      if (event.time < current) {
        skipped++
        continue
      }
      // The sound belongs to the segment the click falls in, so a change lands on a beat.
      const sound = segmentAt(timeline, event.time)?.metric.clickSound ?? settings.clickSound
      out.play(clickSampleId(sound, event.level), event.time, LEVEL_GAIN[event.level], 'click')
    }
  }

  function halt(): void {
    generation++
    wakeup.stop()
    out.cancelAll()
    state = null
    pending = null
  }

  function pause(reason: PausedReason): void {
    if (status !== 'playing') return
    halt()
    needsRebuild = true
    pausedReason = reason
    setStatus('paused-by-system')
  }

  onSystemPause(pause)

  /** Settles when `resume()` does, or rejects after the timeout; never throws synchronously. */
  function resumeWithTimeout(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('resume timed out')), resumeTimeoutMs)
    })
    let resumed: Promise<void>
    try {
      resumed = resume()
    } catch (error) {
      resumed = Promise.reject(error)
    }
    return Promise.race([resumed, timeout]).finally(() => clearTimeout(timer))
  }

  /**
   * Replaces a context and bank broken by a system pause. Runs before any await so `resume()`
   * still runs inside the gesture. Returns false when the rebuild throws.
   */
  function rebuildIfNeeded(): boolean {
    if (!needsRebuild) return true
    needsRebuild = false
    try {
      ready = recreate()
      ready.catch(() => {})
      return true
    } catch (error) {
      console.warn('Audio rebuild failed', error)
      needsRebuild = true
      return false
    }
  }

  return {
    get pausedReason() {
      return pausedReason
    },
    get audioSessionSupported() {
      return audioSessionSupported
    },
    get status() {
      return status
    },
    get pending(): Pending | null {
      return pending
    },
    get skipped() {
      return skipped
    },
    get timeline() {
      return state?.timeline ?? null
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    apply(next) {
      if (next.muted !== settings.muted) out.setClickMuted(next.muted)
      settings = next
      if (!state) return
      state = {
        ...state,
        timeline: withSettings(state.timeline, next, state.committedUntil),
        live: {
          grid: next.grid,
          markers: next.markers,
          markerSound: next.markerSound,
          muted: next.muted,
        },
      }
      refreshPending(now())
    },
    preview(sound: ClickSoundId) {
      if (status !== 'stopped' || starting) return
      const mine = ++previewGeneration
      if (!rebuildIfNeeded()) return
      const resumed = resumeWithTimeout()
      Promise.all([ready, resumed]).then(
        () => {
          if (mine !== previewGeneration || status !== 'stopped' || starting) return
          // Only previews can be alive while stopped; a new one replaces the last one's normal note.
          if (previewLive) out.cancelAll()
          previewLive = true
          const t = now()
          out.play(clickSampleId(sound, 'accent'), t, LEVEL_GAIN.accent, 'preview')
          out.play(clickSampleId(sound, 'beat'), t + PREVIEW_GAP, LEVEL_GAIN.beat, 'preview')
        },
        () => {},
      )
    },
    async start(next) {
      if (status === 'playing' || starting) return
      starting = true
      const mine = generation
      settings = next
      // A preview still waiting must not play, and one still sounding must not overlap the clicks.
      previewGeneration++
      if (previewLive) {
        out.cancelAll()
        previewLive = false
      }
      if (!rebuildIfNeeded()) {
        starting = false
        return
      }
      // A rebuilt output starts unmuted; this also survives Stop and Start.
      out.setClickMuted(next.muted)
      const resumed = resumeWithTimeout()
      resumed.catch(() => {})
      try {
        await ready
      } catch (error) {
        console.warn('Sample bank failed to load', error)
        needsRebuild = true
        starting = false
        return
      }
      try {
        await resumed
      } catch (error) {
        console.warn('Audio failed to resume', error)
        starting = false
        if (mine !== generation) return
        halt()
        needsRebuild = true
        pausedReason = 'resume-failed'
        setStatus('paused-by-system')
        return
      }
      starting = false
      if (mine !== generation) return
      const live: Live = {
        grid: next.grid,
        markers: next.markers,
        markerSound: next.markerSound,
        muted: next.muted,
      }
      state = createPlanState(startTimeline(next, now() + START_LEAD), live)
      pausedReason = null
      setStatus('playing')
      wakeup.start(onWake)
      onWake()
    },
    stop() {
      halt()
      pausedReason = null
      if (status !== 'stopped') setStatus('stopped')
    },
  }
}
