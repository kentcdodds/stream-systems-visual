/**
 * Catalog engines for visual categories not covered by hand-tuned routes.
 */

import { canvasLayoutFields, scaled } from '../rendering/resolution-scale'
import { createRng, type Rng } from '../simulation/prng'
import { randomInCanvas } from '../simulation/spread-placement'
import { paletteAt } from './palettes'
import { clearFrame, particleCount } from './shared-canvas'
import type { CatalogEntry, CatalogVisualState } from './types'

type BaseCtx = {
  w: number
  h: number
  scale: number
  rng: Rng
  palette: ReturnType<typeof paletteAt>
  variant: number
}

function baseCtx(entry: CatalogEntry, seed: number, w: number, h: number): BaseCtx {
  return {
    w,
    h,
    scale: canvasLayoutFields(w, h).scale,
    rng: createRng(seed),
    palette: paletteAt(entry.palette),
    variant: entry.variant,
  }
}

function hsl(entry: CatalogEntry, offset: number, l: number, a: number) {
  const pal = paletteAt(entry.palette)
  return `hsla(${pal.hue + offset}, 72%, ${l}%, ${a})`
}

function viewportMin(w: number, h: number) {
  return Math.min(w, h)
}

// --- Branch (organic growth) ---
type BranchSeg = {
  x1: number
  y1: number
  x2: number
  y2: number
  grow: number
  rate: number
}
type BranchData = { segs: BranchSeg[], hold: number, density: number }

function buildBranchSegs(entry: CatalogEntry, seed: number, density: number, w: number, h: number): BranchSeg[] {
  const { rng } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const n = Math.round(8 + density * 14)
  const segs: BranchSeg[] = []
  const baseY = h
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 17)
    const x = r.range(w * 0.08, w * 0.92)
    const len = r.range(lim * 0.12, lim * 0.38)
    const ang = r.range(-Math.PI * 0.85, -Math.PI * 0.15)
    segs.push({
      x1: x,
      y1: baseY,
      x2: x + Math.cos(ang) * len,
      y2: baseY + Math.sin(ang) * len,
      grow: r.range(0, 0.12),
      rate: r.range(0.22, 0.38),
    })
  }
  return segs
}

export function createBranch(entry: CatalogEntry, seed: number, density: number, w: number, h: number): BranchData {
  return { segs: buildBranchSegs(entry, seed, density, w, h), hold: 0, density }
}

export function stepBranch(data: BranchData, state: CatalogVisualState, speed: number, dt: number) {
  const { entry, seed, width: w, height: h } = state
  const allFull = data.segs.every(s => s.grow >= 1)
  if (allFull) {
    data.hold += dt * speed
    if (data.hold >= 1.8) {
      data.segs = buildBranchSegs(entry, seed + Math.floor(state.time * 3), data.density, w, h)
      data.hold = 0
    }
    return
  }
  for (const s of data.segs) {
    if (s.grow < 1) s.grow = Math.min(1, s.grow + dt * speed * s.rate)
  }
}

export function drawBranch(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: BranchData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  data.segs.forEach((s, i) => {
    const pulse = s.grow >= 1 ? 0.88 + 0.12 * Math.sin(state.time * 2.4 + i * 0.7) : s.grow
    const x2 = s.x1 + (s.x2 - s.x1) * s.grow
    const y2 = s.y1 + (s.y2 - s.y1) * s.grow
    ctx.strokeStyle = hsl(entry, 8, 52, 0.35 * pulse)
    ctx.lineWidth = scaled(2.2, state.scale)
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  })
  ctx.restore()
}

// --- Flock (boids) ---
type Boid = { x: number, y: number, vx: number, vy: number }
type FlockData = { boids: Boid[] }

export function createFlock(entry: CatalogEntry, seed: number, density: number, w: number, h: number): FlockData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 35, 55, 90)
  const boids: Boid[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 23)
    const { x, y } = randomInCanvas(r, w, h)
    const ang = r.range(0, Math.PI * 2)
    const sp = scaled(r.range(25, 55), scale)
    boids.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp })
  }
  return { boids }
}

export function stepFlock(data: FlockData, state: CatalogVisualState, speed: number, dt: number) {
  const { boids } = data
  const { width: w, height: h, scale } = state
  const maxSp = scaled(80, scale)
  for (let i = 0; i < boids.length; i++) {
    const b = boids[i]
    let ax = 0
    let ay = 0
    let cx = 0
    let cy = 0
    let nx = 0
    let ny = 0
    let n = 0
    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue
      const o = boids[j]
      const dx = o.x - b.x
      const dy = o.y - b.y
      const d2 = dx * dx + dy * dy
      const r = scaled(90, scale)
      if (d2 < r * r && d2 > 1) {
        ax -= dx / d2 * 8000
        ay -= dy / d2 * 8000
        cx += o.x
        cy += o.y
        nx += o.vx
        ny += o.vy
        n++
      }
    }
    if (n > 0) {
      cx = (cx / n - b.x) * 0.015
      cy = (cy / n - b.y) * 0.015
      nx = (nx / n - b.vx) * 0.04
      ny = (ny / n - b.vy) * 0.04
    }
    b.vx += (ax * 0.4 + cx + nx) * dt * speed
    b.vy += (ay * 0.4 + cy + ny) * dt * speed
    const sp = Math.hypot(b.vx, b.vy) || 1
    if (sp > maxSp) {
      b.vx = (b.vx / sp) * maxSp
      b.vy = (b.vy / sp) * maxSp
    }
    b.x += b.vx * dt * speed
    b.y += b.vy * dt * speed
    if (b.x < 0) b.x = w
    if (b.x > w) b.x = 0
    if (b.y < 0) b.y = h
    if (b.y > h) b.y = 0
  }
}

export function drawFlock(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: FlockData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of data.boids) {
    ctx.fillStyle = hsl(entry, (b.vx + b.vy) * 0.08, 62, 0.55)
    ctx.beginPath()
    ctx.arc(b.x, b.y, scaled(2.2, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Smoke ---
type SmokePuff = { x: number, y: number, r: number, vy: number, phase: number }
type SmokeData = { puffs: SmokePuff[] }

export function createSmoke(entry: CatalogEntry, seed: number, density: number, w: number, h: number): SmokeData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const n = particleCount(density, 12, 18, 28)
  const puffs: SmokePuff[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 31)
    puffs.push({
      x: r.range(w * 0.05, w * 0.95),
      y: r.range(h * 0.35, h * 0.95),
      r: r.range(lim * 0.08, lim * 0.18),
      vy: scaled(r.range(-25, -12), scale),
      phase: r.range(0, Math.PI * 2),
    })
  }
  return { puffs }
}

export function stepSmoke(data: SmokeData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h } = state
  for (const p of data.puffs) {
    p.y += p.vy * dt * speed
    p.x += Math.sin(state.time * 0.8 + p.phase) * scaled(12, state.scale) * dt
    if (p.y < -p.r) {
      p.y = h + p.r * 0.5
      p.x = w * (0.2 + ((Math.sin(state.time * 1.7 + p.phase) + 1) * 0.5) * 0.6)
    }
  }
}

