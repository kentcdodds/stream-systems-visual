import { paramsFromPartial, readParamsFromSearch, type VisualParams } from './params'

export { paramsFromPartial }

export const saberDefaults = {
  seed: 47,
  density: 0.5,
  speed: 1.15,
}

export function readSaberParams(search: string): VisualParams {
  const q = new URLSearchParams(search)
  const params = readParamsFromSearch(search)
  if (!q.has('density')) params.density = saberDefaults.density
  if (!q.has('speed')) params.speed = saberDefaults.speed
  if (!q.has('seed')) params.seed = saberDefaults.seed
  return params
}
