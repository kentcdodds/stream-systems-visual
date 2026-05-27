import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Star = {
  x: number
  y: number
  z: number
  tw: number
  twRate: number
}

type Planet = {
  angle: number
  dist: number
  speed: number
  size: number
  hue: number
  tilt: number
  trail: { x: number, y: number }[]
}

export type SolarVoyageState = CanvasVisualState & {
  seed: number
  stars: Star[]
  planets: Planet[]
  driftX: number
  driftY: number
  time: number
  firstFrame: boolean
}

const BG = { r: 3, g: 4, b: 8 }

function starCount(density: number) {
  return Math.round(120 + density * 180)
}

function starScintillation(s: Star, t: number) {
  const slow = Math.sin(t * s.twRate * 0.55 + s.tw)
  const mid = Math.sin(t * s.twRate * 1.85 + s.tw * 1.37)
  const fast = Math.sin(t * s.twRate * 5.2 + s.tw * 2.11)
  return slow * 0.42 + mid * 0.33 + fast * 0.25
}

export function createSolarVoyage(seed: number, density: number, w: number, h: number): SolarVoyageState {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(w, h)
  const lim = Math.min(w, h)
  const stars: Star[] = []
  for (let i = 0; i < starCount(density); i++) {
    const r = rng.fork(i * 13)
    stars.push({
      x: r.range(0, w),
      y: r.range(0, h),
      z: r.range(0.15, 1),
      tw: r.range(0, Math.PI * 2),
      twRate: r.range(0.6, 2.4),
    })
  }

  const planetNames = 6 + Math.round(density * 3)
  const planets: Planet[] = []
  for (let i = 0; i < planetNames; i++) {
    const r = rng.fork(i * 47 + 5)
    planets.push({
      angle: r.range(0, Math.PI * 2),
      dist: r.range(lim * 0.1, lim * 0.38) * (0.55 + i * 0.08),
      speed: r.range(0.25, 0.9) * (i % 2 === 0 ? 1 : -1) / (1 + i * 0.15),
      size: r.range(2.5, 5 + i * 0.3),
      hue: r.range(20, 220),
      tilt: r.range(0.75, 1),
      trail: [],
    })
  }

  return {
    seed,
    stars,
    planets,
    driftX: rng.range(18, 32),
    driftY: rng.range(6, 14),
    time: 0,
    ...layout,
    firstFrame: true,
  }
}

export function stepSolarVoyage(state: SolarVoyageState, speed: number, dt: number) {
  state.time += dt * speed
  const { width: w, height: h, scale } = state
  const drift = scaled(1, scale)

  for (const s of state.stars) {
    s.x -= state.driftX * s.z * dt * speed * drift * 0.04
    s.y -= state.driftY * s.z * dt * speed * drift * 0.04
    if (s.x < -20) s.x += w + 40
    if (s.x > w + 20) s.x -= w + 40
    if (s.y < -20) s.y += h + 40
    if (s.y > h + 20) s.y -= h + 40
  }

  const cx = w * 0.42
  const cy = h * 0.48
  for (const p of state.planets) {
    p.angle += p.speed * dt * speed
    const x = cx + Math.cos(p.angle) * p.dist
    const y = cy + Math.sin(p.angle) * p.dist * p.tilt
    if (p.trail.length >= 64) p.trail.shift()
    p.trail.push({ x, y })
  }
}

export function drawSolarVoyage(ctx: CanvasRenderingContext2D, state: SolarVoyageState) {
  const { width: w, height: h, stars, planets, scale, time } = state

  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.12)`
    ctx.fillRect(0, 0, w, h)
  }

  const cx = w * 0.42
  const cy = h * 0.48

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (const s of stars) {
    const mix = starScintillation(s, time)
    const a = Math.min(0.85, Math.max(0.04, 0.08 + s.z * 0.28 + mix * 0.12))
    const r = scaled(s.z * (0.8 + (0.5 + mix * 0.5) * 0.6), scale)
    ctx.fillStyle = `rgba(210, 220, 255, ${a})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const sunR = scaled(Math.min(w, h) * 0.055, scale)
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR * 3.2)
  glow.addColorStop(0, 'rgba(255, 230, 160, 0.55)')
  glow.addColorStop(0.35, 'rgba(255, 180, 80, 0.18)')
  glow.addColorStop(1, 'rgba(255, 140, 40, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, sunR * 3.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 245, 210, 0.85)'
  ctx.beginPath()
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2)
  ctx.fill()

  for (const p of planets) {
    if (p.trail.length >= 2) {
      ctx.lineWidth = scaled(1, scale)
      ctx.strokeStyle = `hsla(${p.hue}, 55%, 58%, 0.12)`
      ctx.beginPath()
      for (let i = 0; i < p.trail.length; i++) {
        const pt = p.trail[i]
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      }
      ctx.stroke()
    }

    const last = p.trail[p.trail.length - 1]
    if (!last) continue
    const pr = scaled(p.size, scale)
    ctx.fillStyle = `hsla(${p.hue}, 60%, 62%, 0.7)`
    ctx.beginPath()
    ctx.arc(last.x, last.y, pr, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function resizeSolarVoyage(state: SolarVoyageState, w: number, h: number, seed: number, density: number) {
  const fresh = createSolarVoyage(seed, density, w, h)
  Object.assign(state, fresh)
}
