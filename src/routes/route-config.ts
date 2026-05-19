/** Route metadata only — safe to import from pages without circular deps */

export const homePath = '/'

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
    id: 'orb-field',
    path: '/v/orb-field',
    label: 'Orb field',
    ariaLabel: 'Glowing orb asteroid field',
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
