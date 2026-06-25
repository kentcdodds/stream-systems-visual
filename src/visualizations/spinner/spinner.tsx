import { useMemo, type CSSProperties } from 'react'
import './spinner.css'

export type SpinnerVisualProps = {
  startRadius?: number
  dotRadius?: number
  numberOfRings?: number
  animationTime?: number
  delayTime?: number
  speed?: number
  scale?: number
  paused?: boolean
}

export function ringCountFromDensity(density: number) {
  return Math.round(4 + density * 4)
}

export function SpinnerVisual({
  startRadius = 100,
  dotRadius = 22,
  numberOfRings = 6,
  animationTime = 1.5,
  delayTime = 2.5,
  speed = 1,
  scale = 1,
  paused = false,
}: SpinnerVisualProps) {
  const dotSize = dotRadius * 0.7
  const dotOffset = -dotSize / 2

  const rings = useMemo(() => {
    const { PI, floor, sin, cos, min } = Math
    const PI2 = PI * 2

    return Array.from({ length: numberOfRings }, (_, ringIndex) => {
      const ringRadius = ringIndex * dotRadius + startRadius
      const numberOfDots = floor((ringRadius * PI2) / dotRadius)
      const ringOpacity = min(1, 1 - ringIndex / numberOfRings)
      const saturation = (1 - ringIndex / numberOfRings) * 100
      const delay = (ringIndex / numberOfRings) * delayTime

      const dots = Array.from({ length: numberOfDots }, (_, dotIndex) => {
        const angle = (dotIndex / numberOfDots) * PI2
        return {
          x: cos(angle) * ringRadius,
          y: sin(angle) * ringRadius,
        }
      })

      return { ringOpacity, saturation, delay, dots }
    })
  }, [numberOfRings, startRadius, dotRadius, delayTime])

  return (
    <div className="spinner-stage">
      <div
        className={`spinner-container${paused ? ' spinner-container--paused' : ''}`}
        style={{
          '--visual-scale': scale,
          '--speed': speed,
          '--animation-time': `${animationTime}s`,
        } as CSSProperties}
      >
        <div className="spinner-rotator">
          {rings.map((ring, ringIndex) =>
            ring.dots.map((dot, dotIndex) => (
              <div
                key={`${ringIndex}-${dotIndex}`}
                className="spinner-bubble"
                style={{
                  opacity: ring.ringOpacity,
                  transform: `translate(${dot.x}px, ${dot.y}px)`,
                }}
              >
                <div
                  className="spinner-bubble-inner"
                  style={{
                    top: dotOffset,
                    left: dotOffset,
                    width: dotSize,
                    height: dotSize,
                    background: `hsl(228, ${ring.saturation}%, 62%)`,
                    animationDelay: `${ring.delay / speed}s`,
                  }}
                />
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  )
}
