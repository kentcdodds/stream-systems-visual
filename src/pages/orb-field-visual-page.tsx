import { useEffect, useRef, useState } from 'react'
import {
  paramsFromPartial,
  readOrbFieldParams,
} from '../config/orb-field-params'
import { writeParamsToSearch, type VisualParams } from '../config/params'
import { useAnimationLoop } from '../hooks/use-animation-loop'
import { useKeyboard } from '../hooks/use-keyboard'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { getRouteConfig } from '../routes/route-config'
import {
  createOrbFieldScene,
  type OrbFieldScene,
} from '../visualizations/orb-field/three-scene'

const routePath = getRouteConfig('orb-field').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

export function OrbFieldVisualPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OrbFieldScene | null>(null)
  const paramsRef = useRef<VisualParams>(readOrbFieldParams(window.location.search))
  const pausedRef = useRef(false)

  const [params, setParams] = useState<VisualParams>(() =>
    readOrbFieldParams(window.location.search),
  )
  const [paused, setPaused] = useState(false)

  paramsRef.current = params
  pausedRef.current = paused

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scene = createOrbFieldScene(el, params.seed, params.density)
    sceneRef.current = scene
    scene.resize()

    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [params.seed, params.density])

  useEffect(() => {
    const next = writeParamsToSearch(params, routePath)
    if (currentDocumentUrl() === next) return
    const q = next.indexOf('?')
    const search = q === -1 ? '' : next.slice(q)
    void navigateTo(routePath, search, { replace: true })
  }, [params])

  useEffect(() => {
    function onResize() {
      sceneRef.current?.resize()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useAnimationLoop((dt) => {
    const scene = sceneRef.current
    if (!scene) return
    const p = paramsRef.current
    if (!pausedRef.current) scene.update(p.seed, p.speed, dt)
    scene.render()
  }, true)

  useKeyboard({
    onPauseToggle: () => setPaused(v => !v),
    onReseed: () => setParams(p => paramsFromPartial({ ...p, seed: randomSeed() })),
    onOverlayToggle: () => {},
    onDebugToggle: () => {},
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'orb-field'
    root.dataset.seed = String(params.seed)
    root.dataset.density = String(params.density)
    root.dataset.speed = String(params.speed)
    root.dataset.paused = String(paused)
  }, [params, paused])

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  )
}
