import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { randomInCanvas } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Point = { x: number, y: number, vx: number, vy: number, flicker: number }

export type SparksState = CanvasVisualState & {
  seed: number
  points: Point[]
  time: number
  firstFrame: boolean
}

function pointCount(density: number) {
  return Math.round(40 + density * 88)
}

export function createSparks(seed: number, density: number, w: number, h: number): SparksState {
  const rng = createRng(seed)
  const { scale } = canvasLayoutFields(w, h)
  const n = pointCount(density)
  const points: Point[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 41)
    const { x, y } = randomInCanvas(r, w, h)
    points.push({
      x,
      y,
      vx: scaled(r.range(-35, 35), scale),
      vy: scaled(r.range(-35, 35), scale),
      flicker: r.range(0, Math.PI * 2),
    })
  }
  return { seed, points, time: 0, ...canvasLayoutFields(w, h) }
}

export function stepSparks(state: SparksState, speed: number, dt: number) {
  state.time += dt * speed
  const { width: w, height: h } = state
  for (let i = 0; i < state.points.length; i++) {
    const p = state.points[i]
    p.x += p.vx * dt * speed
    p.y += p.vy * dt * speed
    if (p.x < 0 || p.x > w) p.vx *= -1
    if (p.y < 0 || p.y > h) p.vy *= -1
    p.flicker += dt * (4 + (i % 5))
  }
}

const BG = { r: 5, g: 6, b: 9 }
const LINK = 95

export function drawSparks(ctx: CanvasRenderingContext2D, state: SparksState) {
  const { width: w, height: h, points, scale } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.16)`
    ctx.fillRect(0, 0, w, h)
  }
  const link = scaled(LINK, scale)
  const link2 = link * link
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 > link2) continue
      const flick = 0.35 + Math.sin(a.flicker + b.flicker + state.time * 12) * 0.35
      const t = (1 - Math.sqrt(d2) / link) * flick
      ctx.strokeStyle = `rgba(180, 230, 255, ${t})`
      ctx.lineWidth = scaled(1.2, scale)
      const kink = Math.sin(a.flicker * 2.1 + b.flicker * 1.7 + state.time * 8) * scaled(10, scale)
      const mx = (a.x + b.x) / 2 + kink
      const my = (a.y + b.y) / 2 - kink * 0.65
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(mx, my)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(220, 245, 255, 0.8)'
    ctx.beginPath()
    ctx.arc(a.x, a.y, scaled(2, scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function resizeSparks(state: SparksState, w: number, h: number, seed: number, density: number) {
  const fresh = createSparks(seed, density, w, h)
  state.seed = seed
  state.points = fresh.points
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
