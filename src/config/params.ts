/**
 * Runtime configuration: URL query params override defaults.
 * Text fields are stored for external/OBS overlays — this app does not render them.
 */

export type VisualParams = {
  seed: number
  density: number
  speed: number
  title: string
  subtitle: string
  startingSoon: string
}

export type UiState = {
  paused: boolean
  showOverlays: boolean
  showDebug: boolean
}

const DEFAULTS: VisualParams = {
  seed: 42,
  density: 0.45,
  speed: 1,
  title: '',
  subtitle: '',
  startingSoon: '',
}

function parseNumber(value: string | null, fallback: number, min: number, max: number) {
  if (value == null || value === '') return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function parseString(value: string | null, fallback: string) {
  if (value == null) return fallback
  return value
}

export function readParamsFromSearch(search: string): VisualParams {
  const q = new URLSearchParams(search)
  return {
    seed: parseNumber(q.get('seed'), DEFAULTS.seed, 0, 2147483647),
    density: parseNumber(q.get('density'), DEFAULTS.density, 0.15, 0.85),
    speed: parseNumber(q.get('speed'), DEFAULTS.speed, 0.1, 3),
    title: parseString(q.get('title'), DEFAULTS.title),
    subtitle: parseString(q.get('subtitle'), DEFAULTS.subtitle),
    startingSoon: parseString(q.get('startingSoon') ?? q.get('soon'), DEFAULTS.startingSoon),
  }
}

export function writeParamsToSearch(
  params: VisualParams,
  pathname: string,
) {
  const q = new URLSearchParams()
  q.set('seed', String(params.seed))
  q.set('density', String(params.density))
  q.set('speed', String(params.speed))
  if (params.title) q.set('title', params.title)
  if (params.subtitle) q.set('subtitle', params.subtitle)
  if (params.startingSoon) q.set('startingSoon', params.startingSoon)
  const query = q.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function paramsFromPartial(partial: Partial<VisualParams>): VisualParams {
  return { ...DEFAULTS, ...partial }
}
