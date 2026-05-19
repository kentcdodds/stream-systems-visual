/**
 * Particle pool: each agent leaves a fading stroke along the flow field.
 * Respawn when leaving bounds or after max age.
 */

import { createRng, type Rng } from '../../simulation/prng'
import { randomInCanvas } from '../../simulation/spread-placement'
import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { fieldDrift, flowAt } from './field'

export type RibbonParticle = {
  x: number
  y: number
  prevX: number
  prevY: number
  age: number
  maxAge: number
  hue: number
  speed: number
}

export type FlowRibbons = {
  particles: RibbonParticle[]
  time: number
  width: number
  height: number
  scale: number
}

const PALETTE_HUES = [198, 168, 215, 142]
const FLOW_SPEED = 95

function particleCount(density: number) {
  return Math.round(420 + density * 900)
}

function spawnParticle(rng: Rng, w: number, h: number): RibbonParticle {
  const { x, y } = randomInCanvas(rng, w, h)
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    age: rng.range(0, 2),
    maxAge: rng.range(8, 18),
    hue: rng.pick(PALETTE_HUES),
    speed: rng.range(0.55, 1.15),
  }
}

export function createFlowRibbons(
  seed: number,
  density: number,
  width: number,
  height: number,
): FlowRibbons {
  const rng = createRng(seed)
  const count = particleCount(density)
  const particles: RibbonParticle[] = []
  for (let i = 0; i < count; i++) {
    particles.push(spawnParticle(rng.fork(i * 13), width, height))
  }
  const layout = canvasLayoutFields(width, height)
  return { particles, time: 0, width: layout.width, height: layout.height, scale: layout.scale }
}

function respawn(p: RibbonParticle, rng: Rng, w: number, h: number) {
  const { x, y } = randomInCanvas(rng, w, h)
  p.x = x
  p.y = y
  p.prevX = x
  p.prevY = y
  p.age = 0
  p.maxAge = rng.range(8, 18)
  p.hue = rng.pick(PALETTE_HUES)
  p.speed = rng.range(0.55, 1.15)
}

export function stepFlowRibbons(
  sim: FlowRibbons,
  seed: number,
  speed: number,
  dt: number,
) {
  if (sim.width < 32 || sim.height < 32) return

  sim.time += dt
  const drift = fieldDrift(sim.time, seed)
  const step = scaled(FLOW_SPEED, sim.scale) * speed * dt
  const rng = createRng(seed + Math.floor(sim.time * 1000))

  const margin = scaled(32, sim.scale)
  const { width: w, height: h } = sim

  for (let i = 0; i < sim.particles.length; i++) {
    const p = sim.particles[i]
    p.prevX = p.x
    p.prevY = p.y

    const flow = flowAt(p.x, p.y, sim.time, seed, drift.x, drift.y)
    p.x += flow.vx * step * p.speed
    p.y += flow.vy * step * p.speed
    p.age += dt

    const out = p.x < -margin || p.x > w + margin || p.y < -margin || p.y > h + margin
    if (out || p.age > p.maxAge) {
      respawn(p, rng.fork(i * 31 + Math.floor(p.age * 100)), w, h)
    }
  }
}

export function resizeFlowRibbons(
  sim: FlowRibbons,
  width: number,
  height: number,
  seed: number,
  density: number,
) {
  const sizeChanged = Math.abs(sim.width - width) > 2 || Math.abs(sim.height - height) > 2
  sim.width = width
  sim.height = height
  sim.scale = canvasLayoutFields(width, height).scale
  if (!sizeChanged || width < 32 || height < 32) return

  const fresh = createFlowRibbons(seed, density, width, height)
  sim.particles = fresh.particles
  sim.time = fresh.time
  sim.scale = fresh.scale
}
