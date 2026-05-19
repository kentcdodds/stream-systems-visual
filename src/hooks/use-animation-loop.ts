import { useEffect, useRef } from 'react'

export function useAnimationLoop(
  callback: (dt: number, now: number) => void,
  enabled: boolean,
) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let frame = 0
    let last = performance.now()

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      cbRef.current(dt, now)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled])
}
