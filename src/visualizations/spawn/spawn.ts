import { canvasLayoutFields, readCanvasDpr } from '../../rendering/resolution-scale'
import { createRng, type Rng } from '../../simulation/prng'
import { particleCount } from '../../visual-catalog/shared-canvas'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Target = { x: number, y: number, hue: number, life: number, mode: number }

type Particle = {
  x: number
  y: number
  prevX: number
  prevY: number
  dir: number
  turning: number
  speed: number
  hue: number
  hueDelta: number
  opacity: number
  width: number
  target: Target | null
  tilt: boolean
  invert: boolean
}

export type SpawnState = CanvasVisualState & {
  seed: number
  dpr: number
  pointerSeq: number
  particles: Particle[]
  target: Target | null
  time: number
  nextEvent: number
  maxParticles: number
  firstFrame: boolean
}

const BG = { r: 20, g: 20, b: 20 }
const MAX_PARTICLES_CAP = 400
const TARGET_LIFE = 1000
const REFERENCE_FPS = 60
const TRAIL_FADE = 0.2 / (REFERENCE_FPS / 10)

function makeTarget(rng: Rng, w: number, h: number, hue?: number): Target {
  return {
    x: rng.range(w * 0.2, w * 0.8),
    y: rng.range(h * 0.2, h * 0.8),
    hue: hue ?? rng.int(0, 18) * 20,
    life: TARGET_LIFE,
    mode: rng.int(0, 2),
  }
}

function spawnParticle(rng: Rng, x: number, y: number, dpr: number): Particle {
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    dir: rng.range(0, Math.PI * 2),
    turning: rng.range(10, 15),
    speed: rng.range(15, 30) / dpr,
    hue: rng.int(-40, 40),
    hueDelta: 0.01,
    opacity: rng.range(0.35, 1),
    width: rng.range(2, 6) / dpr,
    target: null,
    tilt: rng.int(0, 1) === 1,
    invert: rng.int(0, 15) === 0,
  }
}

function deferAutonomousSpawn(state: SpawnState, rng: Rng) {
  state.nextEvent = state.time + rng.range(10, 15)
}

function interactionRng(state: SpawnState) {
  state.pointerSeq += 1
  return createRng(state.seed + state.pointerSeq * 7919)
}

export function onSpawnPointerDown(state: SpawnState, x: number, y: number) {
  const rng = interactionRng(state)
  const target: Target = {
    x,
    y,
    hue: rng.int(0, 18) * 20,
    life: TARGET_LIFE,
    mode: rng.int(0, 2),
  }
  setTarget(state, target, rng.fork(1))
  for (let i = 0; i < 50; i++) {
    pushParticle(state, rng.fork(i + 2), x, y)
  }
  deferAutonomousSpawn(state, rng.fork(99))
}

export function onSpawnPointerMove(state: SpawnState, x: number, y: number) {
  if (!state.target) return
  const rng = interactionRng(state)
  const target: Target = {
    x,
    y,
    hue: state.target.hue,
    life: TARGET_LIFE,
    mode: rng.int(0, 2),
  }
  setTarget(state, target, rng)
  deferAutonomousSpawn(state, rng.fork(99))
}

export function bumpSpawnAutonomousDelay(state: SpawnState) {
  const rng = interactionRng(state)
  deferAutonomousSpawn(state, rng.fork(99))
}

function setTarget(state: SpawnState, target: Target, rng: Rng) {
  state.target = target
  for (const part of state.particles) {
    if (!part.target || part.target.life < 0 || rng.int(0, 1) === 1) {
      part.target = { ...target }
    }
  }
}

function pushParticle(state: SpawnState, rng: Rng, x: number, y: number) {
  state.particles.push(spawnParticle(rng, x, y, state.dpr))
  const overflow = state.particles.length - state.maxParticles
  if (overflow > 0) state.particles.splice(0, overflow)
}

export function createSpawn(seed: number, density: number, w: number, h: number): SpawnState {
  const rng = createRng(seed)
  const dpr = readCanvasDpr()
  const maxParticles = particleCount(density, 200, 150, MAX_PARTICLES_CAP)
  const state: SpawnState = {
    seed,
    dpr,
    pointerSeq: 0,
    particles: [],
    target: null,
    time: 0,
    nextEvent: 0,
    maxParticles,
    ...canvasLayoutFields(w, h),
  }

  const startX = w * 0.5
  const startY = h * 0.42
  const initialTarget = makeTarget(rng.fork(1), w, h, -60)
  setTarget(state, initialTarget, rng.fork(2))

  const initialCount = Math.round(60 + density * 40)
  for (let i = 0; i < initialCount; i++) {
    pushParticle(state, rng.fork(i + 10), startX, startY)
  }

  state.nextEvent = rng.range(4, 8)
  return state
}

