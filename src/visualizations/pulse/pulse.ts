import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { placeSpreadPoints } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

export type PulseSource = {
  x: number
  y: number
  phase: number
  rate: number
}

export type PulseState = CanvasVisualState & {
  seed: number
  cols: number
  rows: number
  cells: Float32Array
  sources: PulseSource[]
  time: number
  firstFrame: boolean
}

function gridSize(density: number, w: number, h: number) {
  const base = Math.round(14 + density * 22)
  const aspect = w / h
  return aspect > 1
    ? { cols: Math.round(base * aspect), rows: base }
    : { cols: base, rows: Math.round(base / aspect) }
}

export function createPulse(seed: number, density: number, w: number, h: number): PulseState {
  const rng = createRng(seed)
  const { cols, rows } = gridSize(density, w, h)
  const sources: PulseSource[] = []
  const n = Math.round(2 + density * 4)
  const anchors = placeSpreadPoints(rng.fork(5), n, cols, rows, { pad: 1.2 })
  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 19)
    sources.push({
      x: anchors[i].x,
      y: anchors[i].y,
      phase: r.range(0, Math.PI * 2),
      rate: r.range(2.4, 4.2),
    })
  }
  return {
    seed,
    cols,
    rows,
    cells: new Float32Array(cols * rows),
    sources,
    time: 0,
    ...canvasLayoutFields(w, h),
  }
}

export function stepPulse(state: PulseState, speed: number, dt: number) {
  state.time += dt * speed
  const { cols, rows, cells, sources, time } = state
  const inv = 1 / sources.length

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0
      for (let i = 0; i < sources.length; i++) {
        const s = sources[i]
        const dx = x - s.x
        const dy = y - s.y
        const dist = Math.hypot(dx, dy)
        sum += Math.sin(dist * 0.72 - time * s.rate + s.phase) / (1 + dist * 0.32)
      }
      cells[y * cols + x] = sum * inv
    }
  }
}

const BG = { r: 5, g: 6, b: 9 }

export function drawPulse(ctx: CanvasRenderingContext2D, state: PulseState) {
  const { width: w, height: h, cols, rows, cells, scale } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.14)`
    ctx.fillRect(0, 0, w, h)
  }

  const cw = w / cols
  const ch = h / rows
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = cells[y * cols + x]
      const a = Math.min(0.9, Math.pow(Math.abs(v), 0.72) * 0.95)
      if (a < 0.04) continue
      const hue = 198 + v * 38
      const inset = scaled(1, scale)
      const shrink = scaled(2, scale)
      ctx.fillStyle = `hsla(${hue}, 72%, 56%, ${a})`
      ctx.fillRect(x * cw + inset, y * ch + inset, cw - shrink, ch - shrink)
    }
  }
  ctx.restore()
}

export function resizePulse(state: PulseState, w: number, h: number, seed: number, density: number) {
  const fresh = createPulse(seed, density, w, h)
  state.seed = seed
  state.cols = fresh.cols
  state.rows = fresh.rows
  state.cells = fresh.cells
  state.sources = fresh.sources
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
