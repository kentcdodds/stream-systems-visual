/**
 * Rendering pipeline (each frame):
 * 1. Clear + letterbox transform (camera)
 * 2. Background field layers (grid + contour isolines)
 * 3. Edges (base + faint traffic highlight)
 * 4. Pulses along edges
 * 5. Nodes with load rings
 * 6. DOM overlays (status chrome) — no text, drawn on canvas for OBS simplicity
 */

import { createRng } from '../simulation/prng'
import { getEdgeSegment } from '../simulation/world'
import type { Edge, World } from '../simulation/types'
import { palette } from './palette'

export type DrawOptions = {
  width: number
  height: number
  seed: number
  showOverlays: boolean
  showDebug: boolean
}

function worldToScreen(
  x: number,
  y: number,
  cx: number,
  cy: number,
  scale: number,
  camX: number,
  camY: number,
  zoom: number,
) {
  const wx = (x + camX) * zoom
  const wy = (y + camY) * zoom
  return { x: cx + wx * scale, y: cy + wy * scale }
}

/** Cheap deterministic field for contour/grid — not true noise, but stable and fast */
function field(x: number, y: number, t: number, seed: number) {
  const s = seed * 0.0001
  return (
    Math.sin(x * 2.1 + s + t * 0.15) * 0.5
    + Math.sin(y * 1.7 - t * 0.12 + s * 3) * 0.35
    + Math.sin((x + y) * 1.3 + t * 0.08) * 0.25
  )
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  opts: DrawOptions,
  cx: number,
  cy: number,
  scale: number,
  camX: number,
  camY: number,
  zoom: number,
  time: number,
) {
  const spacing = scale * 0.14 * zoom
  ctx.strokeStyle = palette.grid
  ctx.lineWidth = 1

  const left = cx - opts.width * 0.6
  const right = cx + opts.width * 0.6
  const top = cy - opts.height * 0.6
  const bottom = cy + opts.height * 0.6

  const offsetX = (camX * zoom * scale) % spacing
  const offsetY = (camY * zoom * scale) % spacing

  ctx.beginPath()
  for (let x = left + offsetX; x < right; x += spacing) {
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
  }
  for (let y = top + offsetY; y < bottom; y += spacing) {
    ctx.moveTo(left, y)
    ctx.lineTo(right, y)
  }
  ctx.stroke()

  ctx.strokeStyle = palette.contour
  const levels = 6
  for (let row = -8; row <= 8; row++) {
    for (let col = -10; col <= 10; col++) {
      const wx = col * 0.22
      const wy = row * 0.22
      const v = field(wx, wy, time, opts.seed)
      const level = Math.floor((v + 1) * 0.5 * levels)
      if (level !== 3) continue
      const p = worldToScreen(wx, wy, cx, cy, scale, camX, camY, zoom)
      ctx.fillStyle = palette.contour
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(time + col + row)
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
    }
  }
  ctx.globalAlpha = 1
}

function drawEdge(ctx: CanvasRenderingContext2D, from: { x: number, y: number }, to: { x: number, y: number }, weight: number) {
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = palette.edge
  ctx.lineWidth = 0.6 + weight * 0.8
  ctx.stroke()
}