export function drawSmoke(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: SmokeData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.puffs) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
    g.addColorStop(0, hsl(entry, 0, 70, 0.12))
    g.addColorStop(0.5, hsl(entry, 5, 55, 0.06))
    g.addColorStop(1, hsl(entry, 10, 40, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Ripple ---
type RippleRing = { x: number, y: number, r: number, max: number, life: number }
type RippleData = { rings: RippleRing[], spawn: number }

export function createRipple(entry: CatalogEntry, seed: number, density: number, w: number, h: number): RippleData {
  const { rng } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const rings: RippleRing[] = []
  const count = 6 + Math.round(density * 4)
  for (let i = 0; i < count; i++) {
    const r = rng.fork(i * 11)
    rings.push({
      x: r.range(w * 0.1, w * 0.9),
      y: r.range(h * 0.15, h * 0.85),
      r: r.range(lim * 0.02, lim * 0.08),
      max: r.range(lim * 0.18, lim * 0.38),
      life: r.range(0, 1),
    })
  }
  return { rings, spawn: 0.8 / (0.5 + density) }
}

export function stepRipple(data: RippleData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h, scale, seed } = state
  data.spawn -= dt * speed
  if (data.spawn <= 0) {
    data.spawn = 0.55
    const rng = createRng(seed + Math.floor(state.time * 13))
    const lim = viewportMin(w, h)
    data.rings.push({
      x: rng.range(w * 0.1, w * 0.9),
      y: rng.range(h * 0.15, h * 0.85),
      r: lim * 0.01,
      max: rng.range(lim * 0.18, lim * 0.38),
      life: 0,
    })
    if (data.rings.length > 12) data.rings.shift()
  }
  for (const ring of data.rings) {
    ring.life += dt * speed
    ring.r += scaled(45, scale) * dt * speed
  }
  data.rings = data.rings.filter(r => r.r < r.max)
}

export function drawRipple(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: RippleData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const ring of data.rings) {
    const t = 1 - ring.r / ring.max
    ctx.strokeStyle = hsl(entry, 15, 65, Math.max(0.25, 0.6 * t))
    ctx.lineWidth = scaled(2.5, state.scale)
    ctx.beginPath()
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

// --- Flame ---
type FlameTongue = { x: number, phase: number, amp: number, h: number }
type FlameData = { tongues: FlameTongue[] }

export function createFlame(entry: CatalogEntry, seed: number, density: number, w: number, h: number): FlameData {
  const { rng } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const n = Math.round(14 + density * 22)
  const tongues: FlameTongue[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 29)
    tongues.push({
      x: r.range(w * 0.02, w * 0.98),
      phase: r.range(0, Math.PI * 2),
      amp: r.range(lim * 0.006, lim * 0.024),
      h: r.range(lim * 0.35, lim * 0.78),
    })
  }
  return { tongues }
}

export function stepFlame(_data: FlameData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawFlame(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: FlameData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, time } = state
  const lim = viewportMin(w, h)
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const baseY = h
  const baseW = lim * 0.016
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const t of data.tongues) {
    const sway = Math.sin(time * 3 + t.phase) * t.amp
    const tipY = baseY - t.h * (0.85 + Math.sin(time * 5 + t.phase) * 0.12)
    const g = ctx.createLinearGradient(t.x, baseY, t.x + sway, tipY)
    g.addColorStop(0, hsl(entry, -10, 55, 0.5))
    g.addColorStop(0.4, hsl(entry, 5, 62, 0.35))
    g.addColorStop(1, hsl(entry, 20, 70, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(t.x - baseW, baseY)
    ctx.quadraticCurveTo(t.x + sway * 0.5, baseY - t.h * 0.5, t.x + sway, tipY)
    ctx.quadraticCurveTo(t.x + sway * 0.5 + baseW * 0.75, baseY - t.h * 0.3, t.x + baseW, baseY)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// --- Crystal ---
type CrystalData = { rot: number, arms: number }

export function createCrystal(entry: CatalogEntry, seed: number, _density: number, _w: number, _h: number): CrystalData {
  const { rng } = baseCtx(entry, seed, 100, 100)
  return { rot: 0, arms: 5 + entry.variant + rng.int(0, 2) }
}

export function stepCrystal(data: CrystalData, _state: CatalogVisualState, speed: number, dt: number) {
  data.rot += dt * speed * 0.15
}

export function drawCrystal(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: CrystalData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const cx = w / 2
  const cy = h / 2
  const len = Math.min(w, h) * 0.35
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(data.rot)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < data.arms; i++) {
    const a = (i / data.arms) * Math.PI * 2
    for (let j = 0; j < 3; j++) {
      const branch = len * (0.35 + j * 0.22)
      const ba = a + (j - 1) * 0.35
      ctx.strokeStyle = hsl(entry, i * 8 + j * 4, 68, 0.25 - j * 0.05)
      ctx.lineWidth = scaled(1.2, scale)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(ba) * branch, Math.sin(ba) * branch)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// --- Kaleidoscope ---
type KaleidoPart = { x: number, y: number, vx: number, vy: number }
type KaleidoData = { parts: KaleidoPart[], folds: number }

export function createKaleidoscope(entry: CatalogEntry, seed: number, density: number, w: number, h: number): KaleidoData {
  const { rng } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 20, 40, 60)
  const parts: KaleidoPart[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 37)
    parts.push({
      x: r.range(-1, 1),
      y: r.range(-1, 1),
      vx: r.range(-0.3, 0.3),
      vy: r.range(-0.3, 0.3),
    })
  }
  return { parts, folds: 6 + entry.variant * 2 }
}

export function stepKaleidoscope(data: KaleidoData, _state: CatalogVisualState, speed: number, dt: number) {
  for (const p of data.parts) {
    p.x += p.vx * dt * speed * 0.15
    p.y += p.vy * dt * speed * 0.15
    const d = Math.hypot(p.x, p.y)
    if (d > 1) {
      p.x /= d
      p.y /= d
    }
  }
}

export function drawKaleidoscope(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: KaleidoData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const cx = w / 2
  const cy = h / 2
  const rad = Math.min(w, h) * 0.42
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.parts) {
    const px = p.x * rad
    const py = p.y * rad
    for (let f = 0; f < data.folds; f++) {
      const ang = (f / data.folds) * Math.PI * 2
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      const rx = px * c - py * s
      const ry = px * s + py * c
      ctx.fillStyle = hsl(entry, f * 6, 65, 0.45)
      ctx.beginPath()
      ctx.arc(rx, ry, scaled(2.5, scale), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// --- Metaball ---
type MetaBlob = { x: number, y: number, vx: number, vy: number, r: number }
type MetaballData = { blobs: MetaBlob[] }

export function createMetaball(entry: CatalogEntry, seed: number, density: number, w: number, h: number): MetaballData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const n = Math.round(3 + density * 3)
  const blobs: MetaBlob[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 41)
    blobs.push({
      x: r.range(w * 0.15, w * 0.85),
      y: r.range(h * 0.15, h * 0.85),
      vx: scaled(r.range(-20, 20), scale),
      vy: scaled(r.range(-20, 20), scale),
      r: r.range(lim * 0.08, lim * 0.16),
    })
  }
  return { blobs }
}

export function stepMetaball(data: MetaballData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h } = state
  for (const b of data.blobs) {
    b.x += b.vx * dt * speed
    b.y += b.vy * dt * speed
    if (b.x < b.r || b.x > w - b.r) b.vx *= -1
    if (b.y < b.r || b.y > h - b.r) b.vy *= -1
  }
}

export function drawMetaball(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: MetaballData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const step = Math.max(8, Math.floor(Math.min(w, h) / 80))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      let sum = 0
      for (const b of data.blobs) {
        const dx = x - b.x
        const dy = y - b.y
        sum += (b.r * b.r) / (dx * dx + dy * dy + 1)
      }
      if (sum > 1.1) {
        const a = Math.min(0.5, (sum - 1) * 0.15)
        ctx.fillStyle = hsl(entry, sum * 8, 58, a)
        ctx.fillRect(x, y, step, step)
      }
    }
  }
  ctx.restore()
}

// --- Voronoi ---
type VorSite = { x: number, y: number, vx: number, vy: number }
type VoronoiData = { sites: VorSite[], cols: number, rows: number }

export function createVoronoi(entry: CatalogEntry, seed: number, density: number, w: number, h: number): VoronoiData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const cols = Math.min(14, Math.round(8 + density * 4))
  const rows = Math.min(10, Math.round(6 + density * 3))
  const sites: VorSite[] = []
  for (let i = 0; i < cols * rows; i++) {
    const r = rng.fork(i * 19)
    sites.push({
      x: ((i % cols) + 0.5) * (w / cols) + r.range(-8, 8),
      y: (Math.floor(i / cols) + 0.5) * (h / rows) + r.range(-8, 8),
      vx: scaled(r.range(-8, 8), scale),
      vy: scaled(r.range(-8, 8), scale),
    })
  }
  return { sites, cols, rows }
}

