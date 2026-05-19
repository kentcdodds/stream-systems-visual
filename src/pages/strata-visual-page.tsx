import { useCallback, useEffect, useRef, useState } from 'react'
import { paramsFromPartial, readStrataParams } from '../config/strata-params'
import { writeParamsToSearch, type VisualParams } from '../config/params'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { getRouteConfig } from '../routes/route-config'
import { drawStrataFrame } from '../visualizations/strata/draw'
import {
  createStrataField,
  resizeStrataField,
  stepStrataField,
  type StrataField,
} from '../visualizations/strata/layers'

const routePath = getRouteConfig('strata').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

function viewportSize() {
  return { w: window.innerWidth, h: window.innerHeight }
}

export function StrataVisualPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<StrataField | null>(null)
  const pausedRef = useRef(false)
  const paramsRef = useRef<VisualParams>(readStrataParams(window.location.search))

  const [params, setParams] = useState<VisualParams>(() =>
    readStrataParams(window.location.search),
  )
  const [paused, setPaused] = useState(false)

  paramsRef.current = params
  pausedRef.current = paused

  const syncField = useCallback((seed: number, density: number, w: number, h: number) => {
    if (w < 32 || h < 32) return
    fieldRef.current = createStrataField(seed, density, w, h)
  }, [])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { w, h } = viewportSize()
    if (w < 32 || h < 32) return false

    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const p = paramsRef.current
    if (!fieldRef.current) syncField(p.seed, p.density, w, h)
    else resizeStrataField(fieldRef.current, w, h, p.seed, p.density)

    return true
  }, [syncField])

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
    const next = writeParamsToSearch(params, routePath)
    if (currentDocumentUrl() === next) return
    const q = next.indexOf('?')
    const search = q === -1 ? '' : next.slice(q)
    void navigateTo(routePath, search, { replace: true })
  }, [params])

  useAnimationLoop((dt) => {
    const canvas = canvasRef.current
    const field = fieldRef.current
    if (!canvas || !field) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const p = paramsRef.current
    if (!pausedRef.current) stepStrataField(field, p.speed, dt)

    drawStrataFrame(ctx, field)
  }, true)

  useKeyboard({
    onPauseToggle: () => setPaused(v => !v),
    onReseed: () => setParams(prev => paramsFromPartial({ ...prev, seed: randomSeed() })),
    onOverlayToggle: () => {},
    onDebugToggle: () => {},
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'strata'
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
