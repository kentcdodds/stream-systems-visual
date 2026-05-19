import { canvasLayoutFields, scaled } from '../rendering/resolution-scale'
import { createRng, type Rng } from '../simulation/prng'
import { placeSpreadPoints, randomInCanvas } from '../simulation/spread-placement'
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

// --- Particles ---
type P = { x: number, y: number, vx: number, vy: number, life: number, max: number, size: number }
type ParticlesData = { list: P[], mode: number }

export function createParticles(entry: CatalogEntry, seed: number, density: number, w: number, h: number): ParticlesData {
  const { rng, scale, variant } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 70, 180, 320)
  const list: P[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 13)
    const { x, y } = randomInCanvas(r, w, h)
    const mode = variant % 5
    let vx = 0
    let vy = 0
    if (mode === 0) {
      vy = scaled(r.range(-90, -40), scale)
      vx = scaled(r.range(-16, 16), scale)
    } else if (mode === 1) {
      vy = scaled(r.range(40, 100), scale)
      vx = scaled(r.range(-12, 12), scale)
    } else if (mode === 2) {
      vx = scaled(r.range(-55, 55), scale)
      vy = scaled(r.range(-20, 20), scale)
    } else if (mode === 3) {
      const ang = Math.atan2(y - h / 2, x - w / 2)
      vx = Math.cos(ang) * scaled(r.range(30, 80), scale)
      vy = Math.sin(ang) * scaled(r.range(30, 80), scale)
    } else {
      const cx = w / 2
      const cy = h / 2
      const ang = Math.atan2(y - cy, x - cx) + Math.PI / 2
      vx = Math.cos(ang) * scaled(r.range(25, 55), scale)
      vy = Math.sin(ang) * scaled(r.range(25, 55), scale) - scaled(40, scale)
    }
    list.push({
      x,
      y,
      vx,
      vy,
      life: r.range(0, 8),
      max: r.range(4, 14),
      size: r.range(1, 3.2),
    })
  }
  return { list, mode: variant % 5 }
}

function respawnParticle(p: P, r: Rng, w: number, h: number, scale: number, mode: number) {
  if (mode === 0) {
    p.x = r.range(0, w)
    p.y = h + r.range(0, scaled(30, scale))
    p.vy = scaled(r.range(-95, -45), scale)
    p.vx = scaled(r.range(-18, 18), scale)
  } else if (mode === 1) {
    p.x = r.range(0, w)
    p.y = -scaled(20, scale)
    p.vy = scaled(r.range(50, 110), scale)
    p.vx = scaled(r.range(-14, 14), scale)
  } else if (mode === 2) {
    const side = r.int(0, 3)
    if (side === 0) {
      p.x = -10
      p.y = r.range(0, h)
      p.vx = scaled(r.range(40, 90), scale)
    } else if (side === 1) {
      p.x = w + 10
      p.y = r.range(0, h)
      p.vx = scaled(r.range(-90, -40), scale)
    } else if (side === 2) {
      p.x = r.range(0, w)
      p.y = -10
      p.vy = scaled(r.range(35, 75), scale)
      p.vx = scaled(r.range(-25, 25), scale)
    } else {
      p.x = r.range(0, w)
      p.y = h + 10
      p.vy = scaled(r.range(-75, -35), scale)
      p.vx = scaled(r.range(-25, 25), scale)
    }
  } else if (mode === 3) {
    const ang = r.range(0, Math.PI * 2)
    p.x = w / 2
    p.y = h / 2
    p.vx = Math.cos(ang) * scaled(r.range(40, 95), scale)
    p.vy = Math.sin(ang) * scaled(r.range(40, 95), scale)
  } else {
    p.x = r.range(0, w)
    p.y = h + r.range(0, scaled(40, scale))
    const cx = w / 2
    const ang = Math.atan2(p.y - h / 2, p.x - cx) + Math.PI / 2
    p.vx = Math.cos(ang) * scaled(r.range(30, 60), scale)
    p.vy = Math.sin(ang) * scaled(r.range(30, 60), scale) - scaled(45, scale)
  }
  p.life = 0
  p.max = r.range(4, 12)
  p.size = r.range(1, 3)
}

