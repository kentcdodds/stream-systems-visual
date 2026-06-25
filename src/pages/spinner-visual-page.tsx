import { useEffect, useState } from 'react'
import { paramsFromPartial, writeParamsToSearch, type VisualParams } from '../config/params'
import { readSpinnerParams } from '../config/spinner-params'
import { useVisualRuntime } from '../context/visual-runtime-context'
import { useKeyboard } from '../hooks/use-keyboard'
import { currentDocumentUrl, navigateTo } from '../navigation/navigation-api'
import { effectiveVisualScale } from '../rendering/resolution-scale'
import { getRouteConfig } from '../routes/route-config'
import { ringCountFromDensity, SpinnerVisual } from '../visualizations/spinner/spinner'

const routePath = getRouteConfig('spinner').path

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1
}

function viewportScale() {
  return effectiveVisualScale(window.innerWidth, window.innerHeight)
}

export function SpinnerVisualPage() {
  const { suppressNavigation } = useVisualRuntime()
  const [params, setParams] = useState<VisualParams>(() =>
    readSpinnerParams(window.location.search),
  )
  const [paused, setPaused] = useState(false)
  const [scale, setScale] = useState(viewportScale)

  useEffect(() => {
    const onResize = () => setScale(viewportScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (suppressNavigation) return
    const next = writeParamsToSearch(params, routePath)
    if (currentDocumentUrl() === next) return
    const q = next.indexOf('?')
    const search = q === -1 ? '' : next.slice(q)
    void navigateTo(routePath, search, { replace: true })
  }, [params, suppressNavigation])

  useKeyboard({
    onPauseToggle: () => setPaused(v => !v),
    onReseed: () => setParams(prev => paramsFromPartial({ ...prev, seed: randomSeed() })),
    onOverlayToggle: () => {},
    onDebugToggle: () => {},
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.visual = 'spinner'
    root.dataset.seed = String(params.seed)
    root.dataset.density = String(params.density)
    root.dataset.speed = String(params.speed)
    root.dataset.paused = String(paused)
  }, [params, paused])

  const numberOfRings = ringCountFromDensity(params.density)

  return (
    <SpinnerVisual
      numberOfRings={numberOfRings}
      speed={params.speed}
      scale={scale}
      paused={paused}
    />
  )
}
