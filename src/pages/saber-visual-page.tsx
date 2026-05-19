import { useCallback, useEffect, useRef, useState } from 'react'
import { paramsFromPartial, readSaberParams } from '../config/saber-params'
import { writeParamsToSearch, type VisualParams } from '../config/params'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { setupDisplayCanvas } from '../rendering/setup-display-canvas'
import { useVisualRuntime } from '../context/visual-runtime-context'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { getRouteConfig } from '../routes/route-config'
import { drawSaberFrame } from '../visualizations/saber/draw'
import {
  createSaberField,
  resizeSaberField,
  stepSaberField,
  type SaberField,
} from '../visualizations/saber/blades'

const routePath = getRouteConfig('saber').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

function viewportSize() {
  return { w: window.innerWidth, h: window.innerHeight }
}

export function SaberVisualPage() {
  const { suppressNavigation } = useVisualRuntime()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<SaberField | null>(null)
  const pausedRef = useRef(false)
  const paramsRef = useRef<VisualParams>(readSaberParams(window.location.search))

  const [params, setParams] = useState<VisualParams>(() =>
    readSaberParams(window.location.search),
  )
  const [paused, setPaused] = useState(false)

  paramsRef.current = params
  pausedRef.current = paused

  const markBufferReset = useCallback(() => {
    const field = fieldRef.current
    if (field) field.firstFrame = true
  }, [])

  const syncField = useCallback((seed: number, density: number, w: number, h: number) => {
    if (w < 32 || h < 32) return
    fieldRef.current = createSaberField(seed, density, w, h)
  }, [])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const layout = setupDisplayCanvas(canvas)
    if (!layout) return false
    const { width: w, height: h, bufferResized } = layout

    if (bufferResized) markBufferReset()

    const p = paramsRef.current
    if (!fieldRef.current) syncField(p.seed, p.density, w, h)
    else resizeSaberField(fieldRef.current, w, h, p.seed, p.density)

    return true
  }, [syncField, markBufferReset])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  useEffect(() => {
    const { w, h } = viewportSize()
    syncField(params.seed, params.density, w, h)
  }, [params.seed, params.density, syncField])

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
    const field = fieldRef.current
    if (!canvas || !field) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const p = paramsRef.current
    if (!pausedRef.current) stepSaberField(field, p.speed, dt)

    drawSaberFrame(ctx, field)
  }, true)

  useKeyboard({
    onPauseToggle: () => setPaused(v => !v),
    onReseed: () => setParams(prev => paramsFromPartial({ ...prev, seed: randomSeed() })),
    onOverlayToggle: () => {},
    onDebugToggle: () => {},
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'saber'
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
