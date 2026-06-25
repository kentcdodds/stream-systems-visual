import { lazy, type ComponentType } from 'react'
import { SystemsVisualPage } from './pages/systems-visual-page'

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
const EmberVisualPage = lazy(() =>
  import('./pages/ember-visual-page').then(m => ({ default: m.EmberVisualPage })),
)
const CindersVisualPage = lazy(() =>
  import('./pages/cinders-visual-page').then(m => ({ default: m.CindersVisualPage })),
)
const CascadeVisualPage = lazy(() =>
  import('./pages/cascade-visual-page').then(m => ({ default: m.CascadeVisualPage })),
)
const SonarVisualPage = lazy(() =>
  import('./pages/sonar-visual-page').then(m => ({ default: m.SonarVisualPage })),
)
const MeshVisualPage = lazy(() =>
  import('./pages/mesh-visual-page').then(m => ({ default: m.MeshVisualPage })),
)
const VoidVisualPage = lazy(() =>
  import('./pages/void-visual-page').then(m => ({ default: m.VoidVisualPage })),
)
const WeaveVisualPage = lazy(() =>
  import('./pages/weave-visual-page').then(m => ({ default: m.WeaveVisualPage })),
)
const PulseVisualPage = lazy(() =>
  import('./pages/pulse-visual-page').then(m => ({ default: m.PulseVisualPage })),
)
const AuroraVisualPage = lazy(() =>
  import('./pages/aurora-visual-page').then(m => ({ default: m.AuroraVisualPage })),
)
const SparksVisualPage = lazy(() =>
  import('./pages/sparks-visual-page').then(m => ({ default: m.SparksVisualPage })),
)
const DriftVisualPage = lazy(() =>
  import('./pages/drift-visual-page').then(m => ({ default: m.DriftVisualPage })),
)
const ContourVisualPage = lazy(() =>
  import('./pages/contour-visual-page').then(m => ({ default: m.ContourVisualPage })),
)
const LightBikeVisualPage = lazy(() =>
  import('./pages/light-bike-visual-page').then(m => ({ default: m.LightBikeVisualPage })),
)
const SnakeVisualPage = lazy(() =>
  import('./pages/snake-visual-page').then(m => ({ default: m.SnakeVisualPage })),
)
const HarmonicStringsVisualPage = lazy(() =>
  import('./pages/harmonic-strings-visual-page').then(m => ({ default: m.HarmonicStringsVisualPage })),
)
const SolarVoyageVisualPage = lazy(() =>
  import('./pages/solar-voyage-visual-page').then(m => ({ default: m.SolarVoyageVisualPage })),
)
const CatalogVisualPage = lazy(() =>
  import('./pages/catalog-visual-page').then(m => ({ default: m.CatalogVisualPage })),
)
import { catalogDefinitions } from './visual-catalog/catalog-definitions'
import {
  homePath,
  matchRouteConfig,
  visualizationRouteConfigs,
  type VisualizationRouteConfig,
} from './routes/route-config'

export type VisualizationRoute = VisualizationRouteConfig & {
  Page: ComponentType
}

export const visualizationPagesById = {
  systems: SystemsVisualPage,
  'flow-ribbons': FlowRibbonsVisualPage,
  resonance: ResonanceVisualPage,
  strata: StrataVisualPage,
  saber: SaberVisualPage,
  ember: EmberVisualPage,
  cinders: CindersVisualPage,
  cascade: CascadeVisualPage,
  sonar: SonarVisualPage,
  mesh: MeshVisualPage,
  void: VoidVisualPage,
  weave: WeaveVisualPage,
  pulse: PulseVisualPage,
  aurora: AuroraVisualPage,
  sparks: SparksVisualPage,
  drift: DriftVisualPage,
  contour: ContourVisualPage,
  'light-bike': LightBikeVisualPage,
  snake: SnakeVisualPage,
  'harmonic-strings': HarmonicStringsVisualPage,
  'solar-voyage': SolarVoyageVisualPage,
  ...Object.fromEntries(catalogDefinitions.map(d => [d.id, CatalogVisualPage])),
} satisfies Record<string, ComponentType>

/** Register new full-screen visuals in route-config.ts and visualizationPagesById */
export const visualizationRoutes: VisualizationRoute[] = visualizationRouteConfigs.map(
  config => ({
    ...config,
    Page: visualizationPagesById[config.id as keyof typeof visualizationPagesById],
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
