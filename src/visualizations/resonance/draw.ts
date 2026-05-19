/**
 * Rendering: capped-resolution buffer (reused each frame), scaled up.
 * Emitters sampled once per frame — not per pixel.
 */

import { scaled, visualScale } from '../../rendering/resolution-scale'
import { sampleEmitters, type EmitterSample, type ResonanceField } from './emitters'

const BG = { r: 6, g: 8, b: 11 }
const HI = { r: 105, g: 125, b: 142 }
const DIST_FALLOFF = 0.0018

function bufferSize(
  w: number,
  h: number,
  maxBufferW: number,
  maxBufferH: number,
  bufferScale: number,
) {
  let bw = Math.max(160, Math.floor(w * bufferScale))
  let bh = Math.max(90, Math.floor(h * bufferScale))
  if (bw > maxBufferW) {
    bh = Math.max(90, Math.floor(bh * (maxBufferW / bw)))
    bw = maxBufferW
  }
  if (bh > maxBufferH) {
    bw = Math.max(160, Math.floor(bw * (maxBufferH / bh)))
    bh = maxBufferH
  }
  return { bw, bh }
}

function waveSum(
  x: number,
  y: number,
  samples: EmitterSample[],
  invCount: number,
) {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    const dx = x - s.x
    const dy = y - s.y
    const dist = Math.hypot(dx, dy)
    sum += Math.sin(dist * s.frequency + s.wavePhase) / (1 + dist * DIST_FALLOFF)
  }
  return sum * invCount
}

function ridgeStrength(value: number) {
  const v = Math.max(-1, Math.min(1, value))
  return Math.pow(Math.abs(Math.sin(v * 5.4)), 0.62)
}

export type ResonanceDrawer = {
  drawResonanceFrame: (
    ctx: CanvasRenderingContext2D,
    field: ResonanceField,
  ) => void
}

export function createResonanceDrawer(): ResonanceDrawer {
  const offscreen = document.createElement('canvas')

  function acquireOffCtx(): CanvasRenderingContext2D {
    const next = offscreen.getContext('2d', { willReadFrequently: true })
    if (!next) throw new Error('Could not create resonance offscreen context')
    return next
  }

  let offCtx = acquireOffCtx()

  let image = offCtx.createImageData(1, 1)
  let bufW = 1
  let bufH = 1

  function ensureBuffer(nextW: number, nextH: number) {
    if (nextW === bufW && nextH === bufH) return
    bufW = nextW
    bufH = nextH
    offscreen.width = bufW
    offscreen.height = bufH
    acquireOffCtx()
    image = offCtx.createImageData(bufW, bufH)
  }

  function drawResonanceFrame(
    ctx: CanvasRenderingContext2D,
    field: ResonanceField,
  ) {
    const { width: w, height: h } = field
    if (w < 32 || h < 32) return

    const vs = visualScale(w, h)
    const maxBufferW = scaled(560, vs)
    const maxBufferH = scaled(315, vs)
    const bufferScale = scaled(0.38, vs)
    const { bw, bh } = bufferSize(w, h, maxBufferW, maxBufferH, bufferScale)
    ensureBuffer(bw, bh)

    const data = image.data
    const samples = sampleEmitters(field, field.time)
    if (samples.length === 0) return

    const invCount = 1 / samples.length
    const xStep = w / bw
    const yStep = h / bh

    for (let py = 0; py < bh; py++) {
      const y = py * yStep
      const row = py * bw * 4
      for (let px = 0; px < bw; px++) {
        const x = px * xStep
        const ridge = ridgeStrength(waveSum(x, y, samples, invCount))
        const mix = ridge * ridge
        const i = row + px * 4
        data[i] = BG.r + mix * (HI.r - BG.r)
        data[i + 1] = BG.g + mix * (HI.g - BG.g)
        data[i + 2] = BG.b + mix * (HI.b - BG.b)
        data[i + 3] = 255
      }
    }

    offCtx.putImageData(image, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = `rgb(${BG.r}, ${BG.g}, ${BG.b})`
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(offscreen, 0, 0, w, h)

    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.68)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.32)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  return { drawResonanceFrame }
}
