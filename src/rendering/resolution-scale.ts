/** Layout tuned for 1080p; scale fixed pixel sizes and speeds for other resolutions. */
export const REFERENCE_MIN = 1080

export function visualScale(width: number, height: number) {
  return Math.min(width, height) / REFERENCE_MIN
}

export function readCanvasDpr(search = window.location.search) {
  const q = new URLSearchParams(search)
  const param = q.get('dpr')
  if (param != null && param !== '') {
    const n = Number(param)
    if (Number.isFinite(n) && n >= 1) return Math.min(n, 3)
  }
  return Math.min(window.devicePixelRatio || 1, 2)
}

/** Optional URL multiplier on top of resolution scale (`?scale=1.1`). */
export function effectiveVisualScale(width: number, height: number, search = window.location.search) {
  let scale = visualScale(width, height)
  const param = new URLSearchParams(search).get('scale')
  if (param != null && param !== '') {
    const n = Number(param)
    if (Number.isFinite(n)) scale *= Math.min(2, Math.max(0.5, n))
  }
  return scale
}

export function scaled(value: number, scale: number) {
  return value * scale
}

export function canvasLayoutFields(width: number, height: number, search = window.location.search) {
  return {
    width,
    height,
    scale: effectiveVisualScale(width, height, search),
    firstFrame: true as const,
  }
}
