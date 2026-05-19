import { useCallback, useEffect, useRef, useState } from 'react'
import {
  paramsFromPartial,
  readFlowRibbonsParams,
} from '../config/flow-ribbons-params'
import { writeParamsToSearch, type VisualParams } from '../config/params'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { setupDisplayCanvas } from '../rendering/setup-display-canvas'
import { useVisualRuntime } from '../context/visual-runtime-context'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { getRouteConfig } from '../routes/route-config'
import { drawFlowRibbonsFrame } from '../visualizations/flow-ribbons/draw'
import {
  createFlowRibbons,
  resizeFlowRibbons,
  stepFlowRibbons,
  type FlowRibbons,
} from '../visualizations/flow-ribbons/particles'

const routePath = getRouteConfig('flow-ribbons').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

function viewportSize() {
  return {
    w: window.innerWidth,
    h: window.innerHeight,
  }
}

export function FlowRibbonsVisualPage() {
  const { suppressNavigation } = useVisualRuntime()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<FlowRibbons | null>(null)
  const firstFrameRef = useRef(true)
  const pausedRef = useRef(false)
  const paramsRef = useRef<VisualParams>(readFlowRibbonsParams(window.location.search))

  const [params, setParams] = useState<VisualParams>(() =>
    readFlowRibbonsParams(window.location.search),
  )
  const [paused, setPaused] = useState(false)

  paramsRef.current = params
  pausedRef.current = paused

  const markBufferReset = useCallback(() => {
    firstFrameRef.current = true
  }, [])

  const syncSim = useCallback((seed: number, density: number, w: number, h: number) => {
    if (w < 32 || h < 32) return
    simRef.current = createFlowRibbons(seed, density, w, h)
    markBufferReset()
  }, [markBufferReset])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const layout = setupDisplayCanvas(canvas)
    if (!layout) return null
    const { width: w, height: h, bufferResized } = layout

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    if (bufferResized) markBufferReset()

    const p = paramsRef.current
    const sim = simRef.current
    if (!sim) {
      syncSim(p.seed, p.density, w, h)
    } else {
      resizeFlowRibbons(sim, w, h, p.seed, p.density)
      if (bufferResized) markBufferReset()
    }

    return ctx
  }, [markBufferReset, syncSim])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  useEffect(() => {
    const { w, h } = viewportSize()
    syncSim(params.seed, params.density, w, h)
  }, [params.seed, params.density, syncSim])

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
    const sim = simRef.current
    if (!canvas || !sim) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const p = paramsRef.current
    if (!pausedRef.current) stepFlowRibbons(sim, p.seed, p.speed, dt)

    drawFlowRibbonsFrame(ctx, sim, firstFrameRef.current)
    firstFrameRef.current = false
  }, true)

  useKeyboard({
    onPauseToggle: () => setPaused(v => !v),
    onReseed: () => setParams(prev => paramsFromPartial({ ...prev, seed: randomSeed() })),
    onOverlayToggle: () => {},
    onDebugToggle: () => {},
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'flow-ribbons'
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
