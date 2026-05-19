import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { randomInCanvas } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Node = { x: number, y: number, vx: number, vy: number }

export type MeshState = CanvasVisualState & {
  seed: number
  nodes: Node[]
  time: number
  firstFrame: boolean
}

function nodeCount(density: number) {
  return Math.round(36 + density * 114)
}

export function createMesh(seed: number, density: number, w: number, h: number): MeshState {
  const rng = createRng(seed)
  const n = nodeCount(density)
  const nodes: Node[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 31)
    const { x, y } = randomInCanvas(r, w, h)
    nodes.push({
      x,
      y,
      vx: r.range(-22, 22),
      vy: r.range(-22, 22),
    })
  }
  return { seed, nodes, time: 0, ...canvasLayoutFields(w, h) }
}

export function stepMesh(state: MeshState, speed: number, dt: number) {
  state.time += dt * speed
  const { width: w, height: h } = state
  const pad = scaled(40, state.scale)
  for (let i = 0; i < state.nodes.length; i++) {
    const n = state.nodes[i]
    n.x += n.vx * dt * speed
    n.y += n.vy * dt * speed
    n.vx += Math.sin(state.time * 0.7 + i) * 6 * state.scale * dt
    n.vy += Math.cos(state.time * 0.6 + i * 1.3) * 6 * state.scale * dt
    if (n.x < -pad) n.x = w + pad
    if (n.x > w + pad) n.x = -pad
    if (n.y < -pad) n.y = h + pad
    if (n.y > h + pad) n.y = -pad
  }
}

const BG = { r: 5, g: 6, b: 9 }

export function drawMesh(ctx: CanvasRenderingContext2D, state: MeshState) {
  const { width: w, height: h, nodes, scale } = state
  const link = scaled(118, scale)
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.16)`
    ctx.fillRect(0, 0, w, h)
  }
  const link2 = link * link
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 > link2) continue
      const t = 1 - Math.sqrt(d2) / link
      ctx.strokeStyle = `rgba(100, 180, 255, ${t * 0.35})`
      ctx.lineWidth = t * scaled(1.2, scale)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }
  ctx.fillStyle = 'rgba(180, 220, 255, 0.75)'
  for (const n of nodes) {
    ctx.beginPath()
    ctx.arc(n.x, n.y, scaled(2.2, scale), 0, Math.PI * 2)
    ctx.fill()
  }
}

export function resizeMesh(state: MeshState, w: number, h: number, seed: number, density: number) {
  const fresh = createMesh(seed, density, w, h)
  state.seed = seed
  state.nodes = fresh.nodes
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
