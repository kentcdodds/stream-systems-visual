import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { paramsFromPartial, writeParamsToSearch, type VisualParams } from '../config/params'
import { useVisualRuntime } from '../context/visual-runtime-context'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { effectiveVisualScale } from '../rendering/resolution-scale'
import { setupDisplayCanvas } from '../rendering/setup-display-canvas'
import { getRouteConfig } from '../routes/route-config'

export type CanvasVisualState = {
  width: number
  height: number
  /** `min(width,height) / 1080` — scales strokes, links, and speeds for 4K vs 1080p. */
  scale: number
  firstFrame?: boolean
}

export type CanvasVisualPageOptions<T extends CanvasVisualState> = {
  routeId: string
  readParams: (search: string) => VisualParams
  datasetVisual: string
  create: (seed: number, density: number, width: number, height: number) => T
  resize?: (state: T, width: number, height: number, seed: number, density: number) => void
  step: (state: T, speed: number, dt: number) => void
  draw: (ctx: CanvasRenderingContext2D, state: T) => void
  onBufferReset?: (state: T) => void
}

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

function viewportSize() {
  return { w: window.innerWidth, h: window.innerHeight }
}

export function createCanvasVisualPage<T extends CanvasVisualState>(
  options: CanvasVisualPageOptions<T>,
): ComponentType {
  const routePath = getRouteConfig(options.routeId).path

  function CanvasVisualPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stateRef = useRef<T | null>(null)
    const pausedRef = useRef(false)
    const paramsRef = useRef<VisualParams>(options.readParams(window.location.search))
    const { suppressNavigation } = useVisualRuntime()

    const [params, setParams] = useState<VisualParams>(() =>
      options.readParams(window.location.search),
    )
    const [paused, setPaused] = useState(false)

    paramsRef.current = params
    pausedRef.current = paused

    const markBufferReset = useCallback(() => {
      const state = stateRef.current
      if (!state) return
      if (state.firstFrame !== undefined) state.firstFrame = true
      options.onBufferReset?.(state)
    }, [])

    const syncState = useCallback((seed: number, density: number, w: number, h: number) => {
      if (w < 32 || h < 32) return
      const state = options.create(seed, density, w, h)
      state.scale = effectiveVisualScale(w, h)
      stateRef.current = state
    }, [])

    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return false

      const layout = setupDisplayCanvas(canvas)
      if (!layout) return false

      const { width: w, height: h, scale, bufferResized } = layout

      if (bufferResized) markBufferReset()

      const p = paramsRef.current
      const state = stateRef.current
      if (!state) syncState(p.seed, p.density, w, h)
      else if (options.resize) options.resize(state, w, h, p.seed, p.density)
      else {
        state.width = w
        state.height = h
        state.scale = scale
      }

      if (stateRef.current) stateRef.current.scale = scale

      return true
    }, [syncState, markBufferReset])

    useEffect(() => {
      setupCanvas()
      window.addEventListener('resize', setupCanvas)
      return () => window.removeEventListener('resize', setupCanvas)
    }, [setupCanvas])

    useEffect(() => {
      const { w, h } = viewportSize()
      syncState(params.seed, params.density, w, h)
    }, [params.seed, params.density, syncState])

    useEffect(() => {
      if (suppressNavigation) return
      const next = writeParamsToSearch(params, routePath)
      if (currentDocumentUrl() === next) return
      const q = next.indexOf('?')
      const search = q === -1 ? '' : next.slice(q)
      void navigateTo(routePath, search, { replace: true })
    }, [params, suppressNavigation])

    useAnimationLoop((dt) => {
      const canvas = canvasRef.current
      const state = stateRef.current
      if (!canvas || !state) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const p = paramsRef.current
      if (!pausedRef.current) options.step(state, p.speed, dt)

      options.draw(ctx, state)
    }, true)

    useKeyboard({
      onPauseToggle: () => setPaused(v => !v),
      onReseed: () =>
        setParams(prev => paramsFromPartial({ ...prev, seed: randomSeed() })),
      onOverlayToggle: () => {},
      onDebugToggle: () => {},
    })

    useEffect(() => {
      const root = document.documentElement
      root.dataset.visual = options.datasetVisual
      root.dataset.seed = String(params.seed)
      root.dataset.density = String(params.density)
      root.dataset.speed = String(params.speed)
      root.dataset.paused = String(paused)
    }, [params, paused])

    return (
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    )
  }

  return CanvasVisualPage
}
