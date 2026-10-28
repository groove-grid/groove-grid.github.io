import { TAIL_ARC_DEG } from '../../core/constants.ts'
import { dotAngle } from '../../core/dot-angle.ts'
import { lastDownbeatTime } from '../../core/timeline.ts'
import { parseHex, withAlpha, type Rgb } from '../color.ts'
import { ringRadius } from '../geometry.ts'
import type { Layer } from './types.ts'

const ARC = (TAIL_ARC_DEG * Math.PI) / 180
const HEAD_WIDTH = 18
const END_WIDTH = 2
const HEAD_OPACITY = 0.45
const STEPS = 24

// Shape of the full tail, cut short to `arc` in the first bar: f runs 0 (tail end) to 1 (head).
const behind = (f: number, arc: number) => ((1 - f) * arc) / ARC
const width = (f: number, arc: number) => HEAD_WIDTH - (HEAD_WIDTH - END_WIDTH) * behind(f, arc)

/**
 * Comet tail: a 30° arc on the ring behind the dot, tapering 18px to 2px and fading 0.45 to 0 (UX-DR5).
 * Hidden while stopped and under reduced motion; in the first bar it never reaches behind beat 1.
 */
export function createTailLayer(): Layer {
  let inkHex = ''
  let ink: Rgb = [0, 0, 0]
  return (ctx, frame) => {
    const { timeline, now, size } = frame
    if (!timeline || frame.reducedMotion) return
    const first = timeline.segments[0]
    if (!first || now <= first.startTime) return
    const head = dotAngle(timeline, now)
    const arc = lastDownbeatTime(timeline, now) === first.startTime ? Math.min(ARC, head) : ARC
    if (arc <= 0) return
    if (frame.theme.ink !== inkHex) {
      inkHex = frame.theme.ink
      ink = parseHex(inkHex) ?? [0, 0, 0]
    }

    // Canvas angles run clockwise from 3 o'clock; ring angles from 12 o'clock.
    const c = size / 2
    const r = ringRadius(size)
    const start = head - arc - Math.PI / 2
    ctx.beginPath()
    for (let i = 0; i <= STEPS; i++) {
      const f = i / STEPS
      const a = start + f * arc
      const edge = r + width(f, arc) / 2
      ctx.lineTo(c + Math.cos(a) * edge, c + Math.sin(a) * edge)
    }
    for (let i = STEPS; i >= 0; i--) {
      const f = i / STEPS
      const a = start + f * arc
      const edge = r - width(f, arc) / 2
      ctx.lineTo(c + Math.cos(a) * edge, c + Math.sin(a) * edge)
    }
    ctx.closePath()
    const span = arc / (Math.PI * 2)
    const gradient = ctx.createConicGradient(start, c, c)
    gradient.addColorStop(0, withAlpha(ink, HEAD_OPACITY * (1 - behind(0, arc))))
    gradient.addColorStop(span, withAlpha(ink, HEAD_OPACITY))
    gradient.addColorStop(Math.min(1, span + 0.01), withAlpha(ink, 0))
    ctx.fillStyle = gradient
    ctx.fill()
  }
}