export function stepParticles(data: ParticlesData, state: CatalogVisualState, speed: number, dt: number) {
  const { list, mode } = data
  const rng = createRng(state.seed + Math.floor(state.time * 7))
  const { width: w, height: h, scale } = state
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    p.life += dt * speed
    p.x += p.vx * dt * speed
    p.y += p.vy * dt * speed
    if (mode === 0) p.vx += Math.sin(state.time * 2 + i) * scaled(6, scale) * dt
    const out =
      p.life >= p.max ||
      p.x < -scaled(80, scale) ||
      p.x > w + scaled(80, scale) ||
      p.y < -scaled(80, scale) ||
      p.y > h + scaled(80, scale)
    if (out) respawnParticle(p, rng.fork(i), w, h, scale, mode)
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: ParticlesData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { hue, accent } = pal
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.list) {
    const t = 1 - p.life / p.max
    const a = t * t * 0.75
    if (a < 0.03) continue
    const r = p.size * scaled(4, state.scale)
    ctx.fillStyle = `hsla(${hue + accent * (1 - t)}, 80%, ${55 + t * 25}%, ${a})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Rings ---
type Ring = { r: number, maxR: number }
type RingEmitter = { x: number, y: number, vx: number, vy: number, rings: Ring[], timer: number, interval: number }
type RingsData = { emitters: RingEmitter[] }

export function createRings(entry: CatalogEntry, seed: number, density: number, w: number, h: number): RingsData {
  const { rng, scale, variant } = baseCtx(entry, seed, w, h)
  const n = Math.round(2 + density * (4 + variant))
  const positions = placeSpreadPoints(rng, n, w, h, { minDist: Math.min(w, h) * (0.1 + variant * 0.02) })
  const emitters: RingEmitter[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 29)
    const ang = r.range(0, Math.PI * 2)
    const drift = scaled(r.range(4, 14 + variant * 2), scale)
    emitters.push({
      x: positions[i].x,
      y: positions[i].y,
      vx: Math.cos(ang) * drift,
      vy: Math.sin(ang) * drift,
      rings: [],
      timer: r.range(0, 1),
      interval: r.range(0.7 + variant * 0.1, 2.2 - variant * 0.08),
    })
  }
  return { emitters }
}

export function stepRings(data: RingsData, state: CatalogVisualState, speed: number, dt: number) {
  const maxR = Math.min(state.width, state.height) * (0.35 + state.entry.variant * 0.02)
  const grow = scaled(85 * dt * speed, state.scale)
  const pad = Math.min(state.width, state.height) * 0.05
  for (const e of data.emitters) {
    e.x += e.vx * dt * speed
    e.y += e.vy * dt * speed
    if (e.x < pad) {
      e.x = pad
      e.vx = Math.abs(e.vx)
    }
    if (e.x > state.width - pad) {
      e.x = state.width - pad
      e.vx = -Math.abs(e.vx)
    }
    if (e.y < pad) {
      e.y = pad
      e.vy = Math.abs(e.vy)
    }
    if (e.y > state.height - pad) {
      e.y = state.height - pad
      e.vy = -Math.abs(e.vy)
    }
    e.timer += dt * speed
    if (e.timer >= e.interval) {
      e.timer = 0
      e.rings.push({ r: scaled(3, state.scale), maxR })
    }
    for (const ring of e.rings) ring.r += grow
    if (e.rings.length > 10) e.rings.splice(0, e.rings.length - 10)
    e.rings = e.rings.filter(ring => ring.r < ring.maxR)
  }
}

export function drawRings(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: RingsData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { hue } = pal
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const e of data.emitters) {
    for (const ring of e.rings) {
      const t = ring.r / ring.maxR
      const a = (1 - t) ** 2 * 0.5
      ctx.strokeStyle = `hsla(${hue + 40}, 75%, 60%, ${a})`
      ctx.lineWidth = scaled(1 + (1 - t), state.scale)
      ctx.beginPath()
      ctx.arc(e.x, e.y, ring.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.35)`
    ctx.beginPath()
    ctx.arc(e.x, e.y, scaled(2, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Orbs ---
type Orb = { cx: number, cy: number, rx: number, ry: number, rateX: number, rateY: number, phase: number, size: number, hueOff: number }
type OrbsData = { orbs: Orb[] }

export function createOrbs(entry: CatalogEntry, seed: number, density: number, w: number, h: number): OrbsData {
  const { rng, scale, variant } = baseCtx(entry, seed, w, h)
  const n = Math.round(5 + density * (10 + variant))
  const anchors = placeSpreadPoints(rng.fork(2), n, w, h)
  const orbs: Orb[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 41)
    orbs.push({
      cx: anchors[i].x,
      cy: anchors[i].y,
      rx: r.range(0.06, 0.2 + variant * 0.02) * w,
      ry: r.range(0.06, 0.2 + variant * 0.02) * h,
      rateX: r.range(0.12, 0.5),
      rateY: r.range(0.1, 0.42),
      phase: r.range(0, Math.PI * 2),
      size: scaled(r.range(45, 100 + variant * 12), scale),
      hueOff: r.range(-25, 25),
    })
  }
  return { orbs }
}

export function stepOrbs(_data: OrbsData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
}

export function drawOrbs(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: OrbsData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const t = state.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const o of data.orbs) {
    const x = o.cx + Math.sin(t * o.rateX + o.phase) * o.rx
    const y = o.cy + Math.cos(t * o.rateY + o.phase * 1.2) * o.ry
    const hue = pal.hue + o.hueOff
    const g = ctx.createRadialGradient(x, y, 0, x, y, o.size)
    g.addColorStop(0, `hsla(${hue}, 72%, 68%, 0.32)`)
    g.addColorStop(0.5, `hsla(${hue + pal.accent}, 65%, 52%, 0.1)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, o.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Grid wave ---
type GridData = { cols: number, rows: number, cells: Float32Array, sources: { x: number, y: number, phase: number, rate: number }[] }

export function createGrid(entry: CatalogEntry, seed: number, density: number, w: number, h: number): GridData {
  const rng = createRng(seed)
  const base = Math.min(28, Math.round(12 + density * (10 + entry.variant * 2)))
  const aspect = w / h
  const cols = aspect > 1 ? Math.round(base * aspect) : base
  const rows = aspect > 1 ? base : Math.round(base / aspect)
  const n = Math.round(2 + density * 3)
  const anchors = placeSpreadPoints(rng.fork(4), n, cols, rows, { pad: 1 })
  const sources = anchors.map((a, i) => {
    const r = rng.fork(i * 17)
    return { x: a.x, y: a.y, phase: r.range(0, Math.PI * 2), rate: r.range(2 + entry.variant * 0.3, 4.5) }
  })
  return { cols, rows, cells: new Float32Array(cols * rows), sources }
}

export function stepGrid(data: GridData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  const { cols, rows, cells, sources } = data
  const time = state.time
  const freq = 0.65 + state.entry.variant * 0.08
  const inv = 1 / sources.length
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0
      for (const s of sources) {
        const dist = Math.hypot(x - s.x, y - s.y)
        sum += Math.sin(dist * freq - time * s.rate + s.phase) / (1 + dist * 0.35)
      }
      cells[y * cols + x] = sum * inv
    }
  }
}

export function drawGrid(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: GridData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { width: w, height: h } = state
  const { cols, rows, cells } = data
  const cw = w / cols
  const ch = h / rows
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = cells[y * cols + x]
      const a = Math.min(0.85, Math.pow(Math.abs(v), 0.7) * 0.9)
      if (a < 0.05) continue
      const hue = pal.hue + v * pal.accent
      ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${a})`
      ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2)
    }
  }
  ctx.restore()
}

