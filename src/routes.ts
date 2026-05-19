import { lazy, type ComponentType } from 'react'
import { SystemsVisualPage } from './pages/systems-visual-page'

const OrbFieldVisualPage = lazy(() =>
  import('./pages/orb-field-visual-page').then(m => ({ default: m.OrbFieldVisualPage })),
)
const FlowRibbonsVisualPage = lazy(() =>
  import('./pages/flow-ribbons-visual-page').then(m => ({ default: m.FlowRibbonsVisualPage })),
)
const ResonanceVisualPage = lazy(() =>
  import('./pages/resonance-visual-page').then(m => ({ default: m.ResonanceVisualPage })),
)
const StrataVisualPage = lazy(() =>
  import('./pages/strata-visual-page').then(m => ({ default: m.StrataVisualPage })),
)
const SaberVisualPage = lazy(() =>
  import('./pages/saber-visual-page').then(m => ({ default: m.SaberVisualPage })),
)
import {
  homePath,
  matchRouteConfig,
  visualizationRouteConfigs,
  type VisualizationRouteConfig,
} from './routes/route-config'

export type VisualizationRoute = VisualizationRouteConfig & {
  Page: ComponentType
}

const pagesById = {
  systems: SystemsVisualPage,
  'orb-field': OrbFieldVisualPage,
  'flow-ribbons': FlowRibbonsVisualPage,
  resonance: ResonanceVisualPage,
  strata: StrataVisualPage,
  saber: SaberVisualPage,
} satisfies Record<string, ComponentType>

/** Register new full-screen visuals in route-config.ts and pagesById */
export const visualizationRoutes: VisualizationRoute[] = visualizationRouteConfigs.map(
  config => ({
    ...config,
    Page: pagesById[config.id as keyof typeof pagesById],
  }),
)

export { homePath }

export function matchRoute(pathname: string) {
  const hit = matchRouteConfig(pathname)
  if (hit === null) return null
  if (hit.config === null) return { route: null, path: hit.path }

  const route = visualizationRoutes.find(r => r.id === hit.config.id)
  if (!route) return null
  return { route, path: hit.path }
}
