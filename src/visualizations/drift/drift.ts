import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { placeSpreadPoints } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Orb = { cx: number, cy: number, rx: number, ry: number, rateX: number, rateY: number, phase: number, size: number, hue: number }

export type DriftState = CanvasVisualState & {
  seed: number
  orbs: Orb[]
  time: number
  firstFrame: boolean
}

function orbCount(density: number) {
  return Math.round(6 + density * 14)
}

export function createDrift(seed: number, density: number, w: number, h: number): DriftState {
  const rng = createRng(seed)
  const { scale } = canvasLayoutFields(w, h)
  const n = orbCount(density)
  const anchors = placeSpreadPoints(rng.fork(3), n, w, h)
  const orbs: Orb[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 47)
    orbs.push({
      cx: anchors[i].x,
      cy: anchors[i].y,
      rx: r.range(0.08, 0.22) * w,
      ry: r.range(0.08, 0.22) * h,
      rateX: r.range(0.15, 0.45),
      rateY: r.range(0.12, 0.38),
      phase: r.range(0, Math.PI * 2),
      size: scaled(r.range(55, 120), scale),
      hue: r.range(200, 280),
    })
  }
  return { seed, orbs, time: 0, ...canvasLayoutFields(w, h) }
}

export function stepDrift(state: DriftState, speed: number, dt: number) {
  state.time += dt * speed
}

const BG = { r: 5, g: 6, b: 9 }

export function drawDrift(ctx: CanvasRenderingContext2D, state: DriftState) {
  const { width: w, height: h, orbs } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.16)`
    ctx.fillRect(0, 0, w, h)
  }
  const t = state.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const o of orbs) {
    const x = o.cx + Math.sin(t * o.rateX + o.phase) * o.rx
    const y = o.cy + Math.cos(t * o.rateY + o.phase * 1.3) * o.ry
    const g = ctx.createRadialGradient(x, y, 0, x, y, o.size)
    g.addColorStop(0, `hsla(${o.hue}, 70%, 70%, 0.35)`)
    g.addColorStop(0.45, `hsla(${o.hue + 20}, 65%, 55%, 0.12)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, o.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function resizeDrift(state: DriftState, w: number, h: number, seed: number, density: number) {
  const fresh = createDrift(seed, density, w, h)
  state.seed = seed
  state.orbs = fresh.orbs
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
