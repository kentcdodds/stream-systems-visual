import { createElement, useMemo } from 'react'
import { createCanvasVisualPage } from '../components/canvas-visual-page'
import { readCatalogParams } from '../config/catalog-params'
import { useNavigationPath } from '../hooks/use-navigation-path'
import { catalogByPath } from '../visual-catalog/catalog-definitions'
import {
  createCatalogVisual,
  drawCatalogVisual,
  resizeCatalogVisual,
  stepCatalogVisual,
} from '../visual-catalog/catalog-visual'

const pageCache = new Map<string, ReturnType<typeof createCanvasVisualPage>>()

function getCatalogPage(visualId: string) {
  let page = pageCache.get(visualId)
  if (!page) {
    page = createCanvasVisualPage({
      routeId: visualId,
      readParams: readCatalogParams,
      datasetVisual: visualId,
      create: (seed, density, w, h) => createCatalogVisual(visualId, seed, density, w, h),
      resize: (state, w, h, seed, density) => resizeCatalogVisual(state, w, h, seed, density),
      step: stepCatalogVisual,
      draw: drawCatalogVisual,
    })
    pageCache.set(visualId, page)
  }
  return page
}

function resolveCatalogId(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return catalogByPath.get(normalized)?.id ?? null
}

export function CatalogVisualPage() {
  const { pathname } = useNavigationPath()
  const visualId = resolveCatalogId(pathname)
  const Page = useMemo(() => (visualId ? getCatalogPage(visualId) : null), [visualId])
  if (!Page) return null
  return createElement(Page)
}
