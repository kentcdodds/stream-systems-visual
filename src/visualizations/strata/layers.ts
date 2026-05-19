/**
 * Horizontal strata: each band boundary is a slow sine shear across the viewport.
 */

import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { placeSpreadNorm } from '../../simulation/spread-placement'

export type StrataLayer = {
  /** Normalized vertical anchor 0–1 */
  anchor: number
  amplitude: number
  frequency: number
  phase: number
  drift: number
  /** 0–1 highlight strength for the crest line */
  crest: number
}

export type StrataField = {
  layers: StrataLayer[]
  time: number
  width: number
  height: number
  scale: number
}

const SKY = { r: 5, g: 7, b: 10 }
const BAND = [
  { r: 14, g: 18, b: 24 },
  { r: 18, g: 24, b: 32 },
  { r: 22, g: 30, b: 40 },
  { r: 16, g: 22, b: 30 },
]

function layerCount(density: number) {
  return Math.round(5 + density * 7)
}

export function createStrataField(
  seed: number,
  density: number,
  width: number,
  height: number,
): StrataField {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(width, height)
  const { scale } = layout
  const count = layerCount(density)
  const anchors = placeSpreadNorm(rng.fork(3), count, { minDist: 0.08 })
  const layers: StrataLayer[] = []

  for (let i = 0; i < count; i++) {
    const r = rng.fork(i * 37 + 11)
    layers.push({
      anchor: anchors[i].y,
      amplitude: scaled(r.range(14, 42), scale),
      frequency: r.range(0.0016, 0.0034),
      phase: r.range(0, Math.PI * 2),
      drift: r.range(0.35, 0.95),
      crest: r.range(0.45, 1),
    })
  }

  layers.sort((a, b) => a.anchor - b.anchor)
  return { layers, time: 0, width: layout.width, height: layout.height, scale: layout.scale }
}

export function layerY(layer: StrataLayer, x: number, time: number, height: number) {
  const t = time * layer.drift
  return (
    layer.anchor * height +
    Math.sin(x * layer.frequency + t + layer.phase) * layer.amplitude
  )
}

export function bandColor(index: number) {
  return BAND[index % BAND.length]
}

export { SKY }

export function stepStrataField(field: StrataField, speed: number, dt: number) {
  field.time += dt * speed
}

export function resizeStrataField(
  field: StrataField,
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
    const fresh = createStrataField(seed, density, width, height)
    field.layers = fresh.layers
    field.time = fresh.time
    field.scale = fresh.scale
  }
}
