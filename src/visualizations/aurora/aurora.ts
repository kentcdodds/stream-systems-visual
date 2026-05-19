import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import { placeSpreadNorm } from '../../simulation/spread-placement'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Veil = {
  /** Horizontal anchor 0–1 across viewport */
  baseX: number
  width: number
  phase: number
  freq: number
  amp: number
  hue: number
  driftRate: number
  driftAmp: number
}

export type AuroraState = CanvasVisualState & {
  seed: number
  veils: Veil[]
  time: number
  firstFrame: boolean
}

function veilCount(density: number) {
  return Math.round(4 + density * 8)
}

export function createAurora(seed: number, density: number, w: number, h: number): AuroraState {
  const rng = createRng(seed)
  const n = veilCount(density)
  const anchors = placeSpreadNorm(rng.fork(3), n, { minDist: 0.1 })
  const veils: Veil[] = []
  const span = Math.min(w, h)

  for (let i = 0; i < n; i++) {
    const r = rng.fork(i * 37 + 11)
    veils.push({
      baseX: anchors[i].x,
      width: r.range(span * 0.06, span * 0.18),
      phase: r.range(0, Math.PI * 2),
      freq: r.range(0.003, 0.012),
      amp: r.range(span * 0.02, span * 0.07),
      hue: r.range(115, 178),
      driftRate: r.range(0.08, 0.28),
      driftAmp: r.range(span * 0.03, span * 0.12),
    })
  }

  return { seed, veils, time: 0, ...canvasLayoutFields(w, h) }
}

export function stepAurora(state: AuroraState, speed: number, dt: number) {
  state.time += dt * speed
}

function veilCenterX(v: Veil, w: number, time: number) {
  return (
    v.baseX * w +
    Math.sin(time * v.driftRate + v.phase) * v.driftAmp +
    Math.sin(time * v.driftRate * 0.37 + v.phase * 1.9) * v.driftAmp * 0.35
  )
}

const BG = { r: 5, g: 6, b: 9 }

export function drawAurora(ctx: CanvasRenderingContext2D, state: AuroraState) {
  const { width: w, height: h, veils, time, scale } = state
  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.16)`
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const v of veils) {
    const cx = veilCenterX(v, w, time)
    const g = ctx.createLinearGradient(cx - v.width, 0, cx + v.width, 0)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, `hsla(${v.hue}, 75%, 55%, 0.35)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(cx - v.width, 0)
    for (let y = 0; y <= h; y += scaled(6, scale)) {
      const dx = Math.sin(y * v.freq + time * 0.6 + v.phase) * v.amp
      ctx.lineTo(cx + dx, y)
    }
    ctx.lineTo(cx + v.width, h)
    ctx.lineTo(cx - v.width, h)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function resizeAurora(state: AuroraState, w: number, h: number, seed: number, density: number) {
  const fresh = createAurora(seed, density, w, h)
  state.seed = seed
  state.veils = fresh.veils
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
