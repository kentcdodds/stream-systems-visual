import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Family = { phase: number, freq: number, amp: number, drift: number, hue: number }

export type WeaveState = CanvasVisualState & {
  seed: number
  families: [Family, Family]
  /** Random offset so line grids do not align on the same origin every seed. */
  gridPhaseX: number
  gridPhaseY: number
  time: number
  firstFrame: boolean
}

export function createWeave(seed: number, density: number, w: number, h: number): WeaveState {
  const rng = createRng(seed)
  const d = 0.6 + density * 0.8
  const layout = canvasLayoutFields(w, h)
  const { scale } = layout
  const families: [Family, Family] = [
    { phase: rng.range(0, Math.PI * 2), freq: rng.range(0.008, 0.016) * d, amp: scaled(rng.range(28, 52), scale), drift: rng.range(0.3, 0.7), hue: 175 },
    { phase: rng.range(0, Math.PI * 2), freq: rng.range(0.009, 0.018) * d, amp: scaled(rng.range(24, 48), scale), drift: rng.range(0.35, 0.75), hue: 285 },
  ]
  return {
    seed,
    families,
    gridPhaseX: rng.range(0, scaled(14, scale)),
    gridPhaseY: rng.range(0, scaled(14, scale)),
    time: 0,
    ...layout,
  }
}

function drawFamily(
  ctx: CanvasRenderingContext2D,
  f: Family,
  t: number,
  w: number,
  h: number,
  vertical: boolean,
  gridPhase: number,
  scale: number,
) {
  const step = scaled(14, scale)
  ctx.strokeStyle = `hsla(${f.hue}, 70%, 62%, 0.22)`
  ctx.lineWidth = scaled(1, scale)
  if (vertical) {
    for (let x = gridPhase; x <= w; x += step) {
      ctx.beginPath()
      for (let y = 0; y <= h; y += scaled(4, scale)) {
        const off = Math.sin(y * f.freq + t * f.drift + f.phase + x * 0.004) * f.amp
        const px = x + off
        if (y === 0) ctx.moveTo(px, y)
        else ctx.lineTo(px, y)
      }
      ctx.stroke()
    }
  } else {
    for (let y = gridPhase; y <= h; y += step) {
      ctx.beginPath()
      for (let x = 0; x <= w; x += scaled(4, scale)) {
        const off = Math.sin(x * f.freq + t * f.drift + f.phase + y * 0.004) * f.amp
        const py = y + off
        if (x === 0) ctx.moveTo(x, py)
        else ctx.lineTo(x, py)
      }
      ctx.stroke()
    }
  }
}

export function stepWeave(state: WeaveState, speed: number, dt: number) {
  state.time += dt * speed
}

const BG = { r: 5, g: 6, b: 9 }

export function drawWeave(ctx: CanvasRenderingContext2D, state: WeaveState) {
  const { width: w, height: h, families, scale } = state
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
  drawFamily(ctx, families[0], state.time, w, h, true, state.gridPhaseX, scale)
  drawFamily(ctx, families[1], state.time * 1.07, w, h, false, state.gridPhaseY, scale)
  ctx.restore()
}

export function resizeWeave(state: WeaveState, w: number, h: number, seed: number, density: number) {
  const fresh = createWeave(seed, density, w, h)
  state.seed = seed
  state.families = fresh.families
  state.gridPhaseX = fresh.gridPhaseX
  state.gridPhaseY = fresh.gridPhaseY
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
}
