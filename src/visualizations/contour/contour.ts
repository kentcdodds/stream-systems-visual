import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Layer = { kx: number, ky: number, amp: number, phase: number }

export type ContourState = CanvasVisualState & {
  seed: number
  layers: Layer[]
  driftX: number
  driftY: number
  time: number
  firstFrame: boolean
}

function heightAt(state: ContourState, x: number, y: number) {
  const t = state.time
  const ox = state.driftX * t
  const oy = state.driftY * t
  let h = 0
  for (const l of state.layers) {
    h += Math.sin((x + ox) * l.kx + l.phase) * l.amp
    h += Math.sin((y + oy) * l.ky + l.phase * 1.4) * l.amp * 0.85
  }
  return h
}

export function createContour(seed: number, density: number, w: number, h: number): ContourState {
  const rng = createRng(seed)
  const { scale } = canvasLayoutFields(w, h)
  const n = Math.round(3 + density * 4)
  const layers: Layer[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 53)
    layers.push({
      kx: r.range(0.006, 0.018),
      ky: r.range(0.006, 0.018),
      amp: r.range(0.35, 0.9),
      phase: r.range(0, Math.PI * 2),
    })
  }
  return {
    seed,
    layers,
    driftX: scaled(rng.range(8, 18), scale),
    driftY: scaled(rng.range(6, 14), scale),
    time: 0,
    ...canvasLayoutFields(w, h),
  }
}

export function stepContour(state: ContourState, speed: number, dt: number) {
  state.time += dt * speed
}

const BG = { r: 5, g: 6, b: 9 }

export function drawContour(ctx: CanvasRenderingContext2D, state: ContourState) {
  const { width: w, height: h, scale } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.16)`
    ctx.fillRect(0, 0, w, h)
  }
  const step = scaled(10, scale)
  const levels = 10
  ctx.fillStyle = 'rgba(120, 200, 180, 0.32)'
  for (let li = 0; li < levels; li++) {
    const level = -2.2 + (li / levels) * 4.4
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const h00 = heightAt(state, x, y)
        const h10 = heightAt(state, x + step, y)
        const h01 = heightAt(state, x, y + step)
        const h11 = heightAt(state, x + step, y + step)
        const edges = [
          [h00, h10, x, y, x + step, y],
          [h10, h11, x + step, y, x + step, y + step],
          [h11, h01, x + step, y + step, x, y + step],
          [h01, h00, x, y + step, x, y],
        ]
        for (const [a, b, x0, y0, x1, y1] of edges) {
          if ((a - level) * (b - level) >= 0) continue
          const t = (level - a) / (b - a)
          const px = x0 + (x1 - x0) * t
          const py = y0 + (y1 - y0) * t
          ctx.beginPath()
          ctx.arc(px, py, scaled(0.6, scale), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

export function resizeContour(state: ContourState, w: number, h: number, seed: number, density: number) {
  const fresh = createContour(seed, density, w, h)
  state.seed = seed
  state.layers = fresh.layers
  state.driftX = fresh.driftX
  state.driftY = fresh.driftY
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
