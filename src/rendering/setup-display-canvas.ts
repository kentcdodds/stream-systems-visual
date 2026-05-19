import { effectiveVisualScale, readCanvasDpr } from './resolution-scale'

export type DisplayCanvasLayout = {
  width: number
  height: number
  dpr: number
  scale: number
  bufferResized: boolean
}

export function setupDisplayCanvas(
  canvas: HTMLCanvasElement,
  search = window.location.search,
): DisplayCanvasLayout | null {
  const w = window.innerWidth
  const h = window.innerHeight
  if (w < 32 || h < 32) return null

  const dpr = readCanvasDpr(search)
  const bufferResized =
    canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)

  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return {
    width: w,
    height: h,
    dpr,
    scale: effectiveVisualScale(w, h, search),
    bufferResized,
  }
}
