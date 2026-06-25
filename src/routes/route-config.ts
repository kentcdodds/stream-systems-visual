/** Route metadata only — safe to import from pages without circular deps */

import { catalogRouteConfigs } from '../visual-catalog/catalog-routes.ts'

export const homePath = '/'

/** OBS slideshow: random visuals, `?interval=` seconds between fades */
export const cyclePath = '/cycle'

export type VisualizationRouteConfig = {
  id: string
  path: string
  /** Visible label on the homepage tile */
  label: string
  ariaLabel: string
}

export const visualizationRouteConfigs: VisualizationRouteConfig[] = [
  {
    id: 'systems',
    path: '/v/systems',
    label: 'Systems',
    ariaLabel: 'Living systems diagram',
  },
  {
    id: 'flow-ribbons',
    path: '/v/flow-ribbons',
    label: 'Flow',
    ariaLabel: 'Curl noise flow ribbons',
  },
  {
    id: 'resonance',
    path: '/v/resonance',
    label: 'Resonance',
    ariaLabel: 'Interference wave resonance',
  },
  {
    id: 'strata',
    path: '/v/strata',
    label: 'Strata',
    ariaLabel: 'Drifting horizontal strata bands',
  },
  {
    id: 'saber',
    path: '/v/saber',
    label: 'Saber',
    ariaLabel: 'Glowing energy blade duel',
  },
  {
    id: 'ember',
    path: '/v/ember',
    label: 'Ember',
    ariaLabel: 'Rising ember particles',
  },
  {
    id: 'cascade',
    path: '/v/cascade',
    label: 'Cascade',
    ariaLabel: 'Falling blue particle cascade',
  },
  {
    id: 'sonar',
    path: '/v/sonar',
    label: 'Sonar',
    ariaLabel: 'Expanding sonar rings',
  },
  {
    id: 'mesh',
    path: '/v/mesh',
    label: 'Mesh',
    ariaLabel: 'Drifting node mesh',
  },
  {
    id: 'void',
    path: '/v/void',
    label: 'Void',
    ariaLabel: 'Starfield and comets',
  },
  {
    id: 'weave',
    path: '/v/weave',
    label: 'Weave',
    ariaLabel: 'Moiré sine weave',
  },
  {
    id: 'pulse',
    path: '/v/pulse',
    label: 'Pulse',
    ariaLabel: 'Grid pulse waves',
  },
  {
    id: 'aurora',
    path: '/v/aurora',
    label: 'Aurora',
    ariaLabel: 'Vertical aurora veils',
  },
  {
    id: 'sparks',
    path: '/v/sparks',
    label: 'Sparks',
    ariaLabel: 'Electric arc sparks',
  },
  {
    id: 'drift',
    path: '/v/drift',
    label: 'Drift',
    ariaLabel: 'Soft drifting bokeh',
  },
  {
    id: 'contour',
    path: '/v/contour',
    label: 'Contour',
    ariaLabel: 'Drifting contour field',
  },
  {
    id: 'light-bike',
    path: '/v/light-bike',
    label: 'Light Bike',
    ariaLabel: 'Tron-style light cycle trails',
  },
  {
    id: 'snake',
    path: '/v/snake',
    label: 'Snake',
    ariaLabel: 'Autonomous snake game',
  },
  {
    id: 'harmonic-strings',
    path: '/v/harmonic-strings',
    label: 'Harmonic Strings',
    ariaLabel: 'Multiple figure-eight curve tracers',
  },
  {
    id: 'solar-voyage',
    path: '/v/solar-voyage',
    label: 'Solar Voyage',
    ariaLabel: 'Solar system drifting through space',
  },
  {
    id: 'spawn',
    path: '/v/spawn',
    label: 'Spawn',
    ariaLabel: 'Flowing particles drawn to wandering targets',
  },
  {
    id: 'spinner',
    path: '/v/spinner',
    label: 'Spinner',
    ariaLabel: 'Concentric pulsing dot rings',
  },
  ...catalogRouteConfigs,
]

export function getRouteConfig(id: string) {
  const hit = visualizationRouteConfigs.find(c => c.id === id)
  if (!hit) throw new Error(`Unknown visualization route: ${id}`)
  return hit
}

export function matchRouteConfig(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === homePath) return { config: null as null, path: homePath }

  const hit = visualizationRouteConfigs.find(c => c.path === normalized)
  if (hit) return { config: hit, path: normalized }

  return null
}
