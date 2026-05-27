import type { VisualizationRouteConfig } from '../routes/route-config.ts'
import { catalogDefinitions } from './catalog-definitions.ts'

export const catalogRouteConfigs: VisualizationRouteConfig[] = catalogDefinitions.map(entry => ({
  id: entry.id,
  path: entry.path,
  label: entry.label,
  ariaLabel: entry.ariaLabel,
}))
