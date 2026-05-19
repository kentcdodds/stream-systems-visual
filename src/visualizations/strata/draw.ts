/**
 * Filled bands between sheared layer curves + soft crest highlights.
 */

import { scaled } from '../../rendering/resolution-scale'
import {
  bandColor,
  layerY,
  SKY,
  type StrataField,
  type StrataLayer,
} from './layers'

const STEP_REF = 6
const CREST = { r: 95, g: 118, b: 138 }

function traceCurve(
  ctx: CanvasRenderingContext2D,
  layer: StrataLayer,
  field: StrataField,
  direction: 1 | -1,
  step: number,
) {
  const { width: w, height: h, time } = field
  if (direction === 1) {
    ctx.moveTo(0, layerY(layer, 0, time, h))
    for (let x = step; x <= w; x += step) {
      ctx.lineTo(x, layerY(layer, x, time, h))
    }
    return
  }
  ctx.lineTo(w, layerY(layer, w, time, h))
  for (let x = w - step; x >= 0; x -= step) {
    ctx.lineTo(x, layerY(layer, x, time, h))
  }
}

function fillBand(
  ctx: CanvasRenderingContext2D,
  top: StrataLayer,
  bottom: StrataLayer,
  field: StrataField,
  fill: string,
  step: number,
) {
  ctx.beginPath()
  traceCurve(ctx, top, field, 1, step)
  traceCurve(ctx, bottom, field, -1, step)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function strokeCrest(
  ctx: CanvasRenderingContext2D,
  layer: StrataLayer,
  field: StrataField,
  step: number,
) {
  const { width: w, height: h, time, scale } = field
  const mix = layer.crest
  const r = SKY.r + mix * (CREST.r - SKY.r)
  const g = SKY.g + mix * (CREST.g - SKY.g)
  const b = SKY.b + mix * (CREST.b - SKY.b)

  ctx.beginPath()
  ctx.moveTo(0, layerY(layer, 0, time, h))
  for (let x = step; x <= w; x += step) {
    ctx.lineTo(x, layerY(layer, x, time, h))
  }
  ctx.strokeStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${0.22 + mix * 0.38})`
  ctx.lineWidth = scaled(1 + mix * 0.8, scale)
  ctx.stroke()
}

export function drawStrataFrame(ctx: CanvasRenderingContext2D, field: StrataField) {
  const { width: w, height: h, layers, scale } = field
  if (w < 32 || h < 32 || layers.length < 2) return

  const step = scaled(STEP_REF, scale)

  ctx.fillStyle = `rgb(${SKY.r}, ${SKY.g}, ${SKY.b})`
  ctx.fillRect(0, 0, w, h)

  const caps: StrataLayer[] = [
    { anchor: 0, amplitude: 0, frequency: 0, phase: 0, drift: 0, crest: 0 },
    ...layers,
    { anchor: 1, amplitude: 0, frequency: 0, phase: 0, drift: 0, crest: 0 },
  ]

  for (let i = 0; i < caps.length - 1; i++) {
    const top = caps[i]
    const bottom = caps[i + 1]
    const c = bandColor(i)
    fillBand(
      ctx,
      top,
      bottom,
      field,
      `rgb(${c.r}, ${c.g}, ${c.b})`,
      step,
    )
  }

  for (const layer of layers) {
    strokeCrest(ctx, layer, field, step)
  }

  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}