export function stepVoronoi(data: VoronoiData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h } = state
  for (const s of data.sites) {
    s.x += s.vx * dt * speed
    s.y += s.vy * dt * speed
    if (s.x < 0 || s.x > w) s.vx *= -1
    if (s.y < 0 || s.y > h) s.vy *= -1
  }
}

function voronoiEdgeSample(sites: VorSite[], x: number, y: number) {
  let d1 = Infinity
  let d2 = Infinity
  let i1 = 0
  for (let i = 0; i < sites.length; i++) {
    const dx = x - sites[i].x
    const dy = y - sites[i].y
    const d = dx * dx + dy * dy
    if (d < d1) {
      d2 = d1
      d1 = d
      i1 = i
    } else if (d < d2) {
      d2 = d
    }
  }
  return { edge: d2 - d1 < 900, i1 }
}

export function drawVoronoi(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: VoronoiData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const step = Math.max(6, Math.floor(Math.min(w, h) / 100))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const { edge, i1 } = voronoiEdgeSample(data.sites, x, y)
      if (edge) {
        ctx.fillStyle = hsl(entry, i1 * 3, 58, 0.35)
        ctx.fillRect(x, y, step, step)
      }
    }
  }
  ctx.restore()
}

// --- Reaction (Gray-Scott) ---
const REACTION_PARAMS = [
  { f: 0.0545, k: 0.062 },
  { f: 0.0367, k: 0.0649 },
  { f: 0.078, k: 0.061 },
] as const

function reactionParams(variant: number) {
  return REACTION_PARAMS[variant % REACTION_PARAMS.length]
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

type ReactionData = {
  w: number
  h: number
  a: Float32Array
  b: Float32Array
  nextA: Float32Array
  nextB: Float32Array
  tick: number
  offscreen: HTMLCanvasElement | null
}

function seedReactionGrid(
  w: number,
  h: number,
  b: Float32Array,
  rng: Rng,
) {
  const n = w * h
  for (let blob = 0; blob < 5; blob++) {
    const r = rng.fork(blob * 43 + 7)
    const cx = Math.floor(r.range(w * 0.18, w * 0.82))
    const cy = Math.floor(r.range(h * 0.18, h * 0.82))
    const rad = r.int(2, 5)
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue
        const x = cx + dx
        const y = cy + dy
        if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) continue
        b[y * w + x] = 1
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (rng.next() > 0.94) b[i] = rng.range(0.35, 1)
  }
}

export function createReaction(entry: CatalogEntry, seed: number, _density: number, cw: number, ch: number): ReactionData {
  const { rng } = baseCtx(entry, seed, cw, ch)
  const w = Math.min(96, Math.max(48, Math.floor(cw / 14)))
  const h = Math.min(54, Math.max(27, Math.floor(ch / 14)))
  const n = w * h
  const a = new Float32Array(n).fill(1)
  const b = new Float32Array(n)
  seedReactionGrid(w, h, b, rng)
  return {
    w,
    h,
    a,
    b,
    nextA: new Float32Array(n),
    nextB: new Float32Array(n),
    tick: 0,
    offscreen: null,
  }
}