function advanceParticle(part: Particle, target: Target, frames: number, dpr: number) {
  const { x, y } = target
  const dir1 = Math.atan2(y - part.y, x - part.x)
  const dir2 = dir1 + Math.PI * 2
  let dir = Math.abs(dir1 - part.dir) < Math.abs(dir2 - part.dir) ? dir1 : dir2

  dir += 0.5 * frames

  const tiltMul = part.tilt ? 2 : 1
  if (target.mode === 0) part.dir += (tiltMul * (dir - part.dir) * frames) / part.turning
  else if (target.mode === 1) part.dir += (tiltMul * (dir - part.dir) * frames) / (part.turning * 1.2)
  else part.dir += (tiltMul * (dir - part.dir) * frames) / (part.turning / 1.2)

  if (part.dir > Math.PI * 2) part.dir -= Math.PI * 2
  else if (part.dir < 0) part.dir += Math.PI * 2

  part.hue += part.hueDelta * frames

  const distCap = 15 / dpr
  const distFloor = 5 / dpr
  let dist = Math.sqrt((x - part.x) ** 2 + (y - part.y) ** 2) / 10
  dist = Math.max(0, Math.min(distCap, dist) - distFloor)

  const move = (dist + part.speed) * frames
  part.prevX = part.x
  part.prevY = part.y
  part.x = Math.round(part.x + move * Math.cos(part.dir))
  part.y = Math.round(part.y + move * Math.sin(part.dir))
}

export function stepSpawn(state: SpawnState, speed: number, dt: number) {
  state.time += dt * speed
  const frames = dt * REFERENCE_FPS * speed

  if (state.time >= state.nextEvent) {
    const burstRng = createRng(state.seed + Math.floor(state.time))
    const target = makeTarget(burstRng.fork(3), state.width, state.height)
    setTarget(state, target, burstRng.fork(4))

    const spawnAtTarget = burstRng.int(0, 1) === 1
    const count = burstRng.int(5, 10)
    for (let i = 0; i < count; i++) {
      pushParticle(
        state,
        burstRng.fork(i + 20),
        spawnAtTarget ? target.x : burstRng.range(state.width * 0.2, state.width * 0.8),
        spawnAtTarget ? target.y : burstRng.range(state.height * 0.2, state.height * 0.8),
      )
    }

    state.nextEvent = state.time + burstRng.range(8, 14) / speed
  }

  if (state.target) state.target.life -= frames

  for (const part of state.particles) {
    if (!part.target || part.target.life < 0) {
      part.target = state.target ? { ...state.target } : part.target
    } else {
      part.target.life -= frames
    }

    const target = part.target ?? state.target
    if (target) advanceParticle(part, target, frames, state.dpr)
  }
}

export function drawSpawn(ctx: CanvasRenderingContext2D, state: SpawnState) {
  const { width: w, height: h, particles } = state

  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},${TRAIL_FADE})`
    ctx.fillRect(0, 0, w, h)
  }

  if (!state.target) return

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'

  for (const part of particles) {
    const target = part.target ?? state.target
    if (!target) continue

    const strokeHue = target.hue + part.hue + (part.invert ? 30 : 0)
    ctx.beginPath()
    ctx.moveTo(part.prevX, part.prevY)
    ctx.lineTo(part.x, part.y)
    ctx.strokeStyle = `hsla(${strokeHue}, 80%, 50%, ${part.opacity})`
    ctx.lineWidth = part.width
    ctx.stroke()
  }

  ctx.restore()
}

export function resizeSpawn(state: SpawnState, w: number, h: number, seed: number, density: number) {
  const fresh = createSpawn(seed, density, w, h)
  state.seed = seed
  state.dpr = fresh.dpr
  state.pointerSeq = fresh.pointerSeq
  state.particles = fresh.particles
  state.target = fresh.target
  state.time = fresh.time
  state.nextEvent = fresh.nextEvent
  state.maxParticles = fresh.maxParticles
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
