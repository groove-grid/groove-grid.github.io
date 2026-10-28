import { PPQ, type ClickSoundId, type MarkerSoundId } from './constants.ts'
import type { Division, Settings } from './settings.ts'

/** The metric fields a segment carries (AD-2). */
export interface Metric {
  bpm: number
  beats: number
  beatUnit: 4 | 8
  clickBeats: readonly boolean[]
  betweenBeats: Division
  clickSound: ClickSoundId
}

/** Covers `[startTick, next segment's startTick)`; `startTime` is stored once at creation. */
export interface Segment {
  startTick: number
  startTime: number
  barOriginTick: number
  metric: Metric
}

export interface Timeline {
  readonly segments: readonly Segment[]
}

/** Fields that apply to events not yet committed; kept outside the timeline (AD-2). */
export interface Live {
  grid: Division
  markers: readonly number[]
  markerSound: MarkerSoundId | null
  muted: boolean
}

export type ClickLevel = 'accent' | 'beat' | 'sub'

export type CoreEvent =
  | { kind: 'click'; time: number; tick: number; level: ClickLevel }
  | { kind: 'downbeat'; time: number; tick: number }

export function secondsPerTick(metric: Metric): number {
  return 60 / (metric.bpm * PPQ)
}

/** Closed-form time of an absolute tick within a segment (AD-1). */
export function tickTime(segment: Segment, tick: number): number {
  return segment.startTime + (tick - segment.startTick) * secondsPerTick(segment.metric)
}

export function startTimeline(settings: Settings, startTime: number): Timeline {
  return { segments: [{ startTick: 0, startTime, barOriginTick: 0, metric: metricOf(settings) }] }
}

/**
 * Smallest multiple index `m` (tick = m × step) whose closed-form time is >= `time`.
 * Estimated, then corrected against `tickTime`, so one monotone predicate serves every window.
 */
function firstIndexAtOrAfter(segment: Segment, step: number, time: number): number {
  const spt = secondsPerTick(segment.metric)
  let m = Math.ceil((segment.startTick + (time - segment.startTime) / spt) / step)
  while (tickTime(segment, (m - 1) * step) >= time) m--
  while (tickTime(segment, m * step) < time) m++
  return m
}

function metricOf(settings: Settings): Metric {
  const { bpm, beats, beatUnit, clickBeats, betweenBeats, clickSound } = settings
  return { bpm, beats, beatUnit, clickBeats: [...clickBeats], betweenBeats, clickSound }
}

/** Metric keys whose values differ, as `Settings` keys. */
export function changedMetricKeys(a: Metric, b: Metric): (keyof Settings)[] {
  const keys: (keyof Settings)[] = []
  if (a.bpm !== b.bpm) keys.push('bpm')
  if (a.beats !== b.beats) keys.push('beats')
  if (a.beatUnit !== b.beatUnit) keys.push('beatUnit')
  if (a.betweenBeats !== b.betweenBeats) keys.push('betweenBeats')
  if (a.clickSound !== b.clickSound) keys.push('clickSound')
  if (
    a.clickBeats.length !== b.clickBeats.length ||
    a.clickBeats.some((on, i) => on !== b.clickBeats[i])
  ) {
    keys.push('clickBeats')
  }
  return keys
}

/**
 * Applies a settings snapshot at the first beat boundary at or after `committedUntil` (AD-6);
 * a change to `beats` or `beatUnit` waits for the first downbeat from there. Segments that have not
 * been committed are dropped first, so at most one future segment remains.
 */
