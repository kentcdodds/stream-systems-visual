/**
 * Deterministic curl-noise flow field. Particles ride the field; the field
 * itself drifts slowly so ribbons never quite repeat.
 */

export type FlowVector = { vx: number, vy: number }

function potential(x: number, y: number, t: number, seed: number) {
  const s = seed * 0.00017
  const nx = x * 0.0032
  const ny = y * 0.0032
  return (
    Math.sin(nx * 1.4 + s + t * 0.11) * 0.42
    + Math.sin(ny * 1.1 - s * 1.7 + t * 0.09) * 0.36
    + Math.sin((nx + ny) * 0.85 + t * 0.07) * 0.28
    + Math.sin(nx * 2.3 - ny * 1.6 + t * 0.13 + s * 3) * 0.18
  )
}

export function flowAt(
  x: number,
  y: number,
  t: number,
  seed: number,
  driftX: number,
  driftY: number,
): FlowVector {
  const e = 0.85
  const px = x + driftX
  const py = y + driftY
  const dFdx = (potential(px + e, py, t, seed) - potential(px - e, py, t, seed)) / (2 * e)
  const dFdy = (potential(px, py + e, t, seed) - potential(px, py - e, t, seed)) / (2 * e)
  const vx = dFdy
  const vy = -dFdx
  const mag = Math.hypot(vx, vy) || 1
  return { vx: vx / mag, vy: vy / mag }
}

export function fieldDrift(time: number, seed: number) {
  const s = seed * 0.01
  return {
    x: Math.sin(time * 0.08 + s) * 120 + Math.sin(time * 0.023) * 40,
    y: Math.cos(time * 0.065 + s * 1.3) * 100 + Math.cos(time * 0.031) * 35,
  }
}
