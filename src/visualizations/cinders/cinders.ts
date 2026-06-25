import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng, type Rng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type CinderKind = 'ash' | 'ember' | 'coal'

type Cinder = {
  id: number
  kind: CinderKind
  x: number
  y: number
  vx: number
  vy: number
  age: number
  maxAge: number
  size: number
  phase: number
  flutter: number
  spin: number
  angle: number
  heat: number
  baseWind: number
  gustX: number
  gustY: number
  gustTimeLeft: number
  gustIndex: number
  turbulence: number
  generation: number
}

export type CindersState = CanvasVisualState & {
  seed: number
  cinders: Cinder[]
  time: number
  firstFrame: boolean
}

const BG = { r: 5, g: 6, b: 8 }

function cinderCount(density: number) {
  return Math.min(620, Math.round(170 + density * 420))
}

function chooseKind(rng: Rng): CinderKind {
  const roll = rng.next()
  if (roll < 0.58) return 'ash'
  if (roll < 0.84) return 'ember'
  return 'coal'
}

function assignGust(cinder: Cinder, rng: Rng, scale: number) {
  const reverseDraft = rng.next() < 0.18 ? -1 : 1
  cinder.gustX = scaled(rng.range(-110, 175), scale) * reverseDraft
  cinder.gustY = scaled(rng.range(-135, 120), scale)
  cinder.gustTimeLeft = rng.range(0.16, 0.72)
}

function respawnCinder(cinder: Cinder, rng: Rng, w: number, h: number, scale: number) {
  cinder.kind = chooseKind(rng)
  cinder.age = 0
  cinder.phase = rng.range(0, Math.PI * 2)
  cinder.flutter = rng.range(2.4, 7.5)
  cinder.angle = rng.range(-0.7, 0.7)
  cinder.spin = rng.range(-8.5, 8.5)
  cinder.heat = rng.range(0.45, 1)
  cinder.gustIndex = 0
  cinder.turbulence = rng.range(0.75, 1.65)

  const edgeDrift = scaled(rng.range(35, 180), scale)
  cinder.x = -edgeDrift
  cinder.y = h * (0.12 + Math.pow(rng.next(), 0.66) * 0.86)

  const wind = scaled(rng.range(80, 335), scale)
  const loft = scaled(rng.range(-68, 34), scale)
  cinder.baseWind = wind

  if (cinder.kind === 'ash') {
    cinder.vx = wind * rng.range(0.42, 1.22)
    cinder.vy = loft + scaled(rng.range(-38, 52), scale)
    cinder.size = rng.range(0.9, 2.6)
  } else if (cinder.kind === 'ember') {
    cinder.vx = wind * rng.range(0.72, 1.88)
    cinder.vy = loft + scaled(rng.range(-58, 28), scale)
    cinder.size = rng.range(0.55, 1.45)
  } else {
    cinder.vx = wind * rng.range(0.5, 1.46)
    cinder.vy = loft + scaled(rng.range(-24, 68), scale)
    cinder.size = rng.range(1.2, 3.4)
  }
  assignGust(cinder, rng.fork(313), scale)

  const travel = (w + edgeDrift + scaled(220, scale)) / Math.max(1, cinder.vx)
  cinder.maxAge = travel * rng.range(0.75, 1.22)
}

function createCinder(id: number, rng: Rng, w: number, h: number, scale: number): Cinder {
  const cinder: Cinder = {
    id,
    kind: 'ash',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    maxAge: 1,
    size: 1,
    phase: 0,
    flutter: 1,
    spin: 0,
    angle: 0,
    heat: 1,
    baseWind: 1,
    gustX: 0,
    gustY: 0,
    gustTimeLeft: 0,
    gustIndex: 0,
    turbulence: 1,
    generation: 0,
  }
  respawnCinder(cinder, rng, w, h, scale)

  const warmAge = rng.range(0, cinder.maxAge)
  cinder.age = warmAge
  cinder.x += cinder.vx * warmAge
  cinder.y += cinder.vy * warmAge + Math.sin(cinder.phase + warmAge * cinder.flutter) * scaled(26, scale)
  cinder.angle += cinder.spin * warmAge

  return cinder
}

export function createCinders(seed: number, density: number, w: number, h: number): CindersState {
  const rng = createRng(seed)
  const { scale } = canvasLayoutFields(w, h)
  const cinders: Cinder[] = []
  const n = cinderCount(density)

  for (let i = 0; i < n; i++) {
    cinders.push(createCinder(i, rng.fork(i * 97), w, h, scale))
  }

  return { seed, cinders, time: 0, ...canvasLayoutFields(w, h) }
}

