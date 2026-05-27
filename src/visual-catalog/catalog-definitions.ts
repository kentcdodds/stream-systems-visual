import type { CatalogEngine, CatalogEntry } from './types.ts'

const ENGINE_ARIA: Record<CatalogEngine, string> = {
  particles: 'flowing particle field',
  rings: 'expanding pulse rings',
  orbs: 'soft drifting light orbs',
  grid: 'interference grid waves',
  lines: 'woven sine line field',
  veils: 'vertical aurora veils',
  contours: 'drifting contour lines',
  stars: 'twinkling starfield',
  mesh: 'drifting connected mesh',
  spiral: 'rotating spiral particles',
  lissajous: 'harmonic curve tracer',
  pendulum: 'synchronized pendulum wave',
  hex: 'pulsing hexagonal grid',
  vortex: 'swirling particle vortex',
  bubbles: 'rising translucent bubbles',
  rain: 'diagonal rain streaks',
  fireflies: 'blinking firefly swarm',
  waves: 'layered horizontal wave bands',
  orbit: 'orbital body trails',
  branch: 'growing organic branches',
  flock: 'swarming flock motion',
  smoke: 'drifting smoke plumes',
  ripple: 'expanding water ripples',
  flame: 'flickering flame tongues',
  crystal: 'symmetric crystal arms',
  kaleidoscope: 'mirrored kaleidoscope particles',
  metaball: 'merging soft light blobs',
  voronoi: 'drifting voronoi cells',
  reaction: 'evolving reaction diffusion',
  fractal: 'recursive fractal branches',
  magnetic: 'curved magnetic field lines',
  attractor: 'chaotic attractor trail',
  nebula: 'drifting nebula clouds',
  horizon: 'silhouette ridge horizon',
  circuit: 'glowing circuit trace pulses',
  fabric: 'rippling fabric strips',
  blossom: 'drifting blossom petals',
  lightning: 'occasional lightning bolts',
  tunnel: 'perspective warp tunnel',
  breathe: 'minimal breathing glow',
  granular: 'flowing sand grains',
}

/** One entry per engine — skips families already covered by hand-tuned visuals. */
const CATALOG_SEEDS: {
  engine: CatalogEngine
  variant: number
  label: string
  palette: number
}[] = [
  { engine: 'spiral', variant: 2, label: 'Spiral Bloom', palette: 2 },
  { engine: 'lissajous', variant: 2, label: 'Figure Eight', palette: 4 },
  { engine: 'pendulum', variant: 0, label: 'Wave Sync', palette: 5 },
  { engine: 'hex', variant: 0, label: 'Hex Pulse', palette: 6 },
  { engine: 'vortex', variant: 2, label: 'Whirlpool', palette: 7 },
  { engine: 'bubbles', variant: 0, label: 'Bubble Rise', palette: 8 },
  { engine: 'rain', variant: 1, label: 'Storm Slant', palette: 9 },
  { engine: 'fireflies', variant: 0, label: 'Firefly Field', palette: 0 },
  { engine: 'orbit', variant: 0, label: 'Planet Dance', palette: 1 },
  { engine: 'branch', variant: 0, label: 'Root Growth', palette: 2 },
  { engine: 'flock', variant: 1, label: 'Murmuration', palette: 3 },
  { engine: 'smoke', variant: 0, label: 'Smoke Rise', palette: 4 },
  { engine: 'ripple', variant: 0, label: 'Still Pool', palette: 5 },
  { engine: 'flame', variant: 0, label: 'Living Flame', palette: 9 },
  { engine: 'crystal', variant: 1, label: 'Frost Crystal', palette: 6 },
  { engine: 'kaleidoscope', variant: 0, label: 'Prism Mirror', palette: 7 },
  { engine: 'metaball', variant: 0, label: 'Lava Merge', palette: 0 },
  { engine: 'voronoi', variant: 0, label: 'Cell Drift', palette: 1 },
  { engine: 'reaction', variant: 1, label: 'Morph Field', palette: 2 },
  { engine: 'fractal', variant: 0, label: 'Deep Fractal', palette: 3 },
  { engine: 'magnetic', variant: 0, label: 'Field Lines', palette: 4 },
  { engine: 'attractor', variant: 0, label: 'Strange Loop', palette: 5 },
  { engine: 'nebula', variant: 0, label: 'Nebula Drift', palette: 8 },
  { engine: 'horizon', variant: 0, label: 'Distant Ridge', palette: 6 },
  { engine: 'circuit', variant: 0, label: 'Trace Pulse', palette: 7 },
  { engine: 'fabric', variant: 1, label: 'Silk Wind', palette: 2 },
  { engine: 'blossom', variant: 0, label: 'Petal Fall', palette: 5 },
  { engine: 'lightning', variant: 0, label: 'Storm Flash', palette: 4 },
  { engine: 'tunnel', variant: 0, label: 'Warp Tunnel', palette: 9 },
  { engine: 'breathe', variant: 0, label: 'Slow Breath', palette: 1 },
  { engine: 'granular', variant: 0, label: 'Sand Flow', palette: 0 },
]

function slug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildCatalog(): CatalogEntry[] {
  return CATALOG_SEEDS.map(seed => {
    const id = slug(seed.label)
    return {
      id,
      path: `/v/${id}`,
      label: seed.label,
      ariaLabel: `${seed.label} — ${ENGINE_ARIA[seed.engine]}`,
      engine: seed.engine,
      variant: seed.variant,
      palette: seed.palette,
    }
  })
}

export const catalogDefinitions: CatalogEntry[] = buildCatalog()

export const catalogById = new Map(catalogDefinitions.map(e => [e.id, e]))
export const catalogByPath = new Map(catalogDefinitions.map(e => [e.path, e]))