function drawPulse(
  ctx: CanvasRenderingContext2D,
  from: { x: number, y: number },
  to: { x: number, y: number },
  t: number,
  strength: number,
) {
  const px = from.x + (to.x - from.x) * t
  const py = from.y + (to.y - from.y) * t
  const r = 2.5 + strength * 2

  const g = ctx.createRadialGradient(px, py, 0, px, py, r * 4)
  g.addColorStop(0, palette.pulse)
  g.addColorStop(1, palette.pulseGlow)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(px, py, r * 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = palette.pulse
  ctx.beginPath()
  ctx.arc(px, py, r * 0.55, 0, Math.PI * 2)
  ctx.fill()
}

function statusColor(load: number, tier: number) {
  if (load > 0.72) return palette.statusWarn
  if (load > 0.4 || tier === 2) return palette.statusOk
  return palette.statusIdle
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  load: number,
  tier: number,
) {
  const outer = 5 + tier * 1.5
  ctx.strokeStyle = statusColor(load, tier)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y, outer + load * 4, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = palette.node
  ctx.beginPath()
  ctx.arc(x, y, 2.2 + tier * 0.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = palette.nodeCore
  ctx.beginPath()
  ctx.arc(x, y, 1, 0, Math.PI * 2)
  ctx.fill()
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  opts: DrawOptions,
  world: World,
) {
  const pad = 48
  const w = opts.width
  const h = opts.height

  ctx.strokeStyle = palette.overlay
  ctx.lineWidth = 1

  // Corner brackets (title safe zones — user adds text in OBS)
  const bracket = 28
  ctx.beginPath()
  ctx.moveTo(pad, pad + bracket)
  ctx.lineTo(pad, pad)
  ctx.lineTo(pad + bracket, pad)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(w - pad - bracket, pad)
  ctx.lineTo(w - pad, pad)
  ctx.lineTo(w - pad, pad + bracket)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(pad, h - pad - bracket)
  ctx.lineTo(pad, h - pad)
  ctx.lineTo(pad + bracket, h - pad)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(w - pad - bracket, h - pad)
  ctx.lineTo(w - pad, h - pad)
  ctx.lineTo(w - pad, h - pad - bracket)
  ctx.stroke()

  // Status row: deterministic indicators from node health
  const rng = createRng(opts.seed + 99)
  const indicators = 5
  const baseX = pad + 40
  const baseY = h - pad - 12
  for (let i = 0; i < indicators; i++) {
    const node = world.nodes[i % world.nodes.length]
    const blink = Math.sin(world.time * 2 + i * 1.3) > 0.2
    ctx.fillStyle = blink ? statusColor(node.load, node.tier) : palette.statusIdle
    ctx.beginPath()
    ctx.arc(baseX + i * 18, baseY, 3, 0, Math.PI * 2)
    ctx.fill()
    rng.next()
  }

  // Center crosshair hint (very faint)
  ctx.strokeStyle = 'rgba(120, 130, 140, 0.08)'
  ctx.beginPath()
  ctx.moveTo(w / 2 - 12, h / 2)
  ctx.lineTo(w / 2 + 12, h / 2)
  ctx.moveTo(w / 2, h / 2 - 12)
  ctx.lineTo(w / 2, h / 2 + 12)
  ctx.stroke()
}

/** Debug HUD without typography — bar lengths encode sim health */
function drawDebug(
  ctx: CanvasRenderingContext2D,
  opts: DrawOptions,
  world: World,
) {
  const x = opts.width - 56
  const y0 = 20
  const maxH = 36
  const values = [
    (opts.seed % 1000) / 1000,
    world.nodes.length / 70,
    world.edges.length / 100,
    world.pulses.length / 12,
    (world.time % 20) / 20,
  ]
  values.forEach((v, i) => {
    const h = Math.max(4, Math.min(1, v) * maxH)
    ctx.fillStyle = palette.debug
    ctx.fillRect(x + i * 10, y0 + maxH - h, 6, h)
  })
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  world: World,
  options: DrawOptions,
) {
  const { width, height } = options
  const cx = width * 0.5
  const cy = height * 0.5
  const scale = Math.min(width, height) * 0.38
  const { x: camX, y: camY, zoom } = world.camera

  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, options, cx, cy, scale, camX, camY, zoom, world.time)

  const edgeById = new Map<number, Edge>()
  for (const edge of world.edges) edgeById.set(edge.id, edge)

  for (const edge of world.edges) {
    const { from, to } = getEdgeSegment(world, edge)
    const a = worldToScreen(from.x, from.y, cx, cy, scale, camX, camY, zoom)
    const b = worldToScreen(to.x, to.y, cx, cy, scale, camX, camY, zoom)
    drawEdge(ctx, a, b, edge.weight)
  }

  for (const pulse of world.pulses) {
    const edge = edgeById.get(pulse.edgeId)
    if (!edge) continue
    const { from, to } = getEdgeSegment(world, edge)
    const a = worldToScreen(from.x, from.y, cx, cy, scale, camX, camY, zoom)
    const b = worldToScreen(to.x, to.y, cx, cy, scale, camX, camY, zoom)
    drawPulse(ctx, a, b, pulse.t, pulse.strength)
  }

  for (const node of world.nodes) {
    const p = worldToScreen(node.pos.x, node.pos.y, cx, cy, scale, camX, camY, zoom)
    drawNode(ctx, p.x, p.y, node.load, node.tier)
  }

  if (options.showOverlays) drawOverlays(ctx, options, world)
  if (options.showDebug) drawDebug(ctx, options, world)
}