export function stepCinders(state: CindersState, speed: number, dt: number) {
  const step = dt * speed
  state.time += step
  if (step <= 0) return

  const { width: w, height: h, scale } = state
  const margin = scaled(180, scale)
  const globalGustX = (
    Math.sin(state.time * 1.35) * 54 +
    Math.sin(state.time * 2.9 + 1.7) * 28
  ) * scale
  const globalGustY = (
    Math.sin(state.time * 1.9 + 2.4) * 34 +
    Math.sin(state.time * 4.4) * 18
  ) * scale

  for (const cinder of state.cinders) {
    cinder.gustTimeLeft -= step
    if (cinder.gustTimeLeft <= 0) {
      cinder.gustIndex += 1
      assignGust(
        cinder,
        createRng(state.seed + cinder.id * 6151 + cinder.generation * 313 + cinder.gustIndex * 811),
        scale,
      )
    }

    const flutter = Math.sin(state.time * cinder.flutter + cinder.phase)
    const snap = Math.sin(state.time * (cinder.flutter * 2.7) + cinder.phase * 3.1)
    const eddy = Math.sin(state.time * (5.8 + cinder.id % 11) + cinder.phase)
    const windTargetX = cinder.baseWind + cinder.gustX + globalGustX + snap * scaled(72, scale) * cinder.turbulence
    const windTargetY = cinder.gustY + globalGustY + eddy * scaled(58, scale) * cinder.turbulence
    const buoyancy = cinder.kind === 'ember' ? scaled(-28, scale) : scaled(-6, scale)
    const response = cinder.kind === 'ash' ? 1.75 : cinder.kind === 'ember' ? 2.6 : 1.2
    const drag = cinder.kind === 'coal' ? 0.2 : 0.13

    cinder.age += step
    cinder.vx += (windTargetX - cinder.vx) * step * response
    cinder.vy += (windTargetY + buoyancy - cinder.vy) * step * response
    cinder.vx *= 1 - drag * step
    cinder.vy *= 1 - drag * step
    cinder.x += (cinder.vx + flutter * scaled(34, scale) * cinder.turbulence) * step
    cinder.y += cinder.vy * step
    cinder.angle += (cinder.spin + snap * 5.5) * step

    const outOfFrame = cinder.x > w + margin || cinder.y < -margin || cinder.y > h + margin
    if (cinder.age >= cinder.maxAge || outOfFrame) {
      cinder.generation += 1
      respawnCinder(
        cinder,
        createRng(state.seed + cinder.id * 4099 + cinder.generation * 131),
        w,
        h,
        scale,
      )
    }
  }
}

function alphaFor(cinder: Cinder) {
  const t = Math.min(1, Math.max(0, cinder.age / cinder.maxAge))
  const fadeIn = Math.min(1, cinder.age / 0.45)
  const fadeOut = Math.max(0, 1 - t)
  return fadeIn * Math.pow(fadeOut, 1.35)
}

function drawAsh(ctx: CanvasRenderingContext2D, cinder: Cinder, scale: number, alpha: number) {
  const width = scaled(cinder.size * 3.8, scale)
  const height = scaled(cinder.size * 0.95, scale)

  ctx.save()
  ctx.translate(cinder.x, cinder.y)
  ctx.rotate(cinder.angle)
  ctx.fillStyle = `rgba(170, 166, 154, ${alpha * 0.2})`
  ctx.strokeStyle = `rgba(210, 202, 184, ${alpha * 0.08})`
  ctx.lineWidth = scaled(0.7, scale)
  ctx.beginPath()
  ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawEmber(ctx: CanvasRenderingContext2D, cinder: Cinder, scale: number, alpha: number) {
  const angle = Math.atan2(cinder.vy, cinder.vx)
  const tail = scaled((12 + cinder.size * 9) * cinder.heat, scale)
  const radius = scaled(5 + cinder.size * 4, scale)
  const core = scaled(1.1 + cinder.size * 1.1, scale)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.strokeStyle = `rgba(255, 92, 36, ${alpha * 0.35 * cinder.heat})`
  ctx.lineWidth = Math.max(1, scaled(cinder.size * 1.2, scale))
  ctx.beginPath()
  ctx.moveTo(cinder.x - Math.cos(angle) * tail, cinder.y - Math.sin(angle) * tail)
  ctx.lineTo(cinder.x, cinder.y)
  ctx.stroke()

  const glow = ctx.createRadialGradient(cinder.x, cinder.y, 0, cinder.x, cinder.y, radius)
  glow.addColorStop(0, `rgba(255, 228, 180, ${alpha * 0.85})`)
  glow.addColorStop(0.32, `rgba(255, 116, 42, ${alpha * 0.45})`)
  glow.addColorStop(1, 'rgba(90, 36, 12, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cinder.x, cinder.y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(255, 238, 190, ${alpha * 0.75})`
  ctx.beginPath()
  ctx.arc(cinder.x, cinder.y, core, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCoal(ctx: CanvasRenderingContext2D, cinder: Cinder, scale: number, alpha: number) {
  const r = scaled(cinder.size * 2.4, scale)

  ctx.save()
  ctx.translate(cinder.x, cinder.y)
  ctx.rotate(cinder.angle)
  ctx.fillStyle = `rgba(39, 30, 26, ${alpha * 0.72})`
  ctx.strokeStyle = `rgba(255, 91, 32, ${alpha * 0.18 * cinder.heat})`
  ctx.lineWidth = scaled(0.9, scale)
  ctx.beginPath()
  ctx.moveTo(r * 1.1, -r * 0.15)
  ctx.lineTo(r * 0.35, r * 0.8)
  ctx.lineTo(-r * 0.9, r * 0.45)
  ctx.lineTo(-r * 0.65, -r * 0.7)
  ctx.lineTo(r * 0.45, -r * 0.9)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = `rgba(255, 126, 44, ${alpha * 0.18 * cinder.heat})`
  ctx.beginPath()
  ctx.arc(r * 0.1, -r * 0.05, r * 0.45, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawCinders(ctx: CanvasRenderingContext2D, state: CindersState) {
  const { width: w, height: h, cinders, scale } = state

  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.14)`
    ctx.fillRect(0, 0, w, h)
  }

  for (const cinder of cinders) {
    const alpha = alphaFor(cinder)
    if (alpha < 0.018) continue

    if (cinder.kind === 'ash') {
      drawAsh(ctx, cinder, scale, alpha)
    } else if (cinder.kind === 'ember') {
      drawEmber(ctx, cinder, scale, alpha)
    } else {
      drawCoal(ctx, cinder, scale, alpha)
    }
  }
}

export function resizeCinders(state: CindersState, w: number, h: number, seed: number, density: number) {
  const fresh = createCinders(seed, density, w, h)
  state.seed = seed
  state.cinders = fresh.cinders
  state.time = 0
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
