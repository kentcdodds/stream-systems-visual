import type { Palette } from './palettes'

export function clearFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: Palette,
  firstFrame: boolean,
): boolean {
  if (firstFrame) {
    ctx.fillStyle = `rgb(${palette.bg.r},${palette.bg.g},${palette.bg.b})`
    ctx.fillRect(0, 0, w, h)
    return false
  }
  ctx.fillStyle = `rgba(${palette.bg.r},${palette.bg.g},${palette.bg.b},0.15)`
  ctx.fillRect(0, 0, w, h)
  return false
}

export function particleCount(density: number, base: number, spread: number, max: number) {
  return Math.min(max, Math.round(base + density * spread))
}
