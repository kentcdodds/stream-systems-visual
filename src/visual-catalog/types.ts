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
  | 'comet'

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