export function stepReaction(data: ReactionData, state: CatalogVisualState, speed: number, dt: number) {
  data.tick += dt * speed
  if (data.tick < 0.04) return
  data.tick = 0
  const { w, h, a, b, nextA, nextB } = data
  const { f, k } = reactionParams(state.entry.variant)
  const step = 0.16
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lapA = a[i - 1] + a[i + 1] + a[i - w] + a[i + w] - 4 * a[i]
      const lapB = b[i - 1] + b[i + 1] + b[i - w] + b[i + w] - 4 * b[i]
      const reaction = a[i] * b[i] * b[i]
      nextB[i] = b[i] + (0.5 * lapB + reaction - (k + f) * b[i]) * step
      nextA[i] = a[i] + (lapA - reaction + f * (1 - a[i])) * step
    }
  }
  for (let i = 0; i < a.length; i++) {
    a[i] = nextA[i]
    b[i] = nextB[i]
  }
}

export function drawReaction(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: ReactionData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: cw, height: ch } = state
  state.firstFrame = clearFrame(ctx, cw, ch, pal, state.firstFrame)
  const { w, h, b } = data
  if (!data.offscreen) {
    data.offscreen = document.createElement('canvas')
    data.offscreen.width = w
    data.offscreen.height = h
  }
  const octx = data.offscreen.getContext('2d')
  if (!octx) return
  const img = octx.createImageData(w, h)
  for (let i = 0; i < b.length; i++) {
    const v = Math.max(0, Math.min(1, b[i]))
    const o = i * 4
    if (v < 0.04) {
      img.data[o + 3] = 0
      continue
    }
    const hue = pal.hue + v * pal.accent
    const { r, g, b: blue } = hslToRgb(hue, 0.72, 0.42 + v * 0.28)
    img.data[o] = r
    img.data[o + 1] = g
    img.data[o + 2] = blue
    img.data[o + 3] = Math.floor(70 + v * 185)
  }
  octx.putImageData(img, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(data.offscreen, 0, 0, cw, ch)
  ctx.restore()
}

// --- Fractal tree ---
type FractalData = { angle: number }

export function createFractal(_entry: CatalogEntry, _seed: number, _density: number, _w: number, _h: number): FractalData {
  return { angle: 0 }
}

function drawTreeBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  ang: number,
  depth: number,
  entry: CatalogEntry,
  scale: number,
) {
  if (depth <= 0 || len < scaled(3, scale)) return
  const x2 = x + Math.cos(ang) * len
  const y2 = y + Math.sin(ang) * len
  ctx.strokeStyle = hsl(entry, depth * 6, 48 + depth * 4, 0.2 + depth * 0.04)
  ctx.lineWidth = scaled(0.5 + depth * 0.4, scale)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  const branch = 0.72
  drawTreeBranch(ctx, x2, y2, len * branch, ang - 0.45, depth - 1, entry, scale)
  drawTreeBranch(ctx, x2, y2, len * branch, ang + 0.38, depth - 1, entry, scale)
}

export function stepFractal(data: FractalData, _state: CatalogVisualState, speed: number, dt: number) {
  data.angle += dt * speed * 0.08
}

export function drawFractal(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: FractalData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  const len = Math.min(w, h) * 0.22
  drawTreeBranch(ctx, w / 2, h * 0.92, len, -Math.PI / 2 + Math.sin(data.angle) * 0.15, 9, entry, scale)
  ctx.restore()
}

// --- Magnetic ---
type MagneticPole = {
  bx: number
  by: number
  charge: number
  orbitR: number
  orbitPhase: number
  orbitSpeed: number
}

type MagneticSeed = { x: number, y: number, phase: number }

type MagneticData = { poles: MagneticPole[], seeds: MagneticSeed[] }

function magneticFieldDir(
  poles: { x: number, y: number, charge: number }[],
  x: number,
  y: number,
  soft: number,
  strength: number,
) {
  let fx = 0
  let fy = 0
  for (const p of poles) {
    const dx = x - p.x
    const dy = y - p.y
    const d2 = dx * dx + dy * dy + soft
    const d = Math.sqrt(d2)
    const f = (p.charge * strength) / d2
    fx += (dx / d) * f
    fy += (dy / d) * f
  }
  const mag = Math.hypot(fx, fy) || 1
  return { fx: fx / mag, fy: fy / mag }
}

function magneticPolesAt(data: MagneticData, t: number) {
  return data.poles.map(p => ({
    x: p.bx + Math.cos(t * p.orbitSpeed + p.orbitPhase) * p.orbitR,
    y: p.by + Math.sin(t * p.orbitSpeed * 0.75 + p.orbitPhase * 1.1) * p.orbitR * 0.7,
    charge: p.charge,
  }))
}

export function createMagnetic(entry: CatalogEntry, seed: number, density: number, w: number, h: number): MagneticData {
  const { rng } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const r0 = rng.fork(0)
  const r1 = rng.fork(1)
  const opposite = entry.variant % 2 === 0
  const poles: MagneticPole[] = [
    {
      bx: r0.range(w * 0.22, w * 0.42),
      by: r0.range(h * 0.35, h * 0.65),
      charge: 1,
      orbitR: r0.range(lim * 0.018, lim * 0.045),
      orbitPhase: r0.range(0, Math.PI * 2),
      orbitSpeed: r0.range(0.08, 0.16),
    },
    {
      bx: r1.range(w * 0.58, w * 0.78),
      by: r1.range(h * 0.35, h * 0.65),
      charge: opposite ? -1 : 1,
      orbitR: r1.range(lim * 0.018, lim * 0.045),
      orbitPhase: r1.range(0, Math.PI * 2),
      orbitSpeed: r1.range(0.08, 0.16),
    },
  ]
  const n = particleCount(density, 18, 28, 52)
  const seeds: MagneticSeed[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 13 + 7)
    const edge = r.int(0, 3)
    let x: number
    let y: number
    if (edge === 0) {
      x = r.range(0.05, 0.95) * w
      y = r.range(0.02, 0.12) * h
    } else if (edge === 1) {
      x = r.range(0.88, 0.98) * w
      y = r.range(0.08, 0.92) * h
    } else if (edge === 2) {
      x = r.range(0.05, 0.95) * w
      y = r.range(0.88, 0.98) * h
    } else {
      x = r.range(0.02, 0.12) * w
      y = r.range(0.08, 0.92) * h
    }
    seeds.push({ x, y, phase: r.range(0, 1) })
  }
  return { poles, seeds }
}

