import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { placeSpreadPoints } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Ring = { r: number, maxR: number }
type Emitter = {
  x: number
  y: number
  vx: number
  vy: number
  rings: Ring[]
  timer: number
  interval: number
}

export type SonarState = CanvasVisualState & {
  seed: number
  emitters: Emitter[]
  time: number
  firstFrame: boolean
}

function emitterCount(density: number) {
  return Math.round(3 + density * 9)
}

function placeEmitters(rng: ReturnType<typeof createRng>, n: number, w: number, h: number, scale: number) {
  const positions = placeSpreadPoints(rng, n, w, h, { minDist: Math.min(w, h) * 0.12 })
  const emitters: Emitter[] = []

  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 23 + 3)
    const angle = r.range(0, Math.PI * 2)
    const drift = scaled(r.range(6, 16), scale)
    emitters.push({
      x: positions[i].x,
      y: positions[i].y,
      vx: Math.cos(angle) * drift,
      vy: Math.sin(angle) * drift,
      rings: [],
      timer: r.range(0, 1.2),
      interval: r.range(0.9, 2.4),
    })
  }

  return emitters
}

export function createSonar(seed: number, density: number, w: number, h: number): SonarState {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(w, h)
  const emitters = placeEmitters(rng, emitterCount(density), w, h, layout.scale)
  return { seed, emitters, time: 0, ...layout }
}

function moveEmitters(emitters: Emitter[], w: number, h: number, dt: number, speed: number) {
  const pad = Math.min(w, h) * 0.06
  for (const e of emitters) {
    e.x += e.vx * dt * speed
    e.y += e.vy * dt * speed
    if (e.x < pad) {
      e.x = pad
      e.vx = Math.abs(e.vx)
    }
    if (e.x > w - pad) {
      e.x = w - pad
      e.vx = -Math.abs(e.vx)
    }
    if (e.y < pad) {
      e.y = pad
      e.vy = Math.abs(e.vy)
    }
    if (e.y > h - pad) {
      e.y = h - pad
      e.vy = -Math.abs(e.vy)
    }
  }
}

export function stepSonar(state: SonarState, speed: number, dt: number) {
  state.time += dt * speed
  const maxR = Math.min(state.width, state.height) * 0.42
  const grow = scaled(95 * dt * speed, state.scale)
  moveEmitters(state.emitters, state.width, state.height, dt, speed)

  for (const e of state.emitters) {
    e.timer += dt * speed
    if (e.timer >= e.interval) {
      e.timer = 0
      e.rings.push({ r: scaled(4, state.scale), maxR })
    }
    for (const ring of e.rings) ring.r += grow
    e.rings = e.rings.filter(ring => ring.r < ring.maxR)
  }
}

const BG = { r: 5, g: 6, b: 9 }

export function drawSonar(ctx: CanvasRenderingContext2D, state: SonarState) {
  const { width: w, height: h, emitters, scale } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.16)`
    ctx.fillRect(0, 0, w, h)
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const e of emitters) {
    for (const ring of e.rings) {
      const t = ring.r / ring.maxR
      const a = (1 - t) * (1 - t) * 0.55
      ctx.strokeStyle = `rgba(90, 200, 220, ${a})`
      ctx.lineWidth = scaled(1.2 + (1 - t) * 1.5, scale)
      ctx.beginPath()
      ctx.arc(e.x, e.y, ring.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(120, 230, 255, 0.35)'
    ctx.beginPath()
    ctx.arc(e.x, e.y, scaled(2.5, scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function resizeSonar(state: SonarState, w: number, h: number, seed: number, density: number) {
  const fresh = createSonar(seed, density, w, h)
  state.seed = seed
  state.emitters = fresh.emitters
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
