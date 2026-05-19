import { paramsFromPartial, readParamsFromSearch, type VisualParams } from './params'

export { paramsFromPartial }

export const resonanceDefaults = {
  seed: 23,
  density: 0.5,
  speed: 0.75,
}

export function readResonanceParams(search: string): VisualParams {
  const q = new URLSearchParams(search)
  const params = readParamsFromSearch(search)
  if (!q.has('density')) params.density = resonanceDefaults.density
  if (!q.has('speed')) params.speed = resonanceDefaults.speed
  if (!q.has('seed')) params.seed = resonanceDefaults.seed
  return params
}
