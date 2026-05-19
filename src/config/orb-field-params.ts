import { paramsFromPartial, readParamsFromSearch, type VisualParams } from './params'

export { paramsFromPartial }

/** Tuned defaults for /v/orb-field when query params are omitted */
export const orbFieldDefaults = {
  seed: 42,
  density: 0.7,
  speed: 0.92,
}

export function readOrbFieldParams(search: string): VisualParams {
  const q = new URLSearchParams(search)
  const params = readParamsFromSearch(search)
  if (!q.has('density')) params.density = orbFieldDefaults.density
  if (!q.has('speed')) params.speed = orbFieldDefaults.speed
  if (!q.has('seed')) params.seed = orbFieldDefaults.seed
  return params
}
