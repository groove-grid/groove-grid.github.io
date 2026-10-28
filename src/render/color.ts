export type Rgb = readonly [number, number, number]

/** Parses `#rgb` or `#rrggbb`; null for anything else. */
export function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb
}

/** `from` blended toward `to` by `w` (0 = `to`, 1 = `from`), as a CSS `rgb()` string. */
export function mixRgb(from: Rgb, to: Rgb, w: number): string {
  const c = (i: number) => Math.round(to[i]! + (from[i]! - to[i]!) * w)
  return `rgb(${c(0)} ${c(1)} ${c(2)})`
}

/** `color` at `alpha`, as a CSS `rgb()` string. */
export function withAlpha(color: Rgb, alpha: number): string {
  return `rgb(${color[0]} ${color[1]} ${color[2]} / ${alpha})`
}
