import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { paramsFromPartial, type UiState, type VisualParams } from '../config/params'
import { readSystemsParams, writeSystemsParamsToSearch } from '../config/systems-params'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { drawFrame } from '../rendering/draw'
import { setupDisplayCanvas } from '../rendering/setup-display-canvas'
import { createWorld, stepWorld } from '../simulation/world'
import type { World } from '../simulation/types'
import { useVisualRuntime } from '../context/visual-runtime-context'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { getRouteConfig } from '../routes/route-config'

const routePath = getRouteConfig('systems').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

export function SystemsVisualPage() {
  const { suppressNavigation } = useVisualRuntime()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)

  const pinSeedInUrl = useRef(new URLSearchParams(window.location.search).has('seed'))

  const [params, setParams] = useState<VisualParams>(() =>
    readSystemsParams(window.location.search),
  )
  const [ui, setUi] = useState<UiState>({
    paused: false,
    showOverlays: true,
    showDebug: false,
  })

  const syncWorld = useCallback((seed: number, density: number) => {
    worldRef.current = createWorld(seed, density)
  }, [])

  useEffect(() => {
    syncWorld(params.seed, params.density)
  }, [params.seed, params.density, syncWorld])

  useEffect(() => {
    if (suppressNavigation) return
    const next = writeSystemsParamsToSearch(params, routePath, pinSeedInUrl.current)
    if (currentDocumentUrl() === next) return
    const q = next.indexOf('?')
    const search = q === -1 ? '' : next.slice(q)
    void navigateTo(routePath, search, { replace: true })
  }, [params, suppressNavigation])

  const drawOpts = useMemo(
    () => ({
      seed: params.seed,
      showOverlays: ui.showOverlays,
      showDebug: ui.showDebug,
      width: 0,
      height: 0,
    }),
    [params.seed, ui.showOverlays, ui.showDebug],
  )

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setupDisplayCanvas(canvas)
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  useAnimationLoop((dt) => {
    const canvas = canvasRef.current
    const world = worldRef.current
    if (!canvas || !world) return

    if (!ui.paused) stepWorld(world, params.seed, params.speed, dt)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    drawFrame(ctx, world, {
      ...drawOpts,
      width,
      height,
    })
  }, true)

  const handlers = useMemo(
    () => ({
      onPauseToggle: () => setUi(u => ({ ...u, paused: !u.paused })),
      onReseed: () => {
        pinSeedInUrl.current = true
        setParams(p => paramsFromPartial({ ...p, seed: randomSeed() }))
      },
      onOverlayToggle: () => setUi(u => ({ ...u, showOverlays: !u.showOverlays })),
      onDebugToggle: () => setUi(u => ({ ...u, showDebug: !u.showDebug })),
    }),
    [],
  )

  useKeyboard(handlers)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'systems'
    root.dataset.seed = String(params.seed)
    root.dataset.density = String(params.density)
    root.dataset.speed = String(params.speed)
    root.dataset.title = params.title
    root.dataset.subtitle = params.subtitle
    root.dataset.startingSoon = params.startingSoon
    root.dataset.paused = String(ui.paused)
  }, [params, ui.paused])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
