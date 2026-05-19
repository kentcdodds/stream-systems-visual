/**
 * Layered glow strokes, motion trails, clash blooms, and spark particles.
 */

import { scaled } from '../../rendering/resolution-scale'
import {
  bladeTip,
  SABER_COLORS,
  type SaberBlade,
  type SaberColor,
  type SaberField,
  type Spark,
} from './blades'

const BG = { r: 4, g: 5, b: 8 }
const TRAIL_ALPHA = 0.09
const HILT_LEN = 14

function drawBladeStroke(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: SaberColor,
  energy: number,
  scale: number,
) {
  const boost = 0.75 + energy * 0.55
  ctx.save()
  ctx.lineCap = 'round'
  ctx.globalCompositeOperation = 'lighter'

  ctx.strokeStyle = color.glow
  ctx.lineWidth = scaled((14 + energy * 10) * boost, scale)
  ctx.shadowBlur = scaled(28 + energy * 24, scale)
  ctx.shadowColor = color.glow
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  ctx.shadowBlur = scaled(14 + energy * 12, scale)
  ctx.strokeStyle = color.mid
  ctx.lineWidth = scaled((4 + energy * 4) * boost, scale)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.strokeStyle = color.core
  ctx.lineWidth = scaled(1.4 + energy * 1.2, scale)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  ctx.restore()
}

function drawHilt(ctx: CanvasRenderingContext2D, blade: SaberBlade, scale: number) {
  const back = blade.angle + Math.PI
  const inset = scaled(4, scale)
  const x1 = blade.pivotX + Math.cos(back) * inset
  const y1 = blade.pivotY + Math.sin(back) * inset
  const hiltLen = scaled(HILT_LEN, scale)
  const x2 = blade.pivotX + Math.cos(back) * hiltLen
  const y2 = blade.pivotY + Math.sin(back) * hiltLen

  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(28, 32, 38, 0.9)'
  ctx.lineWidth = scaled(5, scale)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawSpark(ctx: CanvasRenderingContext2D, spark: Spark, scale: number) {
  const t = spark.life / spark.maxLife
  const alpha = t * t * 0.9
  const r = scaled(1.5 + (1 - t) * 4, scale)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, r * 3)
  g.addColorStop(0, `rgba(245, 252, 255, ${alpha})`)
  g.addColorStop(0.4, `rgba(140, 200, 255, ${alpha * 0.5})`)
  g.addColorStop(1, 'rgba(80, 120, 200, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(spark.x, spark.y, r * 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawClashBlooms(ctx: CanvasRenderingContext2D, field: SaberField) {
  const { blades, time, scale } = field
  const threshold = scaled(38, scale)

  for (let i = 0; i < blades.length; i++) {
    for (let j = i + 1; j < blades.length; j++) {
      const a = blades[i]
      const b = blades[j]
      const at = bladeTip(a)
      const bt = bladeTip(b)
      const midX = (at.x + bt.x) * 0.5
      const midY = (at.y + bt.y) * 0.5
      const dist = Math.hypot(at.x - bt.x, at.y - bt.y)

      if (dist > threshold * 2.4) continue

      const proximity = 1 - dist / (threshold * 2.4)
      const pulse = 0.5 + 0.5 * Math.sin(time * 22 + i * 2.1 + j * 1.7)
      const alpha = proximity * proximity * pulse * (0.45 + (a.energy + b.energy) * 0.35)
      if (alpha < 0.03) continue

      const r = scaled(10 + proximity * 28, scale)
      const g = ctx.createRadialGradient(midX, midY, 0, midX, midY, r)
      g.addColorStop(0, `rgba(250, 252, 255, ${alpha})`)
      g.addColorStop(0.25, `rgba(180, 220, 255, ${alpha * 0.55})`)
      g.addColorStop(1, 'rgba(90, 130, 200, 0)')

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(midX, midY, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

export function drawSaberFrame(ctx: CanvasRenderingContext2D, field: SaberField) {
  const { width: w, height: h, blades, sparks, scale } = field
  if (w < 32 || h < 32) return

  if (field.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r}, ${BG.g}, ${BG.b})`
    ctx.fillRect(0, 0, w, h)
    field.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r}, ${BG.g}, ${BG.b}, ${TRAIL_ALPHA})`
    ctx.fillRect(0, 0, w, h)
  }

  for (const blade of blades) {
    const tip = bladeTip(blade)
    const color = SABER_COLORS[blade.colorIndex % SABER_COLORS.length]
    drawBladeStroke(ctx, blade.pivotX, blade.pivotY, tip.x, tip.y, color, blade.energy, scale)
    drawHilt(ctx, blade, scale)
  }

  drawClashBlooms(ctx, field)

  for (const spark of sparks) {
    drawSpark(ctx, spark, scale)
  }

  const vignette = ctx.createRadialGradient(
    w * 0.5,
    h * 0.5,
    0,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.7,
  )
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}