// --- Lines (weave) ---
type LineFamily = { phase: number, freq: number, amp: number, drift: number, vertical: boolean, gridPhase: number }
type LinesData = { families: LineFamily[] }

export function createLines(entry: CatalogEntry, seed: number, density: number, w: number, h: number): LinesData {
  const { rng, scale, variant } = baseCtx(entry, seed, w, h)
  const d = 0.55 + density * 0.75
  const families: LineFamily[] = []
  const count = 2 + (variant % 3)
  for (let i = 0; i < count; i++) {
    const r = rng.fork(i * 31)
    families.push({
      phase: r.range(0, Math.PI * 2),
      freq: r.range(0.007, 0.018) * d,
      amp: scaled(r.range(22, 48 + variant * 4), scale),
      drift: r.range(0.25, 0.8),
      vertical: i % 2 === 0,
      gridPhase: r.range(0, scaled(12, scale)),
    })
  }
  return { families }
}

export function stepLines(_data: LinesData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
}

export function drawLines(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: LinesData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { width: w, height: h, scale, time } = state
  const step = scaled(12 + entry.variant, scale)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  data.families.forEach((f, i) => {
    ctx.strokeStyle = `hsla(${pal.hue + i * pal.accent * 0.4}, 68%, 58%, 0.2)`
    ctx.lineWidth = scaled(1, scale)
    const t = time * (0.9 + i * 0.12)
    if (f.vertical) {
      for (let x = f.gridPhase; x <= w; x += step) {
        ctx.beginPath()
        for (let y = 0; y <= h; y += scaled(5, scale)) {
          const off = Math.sin(y * f.freq + t * f.drift + f.phase) * f.amp
          const px = x + off
          if (y === 0) ctx.moveTo(px, y)
          else ctx.lineTo(px, y)
        }
        ctx.stroke()
      }
    } else {
      for (let y = f.gridPhase; y <= h; y += step) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += scaled(5, scale)) {
          const off = Math.sin(x * f.freq + t * f.drift + f.phase) * f.amp
          const py = y + off
          if (x === 0) ctx.moveTo(x, py)
          else ctx.lineTo(x, py)
        }
        ctx.stroke()
      }
    }
  })
  ctx.restore()
}

// --- Veils (aurora) ---
type Veil = { x: number, width: number, phase: number, speed: number, hueOff: number }
type VeilsData = { veils: Veil[] }

export function createVeils(entry: CatalogEntry, seed: number, density: number, w: number, h: number): VeilsData {
  const { rng, scale, variant } = baseCtx(entry, seed, w, h)
  const n = Math.round(4 + density * (6 + variant))
  const veils: Veil[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 37)
    veils.push({
      x: r.range(0, w),
      width: scaled(r.range(80, 180 + variant * 20), scale),
      phase: r.range(0, Math.PI * 2),
      speed: r.range(0.2, 0.65),
      hueOff: r.range(-20, 20),
    })
  }
  return { veils }
}

export function stepVeils(_data: VeilsData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
}

