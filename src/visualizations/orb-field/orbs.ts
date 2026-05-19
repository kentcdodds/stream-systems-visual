/**
 * Orb-field simulation (forward flight through a seeded volume):
 *
 * - Each orb has (x, y, z); z is depth (larger = farther).
 * - Orbs are evenly spaced along the depth stream on spawn (no batching).
 * - Recycle injects each orb at a fixed phase offset in the stream by id.
 * - Camera rig state (pan / look) is applied by the Three.js scene each frame.
 * - Lateral positions favor a ring (sparse center) so few orbs rush the middle.
 */

import { createRng, type Rng } from '../../simulation/prng'
import { orbColors, pickOrbColorIndex } from './orb-colors'

export type Orb = {
  id: number
  x: number
  y: number
  z: number
  baseRadius: number
  colorIndex: number
  phase: number
  driftX: number
  driftY: number
  recycleCount: number
}

export type Camera = {
  panX: number
  panY: number
  roll: number
  lookX: number
  lookY: number
}

export type OrbField = {
  orbs: Orb[]
  time: number
  camera: Camera
}

export const NEAR_Z = 0.14
export const FAR_Z = 9.5
export const FADE_START_Z = 7.2
export const FADE_END_Z = 4.8
const STREAM_SPAN = FAR_Z + 2.4 - FADE_END_Z
const LATERAL_MIN = 0.42
const LATERAL_SPREAD = 1.65
const GOLDEN = 0.6180339887

function orbCountFromDensity(density: number) {
  return Math.round(100 + density * 260)
}

function spawnLateral(rng: Rng) {
  const angle = rng.range(0, Math.PI * 2)
  const radius = LATERAL_MIN + Math.sqrt(rng.next()) * (LATERAL_SPREAD - LATERAL_MIN)
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}

function streamDepthForSlot(slot: number) {
  return FADE_END_Z + (slot % 1) * STREAM_SPAN
}

function spawnOrb(rng: Rng, id: number, z: number): Orb {
  const { x, y } = spawnLateral(rng)
  return {
    id,
    x,
    y,
    z,
    baseRadius: rng.range(0.006, 0.028),
    colorIndex: pickOrbColorIndex(rng),
    phase: rng.range(0, Math.PI * 2),
    driftX: rng.range(0.35, 1.1),
    driftY: rng.range(0.35, 1.1),
    recycleCount: 0,
  }
}

function initialCamera(): Camera {
  return { panX: 0, panY: 0, roll: 0, lookX: 0, lookY: 0 }
}

export function createOrbField(seed: number, density: number): OrbField {
  const rng = createRng(seed)
  const count = orbCountFromDensity(density)
  const orbs: Orb[] = []

  for (let id = 0; id < count; id++) {
    const slot = (id + 0.5) / count
    const z = streamDepthForSlot(slot)
    orbs.push(spawnOrb(rng.fork(id * 17 + 3), id, z))
  }

  return { orbs, time: 0, camera: initialCamera() }
}

function recycleOrb(orb: Orb, rng: Rng) {
  const { x, y } = spawnLateral(rng)
  const slot = (orb.id * GOLDEN + orb.recycleCount * 0.173) % 1
  orb.x = x
  orb.y = y
  orb.z = streamDepthForSlot(slot)
  orb.baseRadius = rng.range(0.006, 0.028)
  orb.colorIndex = rng.int(0, orbColors.length - 1)
  orb.phase = rng.range(0, Math.PI * 2)
  orb.driftX = rng.range(0.35, 1.1)
  orb.driftY = rng.range(0.35, 1.1)
  orb.recycleCount += 1
}

function updateCamera(camera: Camera, time: number) {
  camera.panX = Math.sin(time * 0.13) * 0.5 + Math.sin(time * 0.037) * 0.2
  camera.panY = Math.cos(time * 0.11) * 0.4 + Math.cos(time * 0.043) * 0.14
  camera.roll = Math.sin(time * 0.07) * 0.09
  camera.lookX = Math.sin(time * 0.05) * 0.28
  camera.lookY = Math.cos(time * 0.061) * 0.2
}

export function stepOrbField(field: OrbField, seed: number, speed: number, dt: number) {
  const travel = dt * speed * 0.55
  field.time += dt
  updateCamera(field.camera, field.time)

  for (const orb of field.orbs) {
    orb.z -= travel

    const wobble = field.time * 0.35
    orb.x += Math.sin(wobble * orb.driftX + orb.phase) * dt * 0.035
    orb.y += Math.cos(wobble * orb.driftY + orb.phase * 1.3) * dt * 0.035

    if (orb.z < NEAR_Z) {
      const rng = createRng(seed + orb.id * 997 + orb.recycleCount * 131)
      recycleOrb(orb, rng)
    }
  }
}

export function sortedOrbs(field: OrbField) {
  return [...field.orbs].sort((a, b) => b.z - a.z)
}

export function depthFade(z: number) {
  if (z >= FADE_START_Z) return 0
  if (z <= FADE_END_Z) return 1
  const t = (FADE_START_Z - z) / (FADE_START_Z - FADE_END_Z)
  return t * t * (3 - 2 * t)
}

/** Fade out as orbs pass the camera — avoids center pop */
export function nearFade(z: number) {
  if (z >= 0.7) return 1
  if (z <= NEAR_Z) return 0
  const t = (z - NEAR_Z) / (0.7 - NEAR_Z)
  return t * t * (3 - 2 * t)
}

export function orbVisibility(z: number) {
  return depthFade(z) * nearFade(z)
}
