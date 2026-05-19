import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { randomInCanvas } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Star = {
  x: number
  y: number
  z: number
  tw: number
  twRate: number
  /** Per-star scintillation strength (atmospheric twinkle intensity). */
  twAmp: number
}
type Comet = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  fading: boolean
  fadeT: number
  trail: { x: number, y: number }[]
}

export type VoidState = CanvasVisualState & {
  seed: number
  stars: Star[]
  comet: Comet | null
  spawnTimer: number
  /** Increments each comet spawn so origins are not tied to simulation time buckets. */
  spawnNonce: number
  time: number
  firstFrame: boolean
}

const ACTIVE_MAX_LIFE = 2.6
const FADE_DURATION = 2.2
const TRAIL_LEN = 32

export function createVoid(seed: number, _density: number, w: number, h: number): VoidState {
  const rng = createRng(seed)
  const stars: Star[] = []
  for (let i = 0; i < 220; i++) {
    const r = rng.fork(i * 11)
    const { x, y } = randomInCanvas(r, w, h)
    stars.push({
      x,
      y,
      z: r.range(0.2, 1),
      tw: r.range(0, Math.PI * 2),
      twRate: r.range(0.9, 2.8),
      twAmp: r.range(0.55, 1),
    })
  }
  return {
    seed,
    stars,
    comet: null,
    spawnTimer: rng.range(1.5, 4),
    spawnNonce: 0,
    time: 0,
    ...canvasLayoutFields(w, h),
  }
}

/**
 * Atmospheric scintillation: sum of slow/medium/fast temporal bands plus
 * occasional deep dips (intermittent turbulence), similar to real twinkle.
 */
function starScintillation(s: Star, t: number) {
  const slow = Math.sin(t * s.twRate * 0.55 + s.tw)
  const mid = Math.sin(t * s.twRate * 1.85 + s.tw * 1.37)
  const fast = Math.sin(t * s.twRate * 5.2 + s.tw * 2.11)
  const dip = Math.pow(Math.max(0, Math.sin(t * s.twRate * 0.31 + s.tw * 0.5)), 6)
  const mix = slow * 0.42 + mid * 0.33 + fast * 0.25
  return { mix, dip }
}

/** Random point on expanded viewport perimeter, velocity toward a random interior aim. */
function spawnComet(rng: ReturnType<typeof createRng>, w: number, h: number, scale: number): Comet {
  const margin = scaled(25, scale) + rng.range(0, scaled(55, scale))
  const outerW = w + margin * 2
  const outerH = h + margin * 2
  const perim = 2 * (outerW + outerH)
  let d = rng.range(0, perim)

  let x: number
  let y: number
  if (d < outerW) {
    x = -margin + d
    y = -margin
  } else if ((d -= outerW) < outerH) {
    x = w + margin
    y = -margin + d
  } else if ((d -= outerH) < outerW) {
    x = w + margin - d
    y = h + margin
  } else {
    d -= outerW
    x = -margin
    y = h + margin - d
  }

  const tx = rng.range(margin, w - margin)
  const ty = rng.range(margin, h - margin)
  const dx = tx - x
  const dy = ty - y
  const len = Math.hypot(dx, dy) || 1
  const speed = scaled(rng.range(200, 360), scale)
  return {
    x,
    y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    life: 0,
    fading: false,
    fadeT: 0,
    trail: [],
  }
}

function shouldStartFade(c: Comet, w: number, h: number, scale: number) {
  if (c.life >= ACTIVE_MAX_LIFE) return true
  const margin = scaled(30, scale)
  return c.x < -margin || c.x > w + margin || c.y < -margin || c.y > h + margin
}

function advanceComet(c: Comet, dt: number, speed: number) {
  c.x += c.vx * dt * speed
  c.y += c.vy * dt * speed
  c.trail.unshift({ x: c.x, y: c.y })
  if (c.trail.length > TRAIL_LEN) c.trail.pop()
}

export function stepVoid(state: VoidState, speed: number, dt: number) {
  state.time += dt * speed
  const { width: w, height: h } = state

  if (!state.comet) {
    state.spawnTimer -= dt * speed
    if (state.spawnTimer <= 0) {
      const rng = createRng(state.seed + state.spawnNonce * 7919 + 17)
      state.spawnNonce += 1
      state.comet = spawnComet(rng, w, h, state.scale)
      state.spawnTimer = rng.range(2.5, 6)
    }
    return
  }

  const c = state.comet

  if (c.fading) {
    c.fadeT += dt * speed
    advanceComet(c, dt, speed)
    if (c.fadeT >= FADE_DURATION) state.comet = null
    return
  }

  c.life += dt * speed
  advanceComet(c, dt, speed)
  if (shouldStartFade(c, w, h, state.scale)) c.fading = true
}

function cometFade(c: Comet) {
  if (!c.fading) return 1
  const t = 1 - c.fadeT / FADE_DURATION
  return t * t * (3 - 2 * t)
}

const BG = { r: 5, g: 6, b: 9 }

export function drawVoid(ctx: CanvasRenderingContext2D, state: VoidState) {
  const { width: w, height: h, stars, scale } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    // Slightly lighter fade so star scintillation stays visible frame-to-frame.
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.12)`
    ctx.fillRect(0, 0, w, h)
  }

  const t = state.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const s of stars) {
    const { mix, dip } = starScintillation(s, t)
    const amp = s.twAmp * (0.5 + s.z * 0.5)
    const base = 0.2 + s.z * 0.35
    const a = Math.min(1, Math.max(0.06, base + mix * amp * 0.42 - dip * amp * 0.28))
    const size = scaled(s.z * (1.15 + (0.45 + mix * 0.55) * 0.75), scale)

    ctx.fillStyle = `rgba(220, 230, 255, ${a})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, size * 0.5, 0, Math.PI * 2)
    ctx.fill()

    if (a > 0.62) {
      ctx.fillStyle = `rgba(240, 248, 255, ${(a - 0.62) * 0.35})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, size * 1.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  const c = state.comet
  if (!c) return

  const fade = cometFade(c)
  const headR = scaled(0.6 + fade * 2.8, scale)

  for (let i = 0; i < c.trail.length; i++) {
    const along = 1 - i / c.trail.length
    const p = c.trail[i]
    const segFade = fade * along * along
    if (segFade < 0.02) continue
    ctx.fillStyle = `rgba(200, 230, 255, ${segFade * 0.75})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, scaled(0.5 + segFade * 2.8, scale), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.95})`
  ctx.beginPath()
  ctx.arc(c.x, c.y, headR, 0, Math.PI * 2)
  ctx.fill()
}

export function resizeVoid(state: VoidState, w: number, h: number, seed: number, density: number) {
  const fresh = createVoid(seed, density, w, h)
  state.seed = seed
  state.stars = fresh.stars
  state.comet = null
  state.spawnTimer = fresh.spawnTimer
  state.spawnNonce = 0
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
