import { paramsFromPartial, readParamsFromSearch, type VisualParams } from './params'

export { paramsFromPartial }

export const strataDefaults = {
  seed: 31,
  density: 0.55,
  speed: 0.8,
}

export function readStrataParams(search: string): VisualParams {
  const q = new URLSearchParams(search)
  const params = readParamsFromSearch(search)
  if (!q.has('density')) params.density = strataDefaults.density
  if (!q.has('speed')) params.speed = strataDefaults.speed
  if (!q.has('seed')) params.seed = strataDefaults.seed
  return params
}
