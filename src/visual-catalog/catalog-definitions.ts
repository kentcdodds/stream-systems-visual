import type { CatalogEngine, CatalogEntry } from './types'

const ENGINE_NAMES: Record<CatalogEngine, [string, string, string, string, string]> = {
  particles: ['Amber Rise', 'Coral Rain', 'Sidewind', 'Nova Burst', 'Helix Bloom'],
  rings: ['Pulse Beacon', 'Echo Pool', 'Ripple Drift', 'Sonar Bloom', 'Halo Field'],
  orbs: ['Soft Nebula', 'Lunar Haze', 'Dream Orbit', 'Mist Lantern', 'Glow Tide'],
  grid: ['Wave Matrix', 'Cell Resonance', 'Lattice Pulse', 'Grid Aurora', 'Phase Mesh'],
  lines: ['Silk Weave', 'Thread Field', 'Wave Loom', 'Line Chorus', 'Moiré Flow'],
  veils: ['Northern Veil', 'Curtain Light', 'Sky Ribbon', 'Aurora Sheet', 'Veil Dance'],
  contours: ['Topo Flow', 'Height Lines', 'Field Map', 'Contour Drift', 'Level Wind'],
  stars: ['Deep Field', 'Star Mist', 'Night Grain', 'Stellar Haze', 'Cosmic Dust'],
  mesh: ['Node Web', 'Link Field', 'Mesh Drift', 'Graph Glow', 'Wire Constellation'],
  spiral: ['Arms Open', 'Galaxy Turn', 'Spiral Bloom', 'Vortex Garden', 'Pinwheel'],
  lissajous: ['Curve Trace', 'Harmonic Path', 'Figure Eight', 'Orbit Draw', 'Lissajous Light'],
  pendulum: ['Wave Sync', 'Pendulum Row', 'Rhythm Line', 'Swing Chorus', 'Phase Pendulum'],
  hex: ['Hex Pulse', 'Honeycomb', 'Cell Glow', 'Hex Field', 'Lattice Hive'],
  vortex: ['Spiral In', 'Drain Flow', 'Whirlpool', 'Cyclone Dust', 'Vortex Core'],
  bubbles: ['Bubble Rise', 'Foam Lift', 'Glass Sphere', 'Bubble Stream', 'Effervescence'],
  rain: ['Silver Rain', 'Storm Slant', 'Mist Fall', 'Needle Rain', 'Downpour'],
  fireflies: ['Firefly Field', 'Blink Meadow', 'Summer Glow', 'Lantern Swarm', 'Twinkle Night'],
  waves: ['Ocean Band', 'Strata Flow', 'Wave Layer', 'Tide Line', 'Band Drift'],
  orbit: ['Planet Dance', 'Orbital Trail', 'Moon Path', 'Ring World', 'Satellite Glow'],
  comet: ['Comet Trail', 'Shooting Light', 'Streak Sky', 'Meteor Pass', 'Tail Wind'],
}

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
  comet: 'shooting comet streaks',
}

const ENGINES = Object.keys(ENGINE_NAMES) as CatalogEngine[]

function slug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = []
  let palette = 0
  for (const engine of ENGINES) {
    const names = ENGINE_NAMES[engine]
    for (let variant = 0; variant < 5; variant++) {
      const label = names[variant]
      const id = slug(label)
      entries.push({
        id,
        path: `/v/${id}`,
        label,
        ariaLabel: `${label} — ${ENGINE_ARIA[engine]}`,
        engine,
        variant,
        palette: palette % 10,
      })
      palette++
    }
  }
  return entries
}

export const catalogDefinitions: CatalogEntry[] = buildCatalog()

export const catalogById = new Map(catalogDefinitions.map(e => [e.id, e]))
export const catalogByPath = new Map(catalogDefinitions.map(e => [e.path, e]))