export function withSettings(
  timeline: Timeline,
  settings: Settings,
  committedUntil: number,
): Timeline {
  const kept = timeline.segments.filter((s, i) => i === 0 || s.startTime < committedUntil)
  const last = kept[kept.length - 1]
  if (!last) return timeline
  const metric = metricOf(settings)
  if (changedMetricKeys(last.metric, metric).length === 0) return { segments: kept }

  let tick = Math.max(
    firstIndexAtOrAfter(last, PPQ, committedUntil) * PPQ,
    Math.ceil(last.startTick / PPQ) * PPQ,
  )
  const meterChanged =
    metric.beats !== last.metric.beats || metric.beatUnit !== last.metric.beatUnit
  if (meterChanged) {
    const barTicks = last.metric.beats * PPQ
    const into = (((tick - last.barOriginTick) % barTicks) + barTicks) % barTicks
    if (into !== 0) tick += barTicks - into
  }
  const barOriginTick = meterChanged ? tick : last.barOriginTick

  if (tick === last.startTick) {
    return { segments: [...kept.slice(0, -1), { ...last, barOriginTick, metric }] }
  }
  const next: Segment = { startTick: tick, startTime: tickTime(last, tick), barOriginTick, metric }
  return { segments: [...kept, next] }
}

function eventsAtTick(segment: Segment, tick: number): CoreEvent[] {
  const { beats, clickBeats } = segment.metric
  const barTicks = beats * PPQ
  const barTick = (((tick - segment.barOriginTick) % barTicks) + barTicks) % barTicks
  const time = tickTime(segment, tick)
  const events: CoreEvent[] = []
  if (barTick === 0) events.push({ kind: 'downbeat', time, tick })
  if (clickBeats[Math.floor(barTick / PPQ)]) {
    const level: ClickLevel = barTick % PPQ !== 0 ? 'sub' : barTick === 0 ? 'accent' : 'beat'
    events.push({ kind: 'click', time, tick, level })
  }
  return events
}

/** Events with `t0 <= time < t1`, ordered by tick (downbeat before click). `live` is reserved for marker events. */
export function eventsBetween(timeline: Timeline, live: Live, t0: number, t1: number): CoreEvent[] {
  void live
  const events: CoreEvent[] = []
  timeline.segments.forEach((segment, i) => {
    const next = timeline.segments[i + 1]
    const step = PPQ / segment.metric.betweenBeats
    const from = Math.max(
      firstIndexAtOrAfter(segment, step, t0),
      Math.ceil(segment.startTick / step),
    )
    const to = firstIndexAtOrAfter(segment, step, t1)
    for (let m = from; m < to; m++) {
      const tick = m * step
      if (next && tick >= next.startTick) break
      events.push(...eventsAtTick(segment, tick))
    }
  })
  return events
}

/** The segment playing at audio time `t` (the first one before the timeline starts). */
export function segmentAt(timeline: Timeline, t: number): Segment | undefined {
  let segment = timeline.segments[0]
  for (const s of timeline.segments) if (s.startTime <= t) segment = s
  return segment
}

/** Fractional tick within the bar at audio time `t`; 0 before the timeline starts. */
export function positionAt(timeline: Timeline, t: number): number {
  const first = timeline.segments[0]
  if (!first || t <= first.startTime) return 0
  const segment = segmentAt(timeline, t)!
  const absTick = segment.startTick + (t - segment.startTime) / secondsPerTick(segment.metric)
  const barTicks = segment.metric.beats * PPQ
  const pos = (absTick - segment.barOriginTick) % barTicks
  return pos < 0 ? pos + barTicks : pos
}

/** Audio time of the latest downbeat at or before `t`; null before the timeline starts. */
export function lastDownbeatTime(timeline: Timeline, t: number): number | null {
  const first = timeline.segments[0]
  if (!first || t < first.startTime) return null
  const segment = segmentAt(timeline, t)!
  const absTick = segment.startTick + (t - segment.startTime) / secondsPerTick(segment.metric)
  const barTicks = segment.metric.beats * PPQ
  // The epsilon keeps a frame that lands exactly on a downbeat from rounding back a whole bar.
  const bars = Math.floor((absTick - segment.barOriginTick + 1e-6) / barTicks)
  const tick = segment.barOriginTick + bars * barTicks
  let owner = timeline.segments[0]!
  for (const s of timeline.segments) if (s.startTick <= tick) owner = s
  return Math.min(tickTime(owner, tick), t)
}
