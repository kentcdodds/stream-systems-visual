import { paramsFromPartial, readParamsFromSearch, type VisualParams } from './params'

export { paramsFromPartial }

export const flowRibbonsDefaults = {
  seed: 17,
  density: 0.55,
  speed: 0.85,
}

export function readFlowRibbonsParams(search: string): VisualParams {
  const q = new URLSearchParams(search)
  const params = readParamsFromSearch(search)
  if (!q.has('density')) params.density = flowRibbonsDefaults.density
  if (!q.has('speed')) params.speed = flowRibbonsDefaults.speed
  if (!q.has('seed')) params.seed = flowRibbonsDefaults.seed
  return params
}