export function stepMagnetic(_data: MagneticData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawMagnetic(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: MagneticData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale, time } = state
  const lim = viewportMin(w, h)
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineWidth = scaled(1, scale)
  const soft = lim * lim * 0.0004
  const strength = lim * lim * 0.014
  const stepLen = scaled(6, scale)
  const poles = magneticPolesAt(data, time)
  for (let si = 0; si < data.seeds.length; si++) {
    const seed = data.seeds[si]
    const drift = time * 0.04 + seed.phase * Math.PI * 2
    let x = seed.x + Math.sin(drift) * scaled(8, scale)
    let y = seed.y + Math.cos(drift * 0.8) * scaled(6, scale)
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let step = 0; step < 90; step++) {
      const { fx, fy } = magneticFieldDir(poles, x, y, soft, strength)
      x += fx * stepLen
      y += fy * stepLen
      ctx.lineTo(x, y)
      if (x < -stepLen || x > w + stepLen || y < -stepLen || y > h + stepLen) break
    }
    const pulse = 0.16 + 0.08 * Math.sin(time * 1.6 + si * 0.5)
    ctx.strokeStyle = hsl(entry, si * 4, 58, pulse)
    ctx.stroke()
  }
  ctx.restore()
}

// --- Attractor (strange loop trace) ---
type AttractorPoint = { x: number, y: number }
type AttractorData = { t: number, trail: AttractorPoint[] }

