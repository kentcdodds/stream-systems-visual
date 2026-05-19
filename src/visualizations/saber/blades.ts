/**
 * Duel blades: drifting pivots, surge lunges, and aim sway toward center.
 */

import { createRng } from '../../simulation/prng'

export type SaberColor = {
  core: string
  mid: string
  glow: string
}

export const SABER_COLORS: SaberColor[] = [
  { core: '#f2f9ff', mid: '#6eb4ff', glow: 'rgba(72, 155, 255, 0.62)' },
  { core: '#eefff2', mid: '#58d878', glow: 'rgba(48, 205, 108, 0.58)' },
  { core: '#ecfffe', mid: '#4ecfc8', glow: 'rgba(58, 198, 188, 0.55)' },
  { core: '#f6efff', mid: '#a888e8', glow: 'rgba(140, 88, 228, 0.52)' },
  { core: '#fff6ec', mid: '#e8a058', glow: 'rgba(228, 148, 58, 0.48)' },
]

export type SaberBlade = {
  anchorX: number
  anchorY: number
  pivotX: number
  pivotY: number
  lengthBase: number
  length: number
  angle: number
  spin: number
  wobbleAmp: number
  wobblePhase: number
  wobbleRate: number
  colorIndex: number
  driftAx: number
  driftAy: number
  driftRateX: number
  driftRateY: number
  driftPhase: number
  surgeRate: number
  surgePhase: number
  surgeAmp: number
  lengthPulse: number
  aimPhase: number
  aimStrength: number
  /** 0–1 lunge intensity, updated each step for rendering */
  energy: number
}

export type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

export type SaberField = {
  blades: SaberBlade[]
  sparks: Spark[]
  time: number
  width: number
  height: number
  firstFrame: boolean
}

const MAX_SPARKS = 96

function bladeCount(density: number) {
  return Math.round(2 + density * 4)
}

function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function angleLerp(from: number, to: number, t: number) {
  return from + wrapAngle(to - from) * t
}

export function createSaberField(
  seed: number,
  density: number,
  width: number,
  height: number,
): SaberField {
  const rng = createRng(seed)
  const count = bladeCount(density)
  const blades: SaberBlade[] = []
  const span = Math.min(width, height)

  for (let i = 0; i < count; i++) {
    const r = rng.fork(i * 41 + 7)
    const duelSide = i % 2
    const row = Math.floor(i / 2)
    const rows = Math.max(1, Math.ceil(count / 2))
    const yFrac = (row + 1) / (rows + 1)

    const anchorX =
      duelSide === 0
        ? r.range(width * 0.12, width * 0.34)
        : r.range(width * 0.66, width * 0.88)
    const anchorY = height * yFrac + r.range(-span * 0.05, span * 0.05)

    const towardCenter = duelSide === 0 ? 0 : Math.PI
    const lengthBase = r.range(span * 0.34, span * 0.56)

    blades.push({
      anchorX,
      anchorY,
      pivotX: anchorX,
      pivotY: anchorY,
      lengthBase,
      length: lengthBase,
      angle: towardCenter + r.range(-0.7, 0.7),
      spin: (duelSide === 0 ? 1 : -1) * r.range(1.1, 2.4),
      wobbleAmp: r.range(0.18, 0.48),
      wobblePhase: r.range(0, Math.PI * 2),
      wobbleRate: r.range(1.4, 3.2),
      colorIndex: r.int(0, SABER_COLORS.length - 1),
      driftAx: r.range(span * 0.04, span * 0.14),
      driftAy: r.range(span * 0.03, span * 0.11),
      driftRateX: r.range(0.55, 1.25),
      driftRateY: r.range(0.45, 1.05),
      driftPhase: r.range(0, Math.PI * 2),
      surgeRate: r.range(1.8, 3.6),
      surgePhase: r.range(0, Math.PI * 2),
      surgeAmp: r.range(0.85, 1.6),
      lengthPulse: r.range(0.12, 0.28),
      aimPhase: r.range(0, Math.PI * 2),
      aimStrength: r.range(0.35, 0.95),
      energy: 0,
    })
  }

  return { blades, sparks: [], time: 0, width, height, firstFrame: true }
}

