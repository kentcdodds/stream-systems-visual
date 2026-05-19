/**
 * Wave emitters placed deterministically; each drifts on a slow Lissajous path.
 */

import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { placeSpreadPoints } from '../../simulation/spread-placement'

export type Emitter = {
  baseX: number
  baseY: number
  phase: number
  frequency: number
  pulseSpeed: number
  driftA: number
  driftB: number
  driftRateX: number
  driftRateY: number
}

/** Precomputed once per frame before the pixel loop */
export type EmitterSample = {
  x: number
  y: number
  frequency: number
  wavePhase: number
}

export type ResonanceField = {
  emitters: Emitter[]
  time: number
  width: number
  height: number
  scale: number
}

function emitterCount(density: number) {
  return Math.round(4 + density * 7)
}

export function createResonanceField(
  seed: number,
  density: number,
  width: number,
  height: number,
): ResonanceField {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(width, height)
  const scale = layout.scale
  const count = emitterCount(density)
  const positions = placeSpreadPoints(rng.fork(3), count, width, height)
  const emitters: Emitter[] = []

  for (let i = 0; i < count; i++) {
    const r = rng.fork(i * 29 + 5)
    emitters.push({
      baseX: positions[i].x,
      baseY: positions[i].y,
      phase: r.range(0, Math.PI * 2),
      frequency: r.range(0.018, 0.038),
      pulseSpeed: r.range(0.7, 1.4),
      driftA: scaled(r.range(18, 55), scale),
      driftB: scaled(r.range(18, 55), scale),
      driftRateX: r.range(0.04, 0.11),
      driftRateY: r.range(0.035, 0.095),
    })
  }

  return { emitters, time: 0, width: layout.width, height: layout.height, scale: layout.scale }
}

export function sampleEmitters(field: ResonanceField, time: number): EmitterSample[] {
  const samples: EmitterSample[] = []
  for (const e of field.emitters) {
    samples.push({
      x: e.baseX + Math.sin(time * e.driftRateX + e.phase) * e.driftA,
      y: e.baseY + Math.cos(time * e.driftRateY + e.phase * 1.4) * e.driftB,
      frequency: e.frequency,
      wavePhase: -time * e.pulseSpeed + e.phase,
    })
  }
  return samples
}

export function stepResonanceField(field: ResonanceField, speed: number, dt: number) {
  field.time += dt * speed
}

export function resizeResonanceField(
  field: ResonanceField,
  width: number,
  height: number,
  seed: number,
  density: number,
) {
  const changed = Math.abs(field.width - width) > 2 || Math.abs(field.height - height) > 2
  field.width = width
  field.height = height
  field.scale = canvasLayoutFields(width, height).scale
  if (changed && width >= 32 && height >= 32) {
    const fresh = createResonanceField(seed, density, width, height)
    field.emitters = fresh.emitters
    field.time = fresh.time
    field.scale = fresh.scale
  }
}
