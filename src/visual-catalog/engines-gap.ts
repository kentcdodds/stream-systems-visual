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

// --- Branch (organic growth) ---
type BranchSeg = { x1: number, y1: number, x2: number, y2: number, grow: number, max: number }
type BranchData = { segs: BranchSeg[] }

export function createBranch(entry: CatalogEntry, seed: number, density: number, w: number, h: number): BranchData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = Math.round(8 + density * 14)
  const segs: BranchSeg[] = []
  const baseY = h * 0.92
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 17)
    const x = r.range(w * 0.15, w * 0.85)
    const len = scaled(r.range(40, 110), scale)
    const ang = r.range(-Math.PI * 0.85, -Math.PI * 0.15)
    segs.push({
      x1: x,
      y1: baseY,
      x2: x + Math.cos(ang) * len,
      y2: baseY + Math.sin(ang) * len,
      grow: 1,
      max: 1,
    })
  }
  return { segs }
}

export function stepBranch(data: BranchData, _state: CatalogVisualState, speed: number, dt: number) {
  for (const s of data.segs) {
    if (s.grow < s.max) s.grow = Math.min(s.max, s.grow + dt * speed * 0.35)
  }
}

export function drawBranch(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: BranchData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const s of data.segs) {
    const t = s.grow
    const x2 = s.x1 + (s.x2 - s.x1) * t
    const y2 = s.y1 + (s.y2 - s.y1) * t
    ctx.strokeStyle = hsl(entry, 8, 52, 0.35 * t)
    ctx.lineWidth = scaled(2.2, state.scale)
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
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
  const n = particleCount(density, 12, 18, 28)
  const puffs: SmokePuff[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 31)
    puffs.push({
      x: r.range(w * 0.2, w * 0.8),
      y: r.range(h * 0.5, h * 0.95),
      r: scaled(r.range(30, 70), scale),
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
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const rings: RippleRing[] = []
  const count = 6 + Math.round(density * 4)
  for (let i = 0; i < count; i++) {
    const r = rng.fork(i * 11)
    rings.push({
      x: r.range(w * 0.2, w * 0.8),
      y: r.range(h * 0.3, h * 0.7),
      r: scaled(r.range(20, 80), scale),
      max: scaled(r.range(80, 160), scale),
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
    data.rings.push({
      x: rng.range(w * 0.15, w * 0.85),
      y: rng.range(h * 0.25, h * 0.75),
      r: scaled(4, scale),
      max: scaled(rng.range(70, 140), scale),
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
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = Math.round(5 + density * 8)
  const tongues: FlameTongue[] = []
  const cx = w / 2
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 29)
    tongues.push({
      x: cx + r.range(-w * 0.15, w * 0.15),
      phase: r.range(0, Math.PI * 2),
      amp: scaled(r.range(8, 22), scale),
      h: scaled(r.range(60, 130), scale),
    })
  }
  return { tongues }
}

export function stepFlame(_data: FlameData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawFlame(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: FlameData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale, time } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const baseY = h * 0.88
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
    ctx.moveTo(t.x - scaled(8, scale), baseY)
    ctx.quadraticCurveTo(t.x + sway * 0.5, baseY - t.h * 0.5, t.x + sway, tipY)
    ctx.quadraticCurveTo(t.x + sway * 0.5 + scaled(6, scale), baseY - t.h * 0.3, t.x + scaled(8, scale), baseY)
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
  const n = Math.round(3 + density * 3)
  const blobs: MetaBlob[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 41)
    blobs.push({
      x: r.range(w * 0.25, w * 0.75),
      y: r.range(h * 0.25, h * 0.75),
      vx: scaled(r.range(-20, 20), scale),
      vy: scaled(r.range(-20, 20), scale),
      r: scaled(r.range(50, 90), scale),
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

// --- Reaction (Gray-Scott lite) ---
type ReactionData = {
  w: number
  h: number
  a: Float32Array
  b: Float32Array
  buf: Float32Array
  tick: number
}

export function createReaction(entry: CatalogEntry, seed: number, _density: number, cw: number, ch: number): ReactionData {
  const { rng } = baseCtx(entry, seed, cw, ch)
  const w = Math.min(96, Math.max(48, Math.floor(cw / 14)))
  const h = Math.min(54, Math.max(27, Math.floor(ch / 14)))
  const n = w * h
  const a = new Float32Array(n).fill(1)
  const b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (rng.next() > 0.55 - entry.variant * 0.05) b[i] = rng.range(0.2, 1)
  }
  return { w, h, a, b, buf: new Float32Array(n), tick: 0 }
}

export function stepReaction(data: ReactionData, _state: CatalogVisualState, speed: number, dt: number) {
  data.tick += dt * speed
  if (data.tick < 0.04) return
  data.tick = 0
  const { w, h, a, b, buf } = data
  const f = 0.036
  const k = 0.065
  const da = 1
  const db = 0.5
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lapA =
        a[i - 1] + a[i + 1] + a[i - w] + a[i + w] - 4 * a[i]
      const lapB =
        b[i - 1] + b[i + 1] + b[i - w] + b[i + w] - 4 * b[i]
      const reaction = a[i] * b[i] * b[i]
      buf[i] = b[i] + (db * lapB - reaction + k * (1 - b[i])) * 0.9
      a[i] = a[i] + (da * lapA - reaction + f * (1 - a[i])) * 0.9
    }
  }
  for (let i = 0; i < a.length; i++) b[i] = buf[i]
}

export function drawReaction(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: ReactionData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: cw, height: ch } = state
  state.firstFrame = clearFrame(ctx, cw, ch, pal, state.firstFrame)
  const { w, h, b } = data
  const img = ctx.createImageData(w, h)
  for (let i = 0; i < b.length; i++) {
    const v = Math.max(0, Math.min(1, b[i]))
    const o = i * 4
    const hue = pal.hue + v * pal.accent
    img.data[o] = pal.bg.r + v * 80
    img.data[o + 1] = pal.bg.g + v * 60
    img.data[o + 2] = pal.bg.b + v * 100
    img.data[o + 3] = Math.floor(40 + v * 180)
    void hue
  }
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const octx = off.getContext('2d')
  if (!octx) return
  octx.putImageData(img, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(off, 0, 0, cw, ch)
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
type MagneticData = { poles: { x: number, y: number, charge: number }[] }

export function createMagnetic(entry: CatalogEntry, _seed: number, _density: number, w: number, h: number): MagneticData {
  return {
    poles: [
      { x: w * 0.35, y: h * 0.5, charge: 1 },
      { x: w * 0.65, y: h * 0.5, charge: entry.variant % 2 === 0 ? -1 : 1 },
    ],
  }
}

export function stepMagnetic(_data: MagneticData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawMagnetic(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: MagneticData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, scale } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineWidth = scaled(1, scale)
  const seeds = 24
  for (let s = 0; s < seeds; s++) {
    let x = (s + 0.5) * (w / seeds)
    let y = h * 0.15
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let step = 0; step < 80; step++) {
      let fx = 0
      let fy = 0
      for (const p of data.poles) {
        const dx = x - p.x
        const dy = y - p.y
        const d2 = dx * dx + dy * dy + 800
        const f = (p.charge * 8000) / d2
        fx += (dx / Math.sqrt(d2)) * f
        fy += (dy / Math.sqrt(d2)) * f
      }
      const mag = Math.hypot(fx, fy) || 1
      x += (fx / mag) * scaled(6, scale)
      y += (fy / mag) * scaled(6, scale)
      ctx.lineTo(x, y)
      if (x < 0 || x > w || y < 0 || y > h) break
    }
    ctx.strokeStyle = hsl(entry, s * 4, 58, 0.22)
    ctx.stroke()
  }
  ctx.restore()
}

// --- Attractor (strange loop trace) ---
type AttractorData = { t: number, trail: { x: number, y: number }[] }

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
  ctx.beginPath()
  for (let i = 0; i < data.trail.length; i++) {
    const p = data.trail[i]
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
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
type NebulaCloud = { x: number, y: number, r: number, vx: number, vy: number, hueOff: number }
type NebulaData = { clouds: NebulaCloud[] }

export function createNebula(entry: CatalogEntry, seed: number, density: number, w: number, h: number): NebulaData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = Math.round(4 + density * 5)
  const clouds: NebulaCloud[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 53)
    clouds.push({
      x: r.range(0, w),
      y: r.range(0, h),
      r: scaled(r.range(80, 180), scale),
      vx: scaled(r.range(-6, 6), scale),
      vy: scaled(r.range(-4, 4), scale),
      hueOff: r.range(-15, 25),
    })
  }
  return { clouds }
}

export function stepNebula(data: NebulaData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h } = state
  for (const c of data.clouds) {
    c.x += c.vx * dt * speed
    c.y += c.vy * dt * speed
    if (c.x < -c.r) c.x = w + c.r
    if (c.x > w + c.r) c.x = -c.r
    if (c.y < -c.r) c.y = h + c.r
    if (c.y > h + c.r) c.y = -c.r
  }
}

export function drawNebula(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: NebulaData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const c of data.clouds) {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r)
    g.addColorStop(0, hsl(entry, c.hueOff, 55, 0.14))
    g.addColorStop(0.6, hsl(entry, c.hueOff + 10, 45, 0.06))
    g.addColorStop(1, hsl(entry, c.hueOff + 20, 35, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Horizon ---
type HorizonData = { peaks: number[] }

export function createHorizon(entry: CatalogEntry, seed: number, _density: number, w: number, _h: number): HorizonData {
  const { rng } = baseCtx(entry, seed, w, 100)
  const peaks: number[] = []
  const n = 12 + entry.variant * 3
  for (let i = 0; i <= n; i++) peaks.push(rng.range(0.15, 0.55))
  return { peaks }
}

export function stepHorizon(_data: HorizonData, _state: CatalogVisualState, _speed: number, _dt: number) {}

export function drawHorizon(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: HorizonData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  const { width: w, height: h, time } = state
  state.firstFrame = clearFrame(ctx, w, h, pal, state.firstFrame)
  const horizonY = h * 0.62
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 30; i++) {
    const x = ((i * 47 + time * 8) % w)
    const tw = 0.5 + 0.5 * Math.sin(time * 0.5 + i)
    ctx.fillStyle = hsl(entry, 0, 75, 0.08 + tw * 0.12)
    ctx.beginPath()
    ctx.arc(x, horizonY * 0.35 + (i % 5) * 12, scaled(1 + tw, state.scale), 0, Math.PI * 2)
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

export function createFabric(entry: CatalogEntry, seed: number, density: number, w: number, _h: number): FabricData {
  const { rng } = baseCtx(entry, seed, w, 100)
  const n = Math.round(10 + density * 14)
  const strips: FabricData['strips'] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 13)
    strips.push({
      x: ((i + 0.5) / n) * w,
      phase: r.range(0, Math.PI * 2),
      amp: r.range(12, 35 + entry.variant * 5),
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
type Grain = { x: number, y: number, vx: number, vy: number }
type GranularData = { grains: Grain[] }

export function createGranular(entry: CatalogEntry, seed: number, density: number, w: number, h: number): GranularData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 80, 120, 220)
  const grains: Grain[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 71)
    grains.push({
      x: r.range(0, w),
      y: r.range(h * 0.2, h * 0.5),
      vx: scaled(r.range(-8, 8), scale),
      vy: scaled(r.range(20, 55), scale),
    })
  }
  return { grains }
}

export function stepGranular(data: GranularData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h, scale, seed } = state
  const slope = h * 0.55
  const rng = createRng(seed + Math.floor(state.time * 9))
  for (let i = 0; i < data.grains.length; i++) {
    const g = data.grains[i]
    const r = rng.fork(i * 5)
    g.vy += scaled(30, scale) * dt * speed
    g.x += g.vx * dt * speed
    g.y += g.vy * dt * speed
    if (g.y > slope + (g.x - w / 2) * 0.15) {
      g.vy *= -0.3
      g.vx += r.range(-0.5, 0.5) * scaled(20, scale) * dt
    }
    if (g.y > h + 5 || g.x < -5 || g.x > w + 5) {
      g.y = state.height * 0.15
      g.x = r.range(0, w)
      g.vy = scaled(20, scale)
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