export function bladeTip(blade: SaberBlade) {
  return {
    x: blade.pivotX + Math.cos(blade.angle) * blade.length,
    y: blade.pivotY + Math.sin(blade.angle) * blade.length,
  }
}

export function bladePoint(blade: SaberBlade, t: number) {
  return {
    x: blade.pivotX + Math.cos(blade.angle) * blade.length * t,
    y: blade.pivotY + Math.sin(blade.angle) * blade.length * t,
  }
}

function emitSparks(field: SaberField, x: number, y: number, intensity: number, rngSalt: number) {
  const count = Math.min(6, Math.floor(2 + intensity * 5))
  for (let i = 0; i < count && field.sparks.length < MAX_SPARKS; i++) {
    const a = (i / count) * Math.PI * 2 + field.time * 8 + rngSalt
    const speed = 80 + intensity * 220
    const life = 0.35 + intensity * 0.35
    field.sparks.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life,
      maxLife: life,
    })
  }
}

function detectClashes(field: SaberField) {
  const { blades } = field
  const threshold = 36

  for (let i = 0; i < blades.length; i++) {
    for (let j = i + 1; j < blades.length; j++) {
      const a = blades[i]
      const b = blades[j]
      let best = threshold * 2.5
      let hitX = 0
      let hitY = 0

      for (let s = 0; s <= 10; s++) {
        const ta = s / 10
        const pa = bladePoint(a, ta)
        for (let t = 0; t <= 10; t++) {
          const tb = t / 10
          const pb = bladePoint(b, tb)
          const dx = pa.x - pb.x
          const dy = pa.y - pb.y
          const dist = Math.hypot(dx, dy)
          if (dist < best) {
            best = dist
            hitX = (pa.x + pb.x) * 0.5
            hitY = (pa.y + pb.y) * 0.5
          }
        }
      }

      if (best > threshold) continue
      const intensity = 1 - best / threshold
      emitSparks(field, hitX, hitY, intensity, i * 3.1 + j * 1.9)
    }
  }
}

export function stepSaberField(field: SaberField, speed: number, dt: number) {
  const t = (field.time += dt * speed)
  const { width: w, height: h, blades } = field
  const cx = w * 0.5
  const cy = h * 0.5

  for (const blade of blades) {
    blade.pivotX =
      blade.anchorX +
      Math.sin(t * blade.driftRateX + blade.driftPhase) * blade.driftAx
    blade.pivotY =
      blade.anchorY +
      Math.cos(t * blade.driftRateY + blade.driftPhase * 1.35) * blade.driftAy

    const surgeWave = 0.5 + 0.5 * Math.sin(t * blade.surgeRate + blade.surgePhase)
    const surge = Math.pow(surgeWave, 2.2)
    blade.energy = surge

    const spinBurst = 1 + blade.surgeAmp * surge
    const wobble =
      Math.sin(t * blade.wobbleRate + blade.wobblePhase) * blade.wobbleAmp +
      Math.sin(t * blade.wobbleRate * 2.3 + blade.wobblePhase * 0.7) * blade.wobbleAmp * 0.35

    const aimTarget = Math.atan2(cy - blade.pivotY, cx - blade.pivotX)
    const aimSway = 0.5 + 0.5 * Math.sin(t * 1.15 + blade.aimPhase)
    const aimPull = blade.aimStrength * aimSway * dt * (0.9 + surge * 1.4)
    blade.angle = angleLerp(blade.angle, aimTarget, aimPull)

    blade.angle += blade.spin * spinBurst * dt + wobble * dt * 0.55
    blade.length = blade.lengthBase * (1 + blade.lengthPulse * surge)
  }

  detectClashes(field)

  const sparks = field.sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]
    s.life -= dt
    if (s.life <= 0) {
      sparks[i] = sparks[sparks.length - 1]
      sparks.pop()
      continue
    }
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.vx *= 0.92
    s.vy *= 0.92
  }
}

export function resizeSaberField(
  field: SaberField,
  width: number,
  height: number,
  seed: number,
  density: number,
) {
  const changed = Math.abs(field.width - width) > 2 || Math.abs(field.height - height) > 2
  field.width = width
  field.height = height
  if (changed && width >= 32 && height >= 32) {
    const fresh = createSaberField(seed, density, width, height)
    field.blades = fresh.blades
    field.sparks = []
    field.time = fresh.time
    field.firstFrame = true
  }
}
