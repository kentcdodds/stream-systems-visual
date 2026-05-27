/**
 * Rendering: fade the framebuffer, then stroke particle segments.
 */

import { scaled } from '../../rendering/resolution-scale'
import type { FlowRibbons, RibbonParticle } from './particles'

const BG = '#06080b'
/** Lower = longer trails; too high washes to black when strokes are faint */
const FADE_ALPHA = 0.045

function strokeParticle(
  ctx: CanvasRenderingContext2D,
  p: RibbonParticle,
  life: number,
  scale: number,
) {
  const alpha = Math.min(1, life * 0.9) * 0.78
  if (alpha < 0.03) return

  const dx = p.x - p.prevX
  const dy = p.y - p.prevY
  const segLen = Math.hypot(dx, dy)
  if (segLen < 0.15) return

  const width = scaled(0.55 + Math.min(segLen * 0.4, 1.8), scale)

  ctx.strokeStyle = `hsla(${p.hue}, 32%, 58%, ${alpha})`
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(p.prevX, p.prevY)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
}

export function drawFlowRibbonsFrame(
  ctx: CanvasRenderingContext2D,
  sim: FlowRibbons,
  firstFrame: boolean,
) {
  const { width: w, height: h } = sim
  if (w < 32 || h < 32) return

  if (firstFrame) {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = `rgba(6, 8, 11, ${FADE_ALPHA})`
    ctx.fillRect(0, 0, w, h)
  }

  for (const p of sim.particles) {
    const life = 1 - p.age / p.maxAge
    strokeParticle(ctx, p, life, sim.scale)
  }
}
