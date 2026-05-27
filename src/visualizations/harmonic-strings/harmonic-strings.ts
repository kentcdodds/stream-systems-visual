import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type LisPoint = { x: number, y: number }

type StringCurve = {
  ax: number
  ay: number
  bx: number
  by: number
  delta: number
  hue: number
  trail: LisPoint[]
}

export type HarmonicStringsState = CanvasVisualState & {
  seed: number
  strings: StringCurve[]
  time: number
  firstFrame: boolean
}

const BG = { r: 5, g: 6, b: 10 }
const MAX_TRAIL = 140

const RATIOS: [number, number][] = [
  [3, 2],
  [5, 4],
  [4, 3],
  [7, 5],
  [5, 3],
  [8, 5],
  [9, 7],
]

function stringCount(density: number) {
  return Math.min(7, Math.round(3 + density * 4))
}

export function createHarmonicStrings(seed: number, density: number, w: number, h: number): HarmonicStringsState {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(w, h)
  const n = stringCount(density)
  const strings: StringCurve[] = []
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 29 + 3)
    const [ax, ay] = RATIOS[(i + r.int(0, 2)) % RATIOS.length]
    strings.push({
      ax,
      ay,
      bx: r.range(0.72, 1.15),
      by: r.range(0.72, 1.15),
      delta: r.range(0, Math.PI * 2),
      hue: 180 + i * 22 + r.range(-8, 8),
      trail: [],
    })
  }
  return {
    seed,
    strings,
    time: 0,
    ...layout,
    firstFrame: true,
  }
}

export function stepHarmonicStrings(state: HarmonicStringsState, speed: number, dt: number) {
  state.time += dt * speed
  const cx = state.width / 2
  const cy = state.height / 2
  const amp = Math.min(state.width, state.height) * 0.34
  const t = state.time

  for (const s of state.strings) {
    const x = cx + Math.sin(s.ax * t + s.delta) * amp * s.bx
    const y = cy + Math.sin(s.ay * t) * amp * s.by
    if (s.trail.length >= MAX_TRAIL) s.trail.shift()
    s.trail.push({ x, y })
  }
}

export function drawHarmonicStrings(ctx: CanvasRenderingContext2D, state: HarmonicStringsState) {
  const { width: w, height: h, strings, scale } = state

  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.15)`
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (const s of strings) {
    if (s.trail.length < 2) continue
    ctx.lineWidth = scaled(1.4, scale)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < s.trail.length; i++) {
      const p = s.trail[i]
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.strokeStyle = `hsla(${s.hue}, 78%, 62%, 0.42)`
    ctx.stroke()

    const last = s.trail[s.trail.length - 1]
    ctx.fillStyle = `hsla(${s.hue + 12}, 90%, 72%, 0.65)`
    ctx.beginPath()
    ctx.arc(last.x, last.y, scaled(2.5, scale), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function resizeHarmonicStrings(state: HarmonicStringsState, w: number, h: number, seed: number, density: number) {
  const fresh = createHarmonicStrings(seed, density, w, h)
  state.seed = seed
  state.strings = fresh.strings
  state.time = 0
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
