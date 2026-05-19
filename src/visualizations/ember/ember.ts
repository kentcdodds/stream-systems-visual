import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { randomInCanvas } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  /** Y when this rise cycle began (for travel-based lifetime). */
  spawnY: number
}

function assignNaturalLife(p: Particle, rng: ReturnType<typeof createRng>) {
  const dist = Math.max(0, p.spawnY)
  const speed = Math.abs(p.vy)
  const travelTime = speed > 1 ? dist / speed : 8
  // Many burn out before the top; some complete the full rise.
  const reach = rng.range(0.5, 1.25)
  p.maxLife = travelTime * reach + rng.range(0.15, 0.6)
}

export type EmberState = CanvasVisualState & {
  seed: number
  particles: Particle[]
  time: number
  firstFrame: boolean
}

function count(density: number) {
  return Math.round(80 + density * 220)
}

export function createEmber(seed: number, density: number, w: number, h: number): EmberState {
  const rng = createRng(seed)
  const { scale } = canvasLayoutFields(w, h)
  const n = count(density)
  const particles: Particle[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 17)
    const { x, y } = randomInCanvas(r, w, h)
    const p: Particle = {
      x,
      y,
      vx: scaled(r.range(-18, 18), scale),
      vy: scaled(r.range(-95, -35), scale),
      life: 0,
      maxLife: 12,
      size: r.range(1.2, 3.2),
      spawnY: y,
    }
    assignNaturalLife(p, r)
    p.life = r.range(0, p.maxLife * 0.35)
    particles.push(p)
  }
  return { seed, particles, time: 0, ...canvasLayoutFields(w, h) }
}

function respawn(p: Particle, rng: ReturnType<typeof createRng>, w: number, h: number, scale: number) {
  p.x = rng.range(0, w)
  p.y = h + rng.range(0, scaled(40, scale))
  p.spawnY = p.y
  p.vx = scaled(rng.range(-22, 22), scale)
  p.vy = scaled(rng.range(-110, -40), scale)
  p.life = 0
  p.size = rng.range(1.2, 3.5)
  assignNaturalLife(p, rng)
}

export function stepEmber(state: EmberState, speed: number, dt: number) {
  state.time += dt * speed
  const rng = createRng(state.seed + Math.floor(state.time * 10))
  const { width: w, height: h } = state
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i]
    p.life += dt * speed
    p.x += p.vx * dt * speed
    p.y += p.vy * dt * speed
    p.vx += Math.sin(state.time * 2 + i) * scaled(8, state.scale) * dt
    const burnedOut = p.life >= p.maxLife
    const reachedTop = p.y <= 0 && p.spawnY > scaled(12, state.scale)
    if (burnedOut || reachedTop || p.y < -scaled(60, state.scale)) respawn(p, rng.fork(i), w, h, state.scale)
  }
}

const BG = { r: 5, g: 6, b: 9 }

export function drawEmber(ctx: CanvasRenderingContext2D, state: EmberState) {
  const { width: w, height: h, particles } = state
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
  for (const p of particles) {
    const t = Math.max(0, 1 - p.life / p.maxLife)
    const a = t * t * 0.88
    if (a < 0.02) continue
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * scaled(5, state.scale))
    g.addColorStop(0, `rgba(255, 220, 180, ${a})`)
    g.addColorStop(0.35, `rgba(255, 140, 70, ${a * 0.45})`)
    g.addColorStop(1, 'rgba(80, 40, 20, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * scaled(5, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function resizeEmber(state: EmberState, w: number, h: number, seed: number, density: number) {
  const fresh = createEmber(seed, density, w, h)
  state.seed = seed
  state.particles = fresh.particles
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
