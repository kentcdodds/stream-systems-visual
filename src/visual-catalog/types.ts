import type { CanvasVisualState } from '../components/canvas-visual-page'

export type CatalogEngine =
  | 'particles'
  | 'rings'
  | 'orbs'
  | 'grid'
  | 'lines'
  | 'veils'
  | 'contours'
  | 'stars'
  | 'mesh'
  | 'spiral'
  | 'lissajous'
  | 'pendulum'
  | 'hex'
  | 'vortex'
  | 'bubbles'
  | 'rain'
  | 'fireflies'
  | 'waves'
  | 'orbit'
  | 'branch'
  | 'flock'
  | 'smoke'
  | 'ripple'
  | 'flame'
  | 'crystal'
  | 'kaleidoscope'
  | 'metaball'
  | 'voronoi'
  | 'reaction'
  | 'fractal'
  | 'magnetic'
  | 'attractor'
  | 'nebula'
  | 'horizon'
  | 'circuit'
  | 'fabric'
  | 'blossom'
  | 'lightning'
  | 'tunnel'
  | 'breathe'
  | 'granular'

export type CatalogEntry = {
  id: string
  path: string
  label: string
  ariaLabel: string
  engine: CatalogEngine
  /** 0–4 — tweaks motion and layout within an engine family */
  variant: number
  /** 0–9 — base hue and accent spread */
  palette: number
}

export type CatalogVisualState = CanvasVisualState & {
  entry: CatalogEntry
  seed: number
  time: number
  firstFrame: boolean
  data: unknown
}