export function drawVeils(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: VeilsData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { height: h, time } = state
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const v of data.veils) {
    const sway = Math.sin(time * v.speed + v.phase) * v.width * 0.35
    const x = v.x + sway
    const g = ctx.createLinearGradient(x - v.width, 0, x + v.width, 0)
    const hue = pal.hue + v.hueOff
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.35, `hsla(${hue}, 75%, 55%, 0.08)`)
    g.addColorStop(0.5, `hsla(${hue + pal.accent}, 80%, 65%, 0.22)`)
    g.addColorStop(0.65, `hsla(${hue}, 75%, 55%, 0.08)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - v.width, 0, v.width * 2, h)
  }
  ctx.restore()
}

// --- Contours ---
type ContoursData = { freqX: number, freqY: number, phase: number, lines: number }

export function createContours(entry: CatalogEntry, seed: number, density: number, _w: number, _h: number): ContoursData {
  const r = createRng(seed)
  const v = entry.variant
  return {
    freqX: r.range(0.004, 0.012) * (1 + density * 0.4),
    freqY: r.range(0.004, 0.012) * (1 + density * 0.4),
    phase: r.range(0, Math.PI * 2),
    lines: Math.round(10 + density * 12 + v * 2),
  }
}

export function stepContours(_data: ContoursData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
}

function field(data: ContoursData, x: number, y: number, t: number) {
  return (
    Math.sin(x * data.freqX + t * 0.4 + data.phase) +
    Math.sin(y * data.freqY - t * 0.35) +
    Math.sin((x + y) * 0.003 + t * 0.25)
  )
}

export function drawContours(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: ContoursData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { width: w, height: h, scale, time } = state
  const step = scaled(8, scale)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let li = 0; li < data.lines; li++) {
    const level = -2 + (li / data.lines) * 4
    ctx.strokeStyle = `hsla(${pal.hue + li * 3}, 65%, 55%, 0.18)`
    ctx.lineWidth = scaled(0.8, scale)
    for (let y = 0; y < h; y += step * 2) {
      ctx.beginPath()
      let started = false
      for (let x = 0; x <= w; x += step) {
        const v = field(data, x, y, time)
        if (Math.abs(v - level) < 0.22) {
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else ctx.lineTo(x, y)
        } else started = false
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

// --- Stars ---
type Star = { x: number, y: number, z: number, phase: number }
type Comet = { x: number, y: number, vx: number, vy: number, life: number } | null
type StarsData = { stars: Star[], comet: Comet }

export function createStars(entry: CatalogEntry, seed: number, density: number, w: number, h: number): StarsData {
  const rng = createRng(seed)
  const n = particleCount(density, 60, 140, 200)
  const stars: Star[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i)
    stars.push({ x: r.range(0, w), y: r.range(0, h), z: r.range(0.3, 1), phase: r.range(0, Math.PI * 2) })
  }
  return { stars, comet: entry.variant >= 2 ? null : null }
}

export function stepStars(data: StarsData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  const rng = createRng(state.seed + Math.floor(state.time))
  if (state.entry.variant >= 2 && (!data.comet || data.comet.life <= 0)) {
    if (rng.next() < 0.012 * speed) {
      const r = rng.fork(99)
      const side = r.int(0, 3)
      const { width: w, height: h, scale } = state
      let x = 0
      let y = 0
      let vx = 0
      let vy = 0
      if (side === 0) {
        x = -20
        y = r.range(0, h)
        vx = scaled(r.range(200, 420), scale)
        vy = scaled(r.range(-80, 80), scale)
      } else if (side === 1) {
        x = w + 20
        y = r.range(0, h)
        vx = scaled(r.range(-420, -200), scale)
        vy = scaled(r.range(-80, 80), scale)
      } else if (side === 2) {
        x = r.range(0, w)
        y = -20
        vx = scaled(r.range(-120, 120), scale)
        vy = scaled(r.range(180, 380), scale)
      } else {
        x = r.range(0, w)
        y = h + 20
        vx = scaled(r.range(-120, 120), scale)
        vy = scaled(r.range(-380, -180), scale)
      }
      data.comet = { x, y, vx, vy, life: r.range(0.8, 1.6) }
    }
  }
  if (data.comet) {
    data.comet.x += data.comet.vx * dt * speed
    data.comet.y += data.comet.vy * dt * speed
    data.comet.life -= dt * speed
  }
}

export function drawStars(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: StarsData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const t = state.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const s of data.stars) {
    const tw = 0.45 + 0.55 * Math.sin(t * (1.2 + s.z) + s.phase)
    const a = s.z * tw * 0.55
    ctx.fillStyle = `hsla(${pal.hue + 180}, 30%, ${70 + s.z * 20}%, ${a})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.z * scaled(1.8, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  if (data.comet && data.comet.life > 0) {
    const c = data.comet
    const g = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 0.08, c.y - c.vy * 0.08)
    g.addColorStop(0, `hsla(${pal.hue}, 90%, 75%, 0.7)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = scaled(2, state.scale)
    ctx.beginPath()
    ctx.moveTo(c.x, c.y)
    ctx.lineTo(c.x - c.vx * 0.06, c.y - c.vy * 0.06)
    ctx.stroke()
  }
  ctx.restore()
}

// --- Mesh ---
type MeshNode = { x: number, y: number, vx: number, vy: number }
type MeshData = { nodes: MeshNode[], linkDist: number }

export function createMesh(entry: CatalogEntry, seed: number, density: number, w: number, h: number): MeshData {
  const { rng, scale, variant } = baseCtx(entry, seed, w, h)
  const n = Math.min(36, Math.round(12 + density * (14 + variant * 2)))
  const positions = placeSpreadPoints(rng, n, w, h)
  const nodes: MeshNode[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 53)
    const ang = r.range(0, Math.PI * 2)
    const sp = scaled(r.range(8, 22), scale)
    nodes.push({
      x: positions[i].x,
      y: positions[i].y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
    })
  }
  return { nodes, linkDist: Math.min(w, h) * (0.12 + variant * 0.02) }
}

export function stepMesh(data: MeshData, state: CatalogVisualState, speed: number, dt: number) {
  const pad = 24 * state.scale
  for (const n of data.nodes) {
    n.x += n.vx * dt * speed
    n.y += n.vy * dt * speed
    if (n.x < pad) {
      n.x = pad
      n.vx = Math.abs(n.vx)
    }
    if (n.x > state.width - pad) {
      n.x = state.width - pad
      n.vx = -Math.abs(n.vx)
    }
    if (n.y < pad) {
      n.y = pad
      n.vy = Math.abs(n.vy)
    }
    if (n.y > state.height - pad) {
      n.y = state.height - pad
      n.vy = -Math.abs(n.vy)
    }
  }
}

export function drawMesh(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: MeshData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { nodes, linkDist } = data
  const maxD2 = linkDist * linkDist
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const d2 = dx * dx + dy * dy
      if (d2 > maxD2) continue
      const a = (1 - Math.sqrt(d2) / linkDist) * 0.35
      ctx.strokeStyle = `hsla(${pal.hue + 30}, 70%, 58%, ${a})`
      ctx.lineWidth = scaled(0.8, state.scale)
      ctx.beginPath()
      ctx.moveTo(nodes[i].x, nodes[i].y)
      ctx.lineTo(nodes[j].x, nodes[j].y)
      ctx.stroke()
    }
    ctx.fillStyle = `hsla(${pal.hue}, 75%, 65%, 0.45)`
    ctx.beginPath()
    ctx.arc(nodes[i].x, nodes[i].y, scaled(2.2, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Spiral ---
type SpiralData = { arms: number, spin: number, points: { angle: number, r: number, speed: number }[] }

export function createSpiral(entry: CatalogEntry, seed: number, density: number, _w: number, _h: number): SpiralData {
  const rng = createRng(seed)
  const arms = 3 + entry.variant
  const n = particleCount(density, 40, 100, 180)
  const points = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 7)
    points.push({ angle: r.range(0, Math.PI * 2), r: r.range(0, 1), speed: r.range(0.4, 1.2) })
  }
  return { arms, spin: rng.range(0.15, 0.45), points }
}

export function stepSpiral(data: SpiralData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed * data.spin
  for (const p of data.points) p.angle += p.speed * dt * speed * 0.5
}

export function drawSpiral(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: SpiralData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const cx = state.width / 2
  const cy = state.height / 2
  const maxR = Math.min(state.width, state.height) * 0.42
  const t = state.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.points) {
    const arm = Math.floor(p.r * data.arms) % data.arms
    const theta = p.angle + (arm * Math.PI * 2) / data.arms + t
    const rad = p.r * maxR * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.5 + p.angle)))
    const x = cx + Math.cos(theta) * rad
    const y = cy + Math.sin(theta) * rad
    ctx.fillStyle = `hsla(${pal.hue + arm * 15}, 75%, 60%, 0.55)`
    ctx.beginPath()
    ctx.arc(x, y, scaled(2, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Lissajous ---
type LisPoint = { x: number, y: number }
type LissajousData = { ax: number, ay: number, bx: number, by: number, delta: number, trail: LisPoint[] }

export function createLissajous(entry: CatalogEntry, seed: number, _density: number, _w: number, _h: number): LissajousData {
  const r = createRng(seed)
  const v = entry.variant
  const ratios = [
    [3, 2],
    [5, 4],
    [4, 3],
    [7, 5],
    [5, 3],
  ]
  const [ax, ay] = ratios[v % ratios.length]
  return {
    ax,
    ay,
    bx: r.range(0.8, 1.2),
    by: r.range(0.8, 1.2),
    delta: r.range(0, Math.PI * 2),
    trail: [],
  }
}

export function stepLissajous(data: LissajousData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  const cx = state.width / 2
  const cy = state.height / 2
  const amp = Math.min(state.width, state.height) * 0.32
  const t = state.time
  const x = cx + Math.sin(data.ax * t + data.delta) * amp * data.bx
  const y = cy + Math.sin(data.ay * t) * amp * data.by
  const maxTrail = 160
  if (data.trail.length >= maxTrail) data.trail.shift()
  data.trail.push({ x, y })
}

export function drawLissajous(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: LissajousData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  if (data.trail.length < 2) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()
  for (let i = 0; i < data.trail.length; i++) {
    const p = data.trail[i]
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  const a = 0.5
  ctx.strokeStyle = `hsla(${pal.hue}, 80%, 65%, ${a})`
  ctx.lineWidth = scaled(1.5, state.scale)
  ctx.stroke()
  const last = data.trail[data.trail.length - 1]
  ctx.fillStyle = `hsla(${pal.hue + pal.accent}, 90%, 75%, 0.8)`
  ctx.beginPath()
  ctx.arc(last.x, last.y, scaled(3, state.scale), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// --- Pendulum ---
type PendulumData = { count: number, lengths: number[], phases: number[], amp: number }

export function createPendulum(entry: CatalogEntry, seed: number, density: number, _w: number, _h: number): PendulumData {
  const r = createRng(seed)
  const count = Math.min(24, Math.round(12 + density * 8 + entry.variant * 2))
  const lengths: number[] = []
  const phases: number[] = []
  for (let i = 0; i < count; i++) {
    const f = r.fork(i)
    lengths.push(f.range(0.15, 0.42))
    phases.push(f.range(0, Math.PI * 2))
  }
  return { count, lengths, phases, amp: r.range(0.7, 1.1) }
}

export function stepPendulum(_data: PendulumData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
}

export function drawPendulum(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: PendulumData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { width: w, height: h, scale, time } = state
  const top = h * 0.18
  const span = w / (data.count + 1)
  const g = 9.8
  ctx.save()
  ctx.strokeStyle = `hsla(${pal.hue}, 70%, 58%, 0.35)`
  ctx.lineWidth = scaled(1, scale)
  for (let i = 0; i < data.count; i++) {
    const len = data.lengths[i] * h * 0.55
    const omega = Math.sqrt(g / (len / 100)) * data.amp
    const angle = Math.sin(omega * time + data.phases[i]) * 0.55
    const ox = span * (i + 1)
    const px = ox + Math.sin(angle) * len
    const py = top + Math.cos(angle) * len
    ctx.beginPath()
    ctx.moveTo(ox, top)
    ctx.lineTo(px, py)
    ctx.stroke()
    ctx.fillStyle = `hsla(${pal.hue + i * 2}, 75%, 62%, 0.65)`
    ctx.beginPath()
    ctx.arc(px, py, scaled(3.5, scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Hex ---
type HexData = { cols: number, rows: number, phases: Float32Array }

export function createHex(entry: CatalogEntry, seed: number, density: number, _w: number, _h: number): HexData {
  const r = createRng(seed)
  const cols = Math.min(22, Math.round(10 + density * 8 + entry.variant))
  const rows = Math.min(18, Math.round(8 + density * 6 + entry.variant * 0.5))
  const phases = new Float32Array(cols * rows)
  for (let i = 0; i < phases.length; i++) phases[i] = r.fork(i).range(0, Math.PI * 2)
  return { cols, rows, phases }
}

export function stepHex(data: HexData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  const rate = 1.5 + state.entry.variant * 0.2
  for (let i = 0; i < data.phases.length; i++) {
    data.phases[i] += rate * dt * speed * (0.8 + (i % 7) * 0.05)
  }
}

function hexCenter(col: number, row: number, r: number, w: number, h: number) {
  const x = col * r * 1.75 + (row % 2 ? r * 0.875 : 0) + w * 0.08
  const y = row * r * 1.5 + h * 0.1
  return { x, y }
}

export function drawHex(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: HexData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { width: w, height: h, scale, time } = state
  const r = scaled(14, scale)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let row = 0; row < data.rows; row++) {
    for (let col = 0; col < data.cols; col++) {
      const phase = data.phases[row * data.cols + col]
      const v = 0.5 + 0.5 * Math.sin(phase + time * 0.8)
      if (v < 0.25) continue
      const { x, y } = hexCenter(col, row, r, w, h)
      ctx.strokeStyle = `hsla(${pal.hue + col * 4}, 70%, 55%, ${v * 0.35})`
      ctx.lineWidth = scaled(1, scale)
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const px = x + Math.cos(a) * r * 0.9
        const py = y + Math.sin(a) * r * 0.9
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }
  ctx.restore()
}

// --- Vortex ---
type VortexParticle = { x: number, y: number, angle: number, r: number }
type VortexData = { particles: VortexParticle[], strength: number }

export function createVortex(entry: CatalogEntry, seed: number, density: number, w: number, h: number): VortexData {
  const rng = createRng(seed)
  const n = particleCount(density, 50, 150, 280)
  const cx = w / 2
  const cy = h / 2
  const particles: VortexParticle[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i)
    const dist = r.range(20, Math.min(w, h) * 0.45)
    const angle = r.range(0, Math.PI * 2)
    particles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      angle,
      r: dist,
    })
  }
  return { particles, strength: 1.2 + entry.variant * 0.25 }
}

export function stepVortex(data: VortexData, state: CatalogVisualState, speed: number, dt: number) {
  const cx = state.width / 2
  const cy = state.height / 2
  const pull = data.strength * dt * speed
  for (const p of data.particles) {
    const dx = p.x - cx
    const dy = p.y - cy
    const dist = Math.hypot(dx, dy) || 1
    const tangent = Math.atan2(dy, dx) + Math.PI / 2
    p.x += Math.cos(tangent) * pull * 55 + (-dx / dist) * pull * 8
    p.y += Math.sin(tangent) * pull * 55 + (-dy / dist) * pull * 8
    if (dist > Math.min(state.width, state.height) * 0.48) {
      p.x = cx + (dx / dist) * dist * 0.35
      p.y = cy + (dy / dist) * dist * 0.35
    }
  }
}

export function drawVortex(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: VortexData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.particles) {
    ctx.fillStyle = `hsla(${pal.hue + 40}, 75%, 58%, 0.45)`
    ctx.beginPath()
    ctx.arc(p.x, p.y, scaled(1.8, state.scale), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Bubbles ---
type Bubble = { x: number, y: number, r: number, vy: number, wobble: number }
type BubblesData = { list: Bubble[] }

export function createBubbles(entry: CatalogEntry, seed: number, density: number, w: number, h: number): BubblesData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 25, 70, 120)
  const list: Bubble[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 11)
    list.push({
      x: r.range(0, w),
      y: r.range(0, h),
      r: scaled(r.range(8, 28 + entry.variant * 4), scale),
      vy: scaled(r.range(-35, -12), scale),
      wobble: r.range(0, Math.PI * 2),
    })
  }
  return { list }
}

export function stepBubbles(data: BubblesData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  const { width: w, height: h, scale } = state
  const rng = createRng(state.seed + Math.floor(state.time * 5))
  for (let i = 0; i < data.list.length; i++) {
    const b = data.list[i]
    b.y += b.vy * dt * speed
    b.x += Math.sin(state.time * 2 + b.wobble) * scaled(12, scale) * dt
    if (b.y < -b.r) {
      b.y = h + b.r
      b.x = rng.fork(i).range(0, w)
    }
  }
}

export function drawBubbles(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: BubblesData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of data.list) {
    ctx.strokeStyle = `hsla(${pal.hue}, 70%, 65%, 0.35)`
    ctx.lineWidth = scaled(1.2, state.scale)
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = `hsla(${pal.hue + pal.accent}, 75%, 70%, 0.06)`
    ctx.fill()
  }
  ctx.restore()
}

// --- Rain ---
type RainDrop = { x: number, y: number, len: number, vy: number }
type RainData = { drops: RainDrop[], angle: number }

export function createRain(entry: CatalogEntry, seed: number, density: number, w: number, h: number): RainData {
  const { rng, scale } = baseCtx(entry, seed, w, h)
  const n = particleCount(density, 80, 200, 350)
  const angle = -0.25 - entry.variant * 0.08
  const drops: RainDrop[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i)
    drops.push({
      x: r.range(0, w),
      y: r.range(0, h),
      len: scaled(r.range(12, 32), scale),
      vy: scaled(r.range(280, 520), scale),
    })
  }
  return { drops, angle }
}

export function stepRain(data: RainData, state: CatalogVisualState, speed: number, dt: number) {
  const { width: w, height: h } = state
  const vx = Math.sin(data.angle) * 120
  const rng = createRng(state.seed + Math.floor(state.time * 11))
  for (let i = 0; i < data.drops.length; i++) {
    const d = data.drops[i]
    d.y += d.vy * dt * speed
    d.x += vx * dt * speed
    if (d.y > h + d.len) {
      d.y = -d.len
      d.x = rng.fork(i).range(0, w)
    }
    if (d.x > w + 20) d.x = -20
    if (d.x < -20) d.x = w + 20
  }
}

export function drawRain(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: RainData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const slant = Math.sin(data.angle) * 0.35
  ctx.save()
  ctx.strokeStyle = `hsla(${pal.hue + 30}, 60%, 70%, 0.35)`
  ctx.lineWidth = scaled(1, state.scale)
  for (const d of data.drops) {
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x + d.len * slant, d.y + d.len)
    ctx.stroke()
  }
  ctx.restore()
}

// --- Fireflies ---
type Firefly = { x: number, y: number, phase: number, rate: number }
type FirefliesData = { list: Firefly[] }

export function createFireflies(entry: CatalogEntry, seed: number, density: number, w: number, h: number): FirefliesData {
  const rng = createRng(seed)
  const n = particleCount(density, 30, 90, 150)
  const list: Firefly[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i)
    list.push({
      x: r.range(0, w),
      y: r.range(0, h),
      phase: r.range(0, Math.PI * 2),
      rate: r.range(1.5 + entry.variant * 0.3, 4),
    })
  }
  return { list }
}

export function stepFireflies(data: FirefliesData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  const { width: w, height: h, scale } = state
  for (const f of data.list) {
    f.x += Math.sin(state.time * 0.7 + f.phase) * scaled(8, scale) * dt
    f.y += Math.cos(state.time * 0.5 + f.phase * 1.3) * scaled(6, scale) * dt
    if (f.x < 0) f.x = w
    if (f.x > w) f.x = 0
    if (f.y < 0) f.y = h
    if (f.y > h) f.y = 0
  }
}

export function drawFireflies(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: FirefliesData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const f of data.list) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * f.rate + f.phase)
    const a = pulse * pulse * 0.75
    if (a < 0.08) continue
    const r = scaled(3 + pulse * 4, state.scale)
    ctx.fillStyle = `hsla(${pal.hue + pal.accent}, 85%, 65%, ${a})`
    ctx.beginPath()
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- Waves (strata) ---
type WaveBand = { y: number, amp: number, freq: number, phase: number, speed: number }
type WavesData = { bands: WaveBand[] }

export function createWaves(entry: CatalogEntry, seed: number, density: number, _w: number, h: number): WavesData {
  const rng = createRng(seed)
  const n = Math.round(6 + density * 10 + entry.variant * 2)
  const bands: WaveBand[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 19)
    bands.push({
      y: ((i + 1) / (n + 1)) * h,
      amp: r.range(12, 40 + entry.variant * 6),
      freq: r.range(0.003, 0.01),
      phase: r.range(0, Math.PI * 2),
      speed: r.range(0.2, 0.7),
    })
  }
  return { bands }
}

export function stepWaves(_data: WavesData, state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
}

export function drawWaves(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: WavesData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const { width: w, scale, time } = state
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  data.bands.forEach((b, i) => {
    ctx.strokeStyle = `hsla(${pal.hue + i * 6}, 65%, 55%, 0.22)`
    ctx.lineWidth = scaled(2, scale)
    ctx.beginPath()
    for (let x = 0; x <= w; x += scaled(6, scale)) {
      const y = b.y + Math.sin(x * b.freq + time * b.speed + b.phase) * b.amp
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  })
  ctx.restore()
}

// --- Orbit ---
type OrbitBody = { angle: number, dist: number, speed: number, size: number, trail: { x: number, y: number }[] }
type OrbitData = { bodies: OrbitBody[] }

export function createOrbit(entry: CatalogEntry, seed: number, density: number, w: number, h: number): OrbitData {
  const rng = createRng(seed)
  const n = Math.round(3 + density * 5 + entry.variant)
  const bodies: OrbitBody[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 43)
    bodies.push({
      angle: r.range(0, Math.PI * 2),
      dist: r.range(0.12, 0.38 - i * 0.03) * Math.min(w, h),
      speed: r.range(0.4, 1.4) * (i % 2 === 0 ? 1 : -1),
      size: r.range(2, 5 + entry.variant * 0.5),
      trail: [],
    })
  }
  return { bodies }
}

export function stepOrbit(data: OrbitData, state: CatalogVisualState, speed: number, dt: number) {
  const cx = state.width / 2
  const cy = state.height / 2
  for (const b of data.bodies) {
    b.angle += b.speed * dt * speed
    const x = cx + Math.cos(b.angle) * b.dist
    const y = cy + Math.sin(b.angle) * b.dist * 0.85
    if (b.trail.length >= 80) b.trail.shift()
    b.trail.push({ x, y })
  }
}

export function drawOrbit(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: OrbitData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  const cx = state.width / 2
  const cy = state.height / 2
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = `hsla(${pal.hue}, 80%, 70%, 0.4)`
  ctx.beginPath()
  ctx.arc(cx, cy, scaled(4, state.scale), 0, Math.PI * 2)
  ctx.fill()
  for (const b of data.bodies) {
    if (b.trail.length > 1) {
      ctx.beginPath()
      for (let i = 0; i < b.trail.length; i++) {
        const p = b.trail[i]
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.strokeStyle = `hsla(${pal.hue + 25}, 75%, 60%, 0.35)`
      ctx.lineWidth = scaled(1, state.scale)
      ctx.stroke()
    }
    const last = b.trail[b.trail.length - 1]
    if (last) {
      ctx.fillStyle = `hsla(${pal.hue + 40}, 85%, 68%, 0.75)`
      ctx.beginPath()
      ctx.arc(last.x, last.y, scaled(b.size, state.scale), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// --- Comet (dedicated shooting stars) ---
type CometParticle = { x: number, y: number, vx: number, vy: number, life: number, max: number }
type CometData = { pool: CometParticle[], spawnRate: number }

export function createComet(entry: CatalogEntry, _seed: number, density: number, _w: number, _h: number): CometData {
  const pool: CometParticle[] = []
  for (let i = 0; i < 12; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1 })
  }
  return { pool, spawnRate: 0.8 + density * 1.5 + entry.variant * 0.3 }
}

export function stepComet(data: CometData, state: CatalogVisualState, speed: number, dt: number) {
  const rng = createRng(state.seed + Math.floor(state.time * 3))
  const { width: w, height: h, scale } = state
  if (rng.next() < data.spawnRate * dt * speed * 0.15) {
    const slot = data.pool.find(p => p.life <= 0)
    if (slot) {
      const r = rng.fork(7)
      const side = r.int(0, 1)
      if (side === 0) {
        slot.x = -30
        slot.y = r.range(0, h * 0.6)
        slot.vx = scaled(r.range(250, 500), scale)
        slot.vy = scaled(r.range(40, 160), scale)
      } else {
        slot.x = r.range(0, w * 0.5)
        slot.y = -30
        slot.vx = scaled(r.range(80, 200), scale)
        slot.vy = scaled(r.range(200, 400), scale)
      }
      slot.max = r.range(0.6, 1.4)
      slot.life = slot.max
    }
  }
  for (const p of data.pool) {
    if (p.life <= 0) continue
    p.x += p.vx * dt * speed
    p.y += p.vy * dt * speed
    p.life -= dt * speed
  }
}

export function drawComet(ctx: CanvasRenderingContext2D, entry: CatalogEntry, data: CometData, state: CatalogVisualState) {
  const pal = paletteAt(entry.palette)
  state.firstFrame = clearFrame(ctx, state.width, state.height, pal, state.firstFrame)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of data.pool) {
    if (p.life <= 0) continue
    const t = p.life / p.max
    const len = scaled(60 + (1 - t) * 80, state.scale)
    const g = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 0.05, p.y - p.vy * 0.05)
    g.addColorStop(0, `hsla(${pal.hue}, 90%, 78%, ${t * 0.85})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = scaled(2, state.scale)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x - (p.vx / Math.hypot(p.vx, p.vy || 1)) * len, p.y - (p.vy / Math.hypot(p.vx, p.vy || 1)) * len)
    ctx.stroke()
  }
  ctx.restore()
}
