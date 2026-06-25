import { useCallback, useEffect, useRef, useState } from 'react'
import { paramsFromPartial, writeParamsToSearch, type VisualParams } from '../config/params'
import { readSpawnParams } from '../config/spawn-params'
import { useVisualRuntime } from '../context/visual-runtime-context'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { setupDisplayCanvas } from '../rendering/setup-display-canvas'
import { getRouteConfig } from '../routes/route-config'
import {
  bumpSpawnAutonomousDelay,
  createSpawn,
  drawSpawn,
  onSpawnPointerDown,
  onSpawnPointerMove,
  resizeSpawn,
  stepSpawn,
  type SpawnState,
} from '../visualizations/spawn/spawn'

const routePath = getRouteConfig('spawn').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

function pointerPos(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

export function SpawnVisualPage() {
  const { suppressNavigation } = useVisualRuntime()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<SpawnState | null>(null)
  const pointerDownRef = useRef(false)
  const pausedRef = useRef(false)
  const paramsRef = useRef<VisualParams>(readSpawnParams(window.location.search))

  const [params, setParams] = useState<VisualParams>(() =>
    readSpawnParams(window.location.search),
  )
  const [paused, setPaused] = useState(false)

  paramsRef.current = params
  pausedRef.current = paused

  const markBufferReset = useCallback(() => {
    const state = stateRef.current
    if (state) state.firstFrame = true
  }, [])

  const syncState = useCallback((seed: number, density: number, w: number, h: number) => {
    if (w < 32 || h < 32) return
    stateRef.current = createSpawn(seed, density, w, h)
  }, [])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const layout = setupDisplayCanvas(canvas)
    if (!layout) return false

    const { width: w, height: h, bufferResized } = layout
    if (bufferResized) markBufferReset()

    const p = paramsRef.current
    const state = stateRef.current
    if (!state) syncState(p.seed, p.density, w, h)
    else resizeSpawn(state, w, h, p.seed, p.density)

    return true
  }, [syncState, markBufferReset])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  useEffect(() => {
    syncState(params.seed, params.density, window.innerWidth, window.innerHeight)
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
    if (!pausedRef.current) stepSpawn(state, p.speed, dt)
    drawSpawn(ctx, state)
  }, true)

  useKeyboard({
    onPauseToggle: () => setPaused(v => !v),
    onReseed: () => setParams(prev => paramsFromPartial({ ...prev, seed: randomSeed() })),
    onOverlayToggle: () => {},
    onDebugToggle: () => {},
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'spawn'
    root.dataset.seed = String(params.seed)
    root.dataset.density = String(params.density)
    root.dataset.speed = String(params.speed)
    root.dataset.paused = String(paused)
  }, [params, paused])

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return

    pointerDownRef.current = true
    const { x, y } = pointerPos(canvas, clientX, clientY)
    onSpawnPointerDown(state, x, y)
  }, [])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return

    if (pointerDownRef.current) {
      const { x, y } = pointerPos(canvas, clientX, clientY)
      onSpawnPointerMove(state, x, y)
    } else {
      bumpSpawnAutonomousDelay(state)
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    pointerDownRef.current = false
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent) => {
      handlePointerDown(e.clientX, e.clientY)
    }
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY)
    }
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      handlePointerDown(touch.clientX, touch.clientY)
      e.preventDefault()
    }
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      handlePointerMove(touch.clientX, touch.clientY)
      e.preventDefault()
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('mouseup', handlePointerUp)
    document.addEventListener('touchend', handlePointerUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('mouseup', handlePointerUp)
      document.removeEventListener('touchend', handlePointerUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
    />
  )
}