function attractorDist(a: AttractorPoint, b: AttractorPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function attractorLineDist(p: AttractorPoint, a: AttractorPoint, b: AttractorPoint) {
  const len = attractorDist(a, b) || 1
  return Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / len
}

function attractorShouldSkipStraight(
  trail: AttractorPoint[],
  runStart: number,
  i: number,
  maxStraight: number,
  maxDev: number,
) {
  if (i - runStart < 2) return false
  const start = trail[runStart]
  const end = trail[i]
  const chord = attractorDist(end, start)
  if (chord <= maxStraight) return false
  let dev = 0
  for (let j = runStart + 1; j < i; j++) {
    dev = Math.max(dev, attractorLineDist(trail[j], start, end))
  }
  return dev < maxDev
}

/** Omit stroke chords that cut across the knot (long nearly-collinear runs). */
function strokeAttractorTrail(
  ctx: CanvasRenderingContext2D,
  trail: AttractorPoint[],
  scale: number,
) {
  const n = trail.length
  if (n < 2) return
  const maxStraight = scaled(90, scale)
  const maxDev = scaled(3, scale)
  const omit = new Uint8Array(n)
  let runStart = 0
  for (let i = 1; i < n; i++) {
    if (attractorShouldSkipStraight(trail, runStart, i, maxStraight, maxDev)) {
      for (let j = runStart + 1; j <= i; j++) omit[j] = 1
    } else if (i >= 2) {
      const a = trail[i - 2]
      const b = trail[i - 1]
      const p = trail[i]
      const v1x = b.x - a.x
      const v1y = b.y - a.y
      const v2x = p.x - b.x
      const v2y = p.y - b.y
      const l1 = Math.hypot(v1x, v1y) || 1
      const l2 = Math.hypot(v2x, v2y) || 1
      const dot = (v1x * v2x + v1y * v2y) / (l1 * l2)
      if (dot < 0.995) runStart = i
    }
  }
  ctx.beginPath()
  ctx.moveTo(trail[0].x, trail[0].y)
  for (let i = 1; i < n; i++) {
    if (omit[i]) continue
    const p = trail[i]
    if (omit[i - 1]) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
}

function deJongPoint(t: number, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * 0.42
  const x = Math.sin(2.1 * t) - Math.cos(1.3 * t)
  const y = Math.sin(1.7 * t) - Math.cos(2.2 * t)
  return { x: cx + x * radius * 0.36, y: cy + y * radius * 0.36 }
}

export function createAttractor(_entry: CatalogEntry, seed: number, _density: number, w: number, h: number): AttractorData {
  const rng = createRng(seed)
  const t0 = rng.range(0, Math.PI * 2)
  const trail: { x: number, y: number }[] = []
  for (let i = 0; i < 520; i++) trail.push(deJongPoint(t0 + i * 0.045, w, h))
  return { t: t0 + 520 * 0.045, trail }
}

export function stepAttractor(data: AttractorData, state: CatalogVisualState, speed: number, dt: number) {
  const steps = Math.max(1, Math.round(speed * dt * 90))
  for (let i = 0; i < steps; i++) {
    data.t += 0.045
    data.trail.push(deJongPoint(data.t, state.width, state.height))
  }
  while (data.trail.length > 520) data.trail.shift()
}

export function drawAttractor(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: AttractorData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h } = state
  ctx.fillStyle = `rgb(${pal.bg.r},${pal.bg.g},${pal.bg.b})`
  ctx.fillRect(0, 0, w, h)
  state.firstFrame = false
  if (data.trail.length < 2) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  strokeAttractorTrail(ctx, data.trail, state.scale)
  ctx.strokeStyle = hsl(entry, 20, 75, 0.55)
  ctx.lineWidth = scaled(1.8, state.scale)
  ctx.stroke()
  for (let i = 0; i < data.trail.length; i += 3) {
    const p = data.trail[i]
    const t = i / data.trail.length
    ctx.fillStyle = hsl(entry, 20 + t * 15, 72, 0.35 + t * 0.35)
    ctx.beginPath()
    ctx.arc(p.x, p.y, scaled(1.8, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Nebula ---
type NebulaCloud = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  hueOff: number
  phase: number
}
type NebulaData = { clouds: NebulaCloud[] }

export function createNebula(entry: CatalogEntry, seed: number, density: number, w: number, h: number): NebulaData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const n = Math.round(4 + density * 5)
  const clouds: NebulaCloud[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 53)
    clouds.push({
      x: r.range(0, w),
      y: r.range(0, h),
      r: r.range(lim * 0.1, lim * 0.22),
      vx: scaled(r.range(-22, 22), scale),
      vy: scaled(r.range(-16, 16), scale),
      hueOff: r.range(-15, 25),
      phase: r.range(0, Math.PI * 2),
    })
  }
  return { clouds }
}

export function stepNebula(data: NebulaData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h, scale, time } = state
  for (const c of data.clouds) {
    c.x += c.vx * dt * speed
    c.y += c.vy * dt * speed
    c.x += Math.sin(time * 0.65 + c.phase) * scaled(18, scale) * dt * speed
    c.y += Math.cos(time * 0.45 + c.phase * 1.2) * scaled(12, scale) * dt * speed
    if (c.x < -c.r) c.x = w + c.r
    if (c.x > w + c.r) c.x = -c.r
    if (c.y < -c.r) c.y = h + c.r
    if (c.y > h + c.r) c.y = -c.r
  }
}

export function drawNebula(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: NebulaData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { time } = state
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const c of data.clouds) {
    const pulse = 0.9 + 0.1 * Math.sin(time * 0.7 + c.phase)
    const r = c.r * pulse
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r)
    g.addColorStop(0, hsl(entry, c.hueOff, 55, 0.14 * pulse))
    g.addColorStop(0.6, hsl(entry, c.hueOff + 10, 45, 0.06 * pulse))
    g.addColorStop(1, hsl(entry, c.hueOff + 20, 35, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Horizon ---
type HorizonStar = {
  nx: number
  ny: number
  z: number
  tw: number
  twRate: number
  twAmp: number
  /** 0 = dim dot, 1 = soft halo, 2 = bright with cross flare */
  style: 0 | 1 | 2
  tilt: number
}

type HorizonData = { peaks: number[], stars: HorizonStar[] }

function horizonStarTwinkle(s: HorizonStar, t: number) {
  const slow = Math.sin(t * s.twRate * 0.55 + s.tw)
  const mid = Math.sin(t * s.twRate * 1.85 + s.tw * 1.37)
  return slow * 0.6 + mid * 0.4
}

export function createHorizon(entry: CatalogEntry, seed: number, density: number, w: number, h: number): HorizonData {
  const { rng } = baseCtx(entry, seed, w, h)
  const peaks: number[] = []
  const n = 12 + entry.variant * 3
  for (let i = 0; i <= n; i++) peaks.push(rng.range(0.15, 0.55))

  const starCount = particleCount(density, 40, 55, 100)
  const stars: HorizonStar[] = []
  for (let i = 0; i < starCount; i++) {
    const r = rng.fork(i * 23 + 7)
    const z = r.range(0.15, 1)
    let style: 0 | 1 | 2 = 0
    if (z > 0.72 && r.next() < 0.35) style = 2
    else if (z > 0.45 && r.next() < 0.4) style = 1
    stars.push({
      nx: r.range(0, 1),
      ny: r.range(0, 0.58),
      z,
      tw: r.range(0, Math.PI * 2),
      twRate: r.range(0.35, 2.1),
      twAmp: r.range(0.35, 1),
      style,
      tilt: r.range(0, Math.PI * 2),
    })
  }
  return { peaks, stars }
}

export function stepHorizon(_data: HorizonData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawHorizon(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: HorizonData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, time, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const horizonY = h * 0.62
  const skyH = horizonY * 0.58
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const s of data.stars) {
    const x = s.nx * w
    const y = s.ny * skyH
    const tw = horizonStarTwinkle(s, time)
    const amp = s.twAmp * (0.45 + s.z * 0.55)
    const a = Math.min(0.32, Math.max(0.03, 0.06 + s.z * 0.14 + tw * amp * 0.08))
    const r = scaled(s.z * (0.45 + (0.5 + tw * 0.5) * 0.55), scale)

    if (s.style >= 1) {
      ctx.fillStyle = hsl(entry, 0, 72 + s.z * 12, a * 0.3)
      ctx.beginPath()
      ctx.arc(x, y, r * (s.style === 2 ? 2.4 : 1.7), 0, Math.PI * 2)
      ctx.fill()
    }

    if (s.style === 2) {
      const flare = a * 0.45
      const len = r * 2.8
      ctx.strokeStyle = hsl(entry, 0, 82, flare)
      ctx.lineWidth = scaled(0.45, scale)
      ctx.beginPath()
      ctx.moveTo(x - len, y)
      ctx.lineTo(x + len, y)
      ctx.moveTo(x, y - len)
      ctx.lineTo(x, y + len)
      ctx.stroke()
    }

    ctx.fillStyle = hsl(entry, 0, 70 + s.z * 18, a)
    ctx.beginPath()
    if (s.style === 0 && s.z < 0.55) {
      ctx.ellipse(x, y, r * 0.75, r * 1.15, s.tilt, 0, Math.PI * 2)
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.fillStyle = `rgb(${pal.bg.r + 4},${pal.bg.g + 4},${pal.bg.b + 6})`
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let i = 0; i < data.peaks.length; i++) {
    const x = (i / (data.peaks.length - 1)) * w
    const y = horizonY - data.peaks[i] * h * 0.35
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// --- Circuit ---
type CircuitPulse = { t: number, path: number }
type CircuitData = { pulses: CircuitPulse[], paths: { x1: number, y1: number, x2: number, y2: number }[] }

export function createCircuit(entry: CatalogEntry, seed: number, density: number, w: number, h: number): CircuitData {
  const { rng } = baseCtx(entry, seed, w, h)
  const paths: CircuitData['paths'] = []
  const cols = 8
  const rows = 5
  const gw = w / cols
  const gh = h / rows
  for (let i = 0; i < cols * rows * 2; i++) {
    const r = rng.fork(i * 7)
    const cx = (r.int(0, cols - 1) + 0.5) * gw
    const cy = (r.int(0, rows - 1) + 0.5) * gh
    if (r.next() > 0.5) {
      paths.push({ x1: cx, y1: cy, x2: cx + gw * r.range(0.5, 1.5), y2: cy })
    } else {
      paths.push({ x1: cx, y1: cy, x2: cx, y2: cy + gh * r.range(0.5, 1.5) })
    }
  }
  const n = Math.round(3 + density * 6)
  const pulses: CircuitPulse[] = []
  for (let i = 0; i < n; i++) {
    pulses.push({ t: rng.range(0, 1), path: rng.int(0, paths.length - 1) })
  }
  return { paths, pulses }
}

export function stepCircuit(data: CircuitData, _state: CatalogVisualState, speed: number, dt: number) {
  for (const p of data.pulses) {
    p.t += dt * speed * 0.35
    if (p.t > 1) p.t = 0
  }
}

export function drawCircuit(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: CircuitData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineWidth = scaled(1, scale)
  for (const path of data.paths) {
    ctx.strokeStyle = hsl(entry, 0, 50, 0.15)
    ctx.beginPath()
    ctx.moveTo(path.x1, path.y1)
    ctx.lineTo(path.x2, path.y2)
    ctx.stroke()
  }
  for (const p of data.pulses) {
    const path = data.paths[p.path % data.paths.length]
    if (!path) continue
    const x = path.x1 + (path.x2 - path.x1) * p.t
    const y = path.y1 + (path.y2 - path.y1) * p.t
    ctx.fillStyle = hsl(entry, 30, 68, 0.75)
    ctx.beginPath()
    ctx.arc(x, y, scaled(3, scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Fabric ---
type FabricData = { strips: { x: number, phase: number, amp: number }[] }

export function createFabric(entry: CatalogEntry, seed: number, density: number, w: number, h: number): FabricData {
  const { rng } = baseCtx(entry, seed, w, h)
  const lim = viewportMin(w, h)
  const n = Math.round(10 + density * 14)
  const strips: FabricData['strips'] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 13)
    strips.push({
      x: ((i + 0.5) / n) * w,
      phase: r.range(0, Math.PI * 2),
      amp: r.range(lim * 0.012, lim * (0.028 + entry.variant * 0.004)),
    })
  }
  return { strips }
}

export function stepFabric(_data: FabricData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawFabric(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: FabricData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale, time } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < data.strips.length; i++) {
    const s = data.strips[i]
    ctx.strokeStyle = hsl(entry, i * 3, 55, 0.2)
    ctx.lineWidth = scaled(1.5, scale)
    ctx.beginPath()
    for (let y = 0; y <= h; y += scaled(8, scale)) {
      const wave = Math.sin(y * 0.015 + time * 1.2 + s.phase) * s.amp
      const x = s.x + wave
      if (y === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

// --- Blossom ---
type Petal = { x: number, y: number, vx: number, vy: number, rot: number, spin: number, size: number }
type BlossomData = { petals: Petal[] }

export function createBlossom(entry: CatalogEntry, seed: number, density: number, w: number, h: number): BlossomData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 25, 45, 80)
  const petals: Petal[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 61)
    petals.push({
      x: r.range(0, w),
      y: r.range(-h * 0.2, h),
      vx: scaled(r.range(-12, 12), scale),
      vy: scaled(r.range(18, 45), scale),
      rot: r.range(0, Math.PI * 2),
      spin: r.range(-2, 2),
      size: scaled(r.range(4, 9), scale),
    })
  }
  return { petals }
}

export function stepBlossom(data: BlossomData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h, seed } = state
  const rng = createRng(seed + Math.floor(state.time * 11))
  for (let i = 0; i < data.petals.length; i++) {
    const p = data.petals[i]
    p.x += (p.vx + Math.sin(state.time + p.rot) * 8) * dt * speed
    p.y += p.vy * dt * speed
    p.rot += p.spin * dt * speed
    if (p.y > h + 20) {
      p.y = -20
      p.x = rng.fork(i * 3).range(0, w)
    }
  }
}

export function drawBlossom(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: BlossomData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.petals) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = hsl(entry, 12, 68, 0.45)
    ctx.beginPath()
    ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// --- Lightning ---
type Bolt = { points: { x: number, y: number }[], life: number, max: number }
type LightningData = { bolts: Bolt[], cooldown: number }

export function createLightning(_entry: CatalogEntry, seed: number, _density: number, w: number, h: number): LightningData {
  const rng = createRng(seed)
  return {
    bolts: [buildBolt(w, h, rng), buildBolt(w, h, rng.fork(99))],
    cooldown: 0.4,
  }
}

function buildBolt(w: number, h: number, rng: Rng): Bolt {
  const points: { x: number, y: number }[] = []
  let x = rng.range(w * 0.3, w * 0.7)
  let y = 0
  points.push({ x, y })
  while (y < h * 0.85) {
    y += rng.range(20, 50)
    x += rng.range(-35, 35)
    points.push({ x, y })
    if (rng.next() > 0.75) {
      let bx = x
      let by = y
      for (let i = 0; i < 3; i++) {
        by += rng.range(10, 25)
        bx += rng.range(15, 40)
        points.push({ x: bx, y: by })
      }
    }
  }
  return { points, life: 0, max: 2.5 }
}

export function stepLightning(data: LightningData, state: CatalogVisualState, speed: number, dt: number) {
  data.cooldown -= dt * speed
  if (data.cooldown <= 0) {
    const rng = createRng(state.seed + Math.floor(state.time * 17))
    data.cooldown = 1.2 + rng.range(0, 1.5)
    data.bolts.push(buildBolt(state.width, state.height, rng))
    if (data.bolts.length > 3) data.bolts.shift()
  }
  for (const b of data.bolts) b.life += dt * speed
  data.bolts = data.bolts.filter(b => b.life < b.max)
}

export function drawLightning(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: LightningData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const b of data.bolts) {
    const fade = 1 - b.life / b.max
    ctx.strokeStyle = hsl(entry, 40, 88, 0.85 * fade)
    ctx.lineWidth = scaled(2.5, state.scale)
    ctx.beginPath()
    for (let i = 0; i < b.points.length; i++) {
      const p = b.points[i]
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

// --- Tunnel ---
type TunnelStar = { angle: number, dist: number, speed: number }
type TunnelData = { stars: TunnelStar[] }

export function createTunnel(entry: CatalogEntry, seed: number, density: number, _w: number, _h: number): TunnelData {
  const { rng } = baseCtx(entry, seed, 100, 100)
  const n = particleCount(density, 60, 100, 180)
  const stars: TunnelStar[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 67)
    stars.push({
      angle: r.range(0, Math.PI * 2),
      dist: r.range(0.05, 1),
      speed: r.range(0.4, 1.2),
    })
  }
  return { stars }
}

export function stepTunnel(data: TunnelData, _state: CatalogVisualState, speed: number, dt: number) {
  for (const s of data.stars) {
    s.dist -= s.speed * dt * speed * 0.25
    if (s.dist < 0.02) s.dist = 1
  }
}

export function drawTunnel(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: TunnelData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const cx = w / 2
  const cy = h / 2
  const maxR = Math.min(w, h) * 0.55
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const s of data.stars) {
    const r = (1 - s.dist) * maxR
    const x = cx + Math.cos(s.angle) * r
    const y = cy + Math.sin(s.angle) * r
    const a = (1 - s.dist) * 0.8
    ctx.fillStyle = hsl(entry, s.angle * 20, 70, a)
    ctx.beginPath()
    ctx.arc(x, y, scaled(1 + (1 - s.dist) * 2, scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Breathe (minimal) ---
type BreatheData = { phase: number }

export function createBreathe(_entry: CatalogEntry, _seed: number, _density: number, _w: number, _h: number): BreatheData {
  return { phase: 0 }
}

export function stepBreathe(data: BreatheData, _state: CatalogVisualState, speed: number, dt: number) {
  data.phase += dt * speed * 0.25
}

export function drawBreathe(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: BreatheData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const cx = w / 2
  const cy = h / 2
  const pulse = 0.5 + 0.5 * Math.sin(data.phase)
  const r = Math.min(w, h) * (0.25 + pulse * 0.15)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, hsl(entry, 0, 60, 0.14 + pulse * 0.1))
  g.addColorStop(0.7, hsl(entry, 10, 50, 0.06))
  g.addColorStop(1, hsl(entry, 20, 40, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// --- Granular ---
const GRANULAR_SLOPE_GRAD = 0.15

type Grain = { x: number, y: number, vx: number, vy: number, rest: number }
type GranularData = {
  grains: Grain[]
  spoutX: number
  spoutY: number
  spawnAcc: number
  spawnInterval: number
  spawnIdx: number
  restLimit: number
}

function granularSurfaceY(x: number, w: number, h: number) {
  return h * 0.55 + (x - w / 2) * GRANULAR_SLOPE_GRAD
}

function granularSlopeTangent() {
  const len = Math.hypot(1, GRANULAR_SLOPE_GRAD)
  return { tx: 1 / len, ty: GRANULAR_SLOPE_GRAD / len }
}

function respawnGranularGrain(
  g: Grain,
  rng: Rng,
  data: GranularData,
  scale: number,
  w: number,
) {
  const spread = scaled(14, scale)
  g.x = data.spoutX + rng.range(-spread, spread)
  g.y = data.spoutY
  g.vx = scaled(rng.range(-10, 10), scale)
  g.vy = scaled(rng.range(28, 62), scale)
  g.rest = 0
  if (g.x < 0) g.x = rng.range(0, w * 0.08)
  if (g.x > w) g.x = w - rng.range(0, w * 0.08)
}

export function createGranular(entry: CatalogEntry, seed: number, density: number, w: number, h: number): GranularData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 80, 120, 220)
  const spoutRng = rng.fork(901)
  const spoutX = spoutRng.range(w * 0.38, w * 0.62)
  const spoutY = h * 0.08
  const grains: Grain[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 71)
    const phase = i / n
    let x: number
    let y: number
    let vx: number
    let vy: number
    if (phase < 0.35) {
      x = spoutX + r.range(-scaled(24, scale), scaled(24, scale))
      y = r.range(spoutY, h * 0.42)
      vx = scaled(r.range(-12, 12), scale)
      vy = scaled(r.range(24, 58), scale)
    } else if (phase < 0.72) {
      x = r.range(w * 0.08, w * 0.92)
      y = granularSurfaceY(x, w, h) - scaled(r.range(1, 6), scale)
      const { tx, ty } = granularSlopeTangent()
      const slide = scaled(r.range(8, 28), scale)
      vx = tx * slide
      vy = ty * slide
    } else {
      x = spoutX + r.range(-scaled(8, scale), scaled(8, scale))
      y = spoutY + r.range(0, scaled(4, scale))
      vx = scaled(r.range(-4, 4), scale)
      vy = scaled(r.range(8, 18), scale)
    }
    grains.push({ x, y, vx, vy, rest: r.range(0, 1.2) })
  }
  return {
    grains,
    spoutX,
    spoutY,
    spawnAcc: 0.35,
    spawnInterval: 0.14 / (0.45 + density * 0.85),
    spawnIdx: 0,
    restLimit: 2.4 + (1 - density) * 1.6,
  }
}

export function stepGranular(data: GranularData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h, scale, seed, time } = state
  const rng = createRng(seed + Math.floor(time * 9))
  const { tx, ty } = granularSlopeTangent()
  const grav = scaled(38, scale)
  const slidePull = scaled(42, scale)
  const restLimit = data.restLimit
  const restSpeed = scaled(6, scale) ** 2
  const grainR = scaled(2.2, scale)
  const wind = Math.sin(time * 0.62 + seed * 0.002) * scaled(28, scale)

  data.spawnAcc -= dt * speed
  if (data.spawnAcc <= 0) {
    data.spawnAcc = data.spawnInterval
    let pick = data.spawnIdx % data.grains.length
    let bestRest = data.grains[pick].rest
    for (let j = 0; j < 8; j++) {
      const idx = (data.spawnIdx + j) % data.grains.length
      if (data.grains[idx].rest > bestRest) {
        bestRest = data.grains[idx].rest
        pick = idx
      }
    }
    data.spawnIdx = (pick + 1) % data.grains.length
    respawnGranularGrain(data.grains[pick], rng.fork(pick * 11 + 3), data, scale, w)
  }

  for (let i = 0; i < data.grains.length; i++) {
    const g = data.grains[i]
    const r = rng.fork(i * 5)
    g.vy += grav * dt * speed
    g.x += g.vx * dt * speed
    g.y += g.vy * dt * speed

    const surfY = granularSurfaceY(g.x, w, h) - grainR
    const onSlope = g.y >= surfY - scaled(2, scale)

    if (onSlope) {
      g.y = surfY
      const vDotT = g.vx * tx + g.vy * ty
      const slide = Math.max(vDotT, 0) * 0.88 + slidePull * dt * speed
      g.vx = tx * slide + wind * dt * speed * 0.35
      g.vy = ty * slide
      g.vx *= 0.985
      g.vy *= 0.985
      g.vx += r.range(-0.5, 0.5) * scaled(14, scale) * dt * speed
      if (r.next() < 0.0018 * speed) {
        g.vx += r.range(-1, 1) * scaled(36, scale)
        g.vy += ty * scaled(22, scale)
        g.rest = 0
      }
    }

    const speed2 = g.vx * g.vx + g.vy * g.vy
    if (onSlope && speed2 < restSpeed) {
      g.rest += dt * speed
      if (g.rest > restLimit) {
        respawnGranularGrain(g, r.fork(17), data, scale, w)
        continue
      }
    } else {
      g.rest = Math.max(0, g.rest - dt * speed * 0.5)
    }

    if (g.y > h + grainR || g.x < -grainR || g.x > w + grainR) {
      respawnGranularGrain(g, r.fork(29), data, scale, w)
    }
  }
}

export function drawGranular(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: GranularData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const g of data.grains) {
    ctx.fillStyle = hsl(entry, g.y * 0.02, 62, 0.55)
    ctx.fillRect(g.x, g.y, scaled(2.2, state.scale), scaled(2.2, state.scale))
  }
  ctx.restore()
}
