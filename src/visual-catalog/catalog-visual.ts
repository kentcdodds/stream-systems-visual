import { canvasLayoutFields } from '../rendering/resolution-scale'
import { catalogById } from './catalog-definitions'
import * as engines from './engines'
import * as gap from './engines-gap'
import type { CatalogEntry, CatalogVisualState } from './types'

function getEntry(visualId: string): CatalogEntry {
  const entry = catalogById.get(visualId)
  if (!entry) throw new Error(`Unknown catalog visual: ${visualId}`)
  return entry
}

function createData(entry: CatalogEntry, seed: number, density: number, w: number, h: number) {
  switch (entry.engine) {
    case 'particles':
      return engines.createParticles(entry, seed, density, w, h)
    case 'rings':
      return engines.createRings(entry, seed, density, w, h)
    case 'orbs':
      return engines.createOrbs(entry, seed, density, w, h)
    case 'grid':
      return engines.createGrid(entry, seed, density, w, h)
    case 'lines':
      return engines.createLines(entry, seed, density, w, h)
    case 'veils':
      return engines.createVeils(entry, seed, density, w, h)
    case 'contours':
      return engines.createContours(entry, seed, density, w, h)
    case 'stars':
      return engines.createStars(entry, seed, density, w, h)
    case 'mesh':
      return engines.createMesh(entry, seed, density, w, h)
    case 'spiral':
      return engines.createSpiral(entry, seed, density, w, h)
    case 'lissajous':
      return engines.createLissajous(entry, seed, density, w, h)
    case 'pendulum':
      return engines.createPendulum(entry, seed, density, w, h)
    case 'hex':
      return engines.createHex(entry, seed, density, w, h)
    case 'vortex':
      return engines.createVortex(entry, seed, density, w, h)
    case 'bubbles':
      return engines.createBubbles(entry, seed, density, w, h)
    case 'rain':
      return engines.createRain(entry, seed, density, w, h)
    case 'fireflies':
      return engines.createFireflies(entry, seed, density, w, h)
    case 'waves':
      return engines.createWaves(entry, seed, density, w, h)
    case 'orbit':
      return engines.createOrbit(entry, seed, density, w, h)
    case 'branch':
      return gap.createBranch(entry, seed, density, w, h)
    case 'flock':
      return gap.createFlock(entry, seed, density, w, h)
    case 'smoke':
      return gap.createSmoke(entry, seed, density, w, h)
    case 'ripple':
      return gap.createRipple(entry, seed, density, w, h)
    case 'flame':
      return gap.createFlame(entry, seed, density, w, h)
    case 'crystal':
      return gap.createCrystal(entry, seed, density, w, h)
    case 'kaleidoscope':
      return gap.createKaleidoscope(entry, seed, density, w, h)
    case 'metaball':
      return gap.createMetaball(entry, seed, density, w, h)
    case 'voronoi':
      return gap.createVoronoi(entry, seed, density, w, h)
    case 'reaction':
      return gap.createReaction(entry, seed, density, w, h)
    case 'fractal':
      return gap.createFractal(entry, seed, density, w, h)
    case 'magnetic':
      return gap.createMagnetic(entry, seed, density, w, h)
    case 'attractor':
      return gap.createAttractor(entry, seed, density, w, h)
    case 'nebula':
      return gap.createNebula(entry, seed, density, w, h)
    case 'horizon':
      return gap.createHorizon(entry, seed, density, w, h)
    case 'circuit':
      return gap.createCircuit(entry, seed, density, w, h)
    case 'fabric':
      return gap.createFabric(entry, seed, density, w, h)
    case 'blossom':
      return gap.createBlossom(entry, seed, density, w, h)
    case 'lightning':
      return gap.createLightning(entry, seed, density, w, h)
    case 'tunnel':
      return gap.createTunnel(entry, seed, density, w, h)
    case 'breathe':
      return gap.createBreathe(entry, seed, density, w, h)
    case 'granular':
      return gap.createGranular(entry, seed, density, w, h)
    default: {
      const _exhaustive: never = entry.engine
      return _exhaustive
    }
  }
}

export function createCatalogVisual(
  visualId: string,
  seed: number,
  density: number,
  w: number,
  h: number,
): CatalogVisualState {
  const entry = getEntry(visualId)
  const layout = canvasLayoutFields(w, h)
  return {
    entry,
    seed,
    time: 0,
    data: createData(entry, seed, density, w, h),
    ...layout,
    firstFrame: true,
  }
}

function stepData(state: CatalogVisualState, speed: number, dt: number) {
  const { entry, data } = state
  switch (entry.engine) {
    case 'particles':
      engines.stepParticles(data as never, state, speed, dt)
      break
    case 'rings':
      engines.stepRings(data as never, state, speed, dt)
      break
    case 'orbs':
      engines.stepOrbs(data as never, state, speed, dt)
      break
    case 'grid':
      engines.stepGrid(data as never, state, speed, dt)
      break
    case 'lines':
      engines.stepLines(data as never, state, speed, dt)
      break
    case 'veils':
      engines.stepVeils(data as never, state, speed, dt)
      break
    case 'contours':
      engines.stepContours(data as never, state, speed, dt)
      break
    case 'stars':
      engines.stepStars(data as never, state, speed, dt)
      break
    case 'mesh':
      engines.stepMesh(data as never, state, speed, dt)
      break
    case 'spiral':
      engines.stepSpiral(data as never, state, speed, dt)
      break
    case 'lissajous':
      engines.stepLissajous(data as never, state, speed, dt)
      break
    case 'pendulum':
      engines.stepPendulum(data as never, state, speed, dt)
      break
    case 'hex':
      engines.stepHex(data as never, state, speed, dt)
      break
    case 'vortex':
      engines.stepVortex(data as never, state, speed, dt)
      break
    case 'bubbles':
      engines.stepBubbles(data as never, state, speed, dt)
      break
    case 'rain':
      engines.stepRain(data as never, state, speed, dt)
      break
    case 'fireflies':
      engines.stepFireflies(data as never, state, speed, dt)
      break
    case 'waves':
      engines.stepWaves(data as never, state, speed, dt)
      break
    case 'orbit':
      engines.stepOrbit(data as never, state, speed, dt)
      break
    case 'branch':
      gap.stepBranch(data as never, state, speed, dt)
      break
    case 'flock':
      gap.stepFlock(data as never, state, speed, dt)
      break
    case 'smoke':
      gap.stepSmoke(data as never, state, speed, dt)
      break
    case 'ripple':
      gap.stepRipple(data as never, state, speed, dt)
      break
    case 'flame':
      gap.stepFlame(data as never, state, speed, dt)
      break
    case 'crystal':
      gap.stepCrystal(data as never, state, speed, dt)
      break
    case 'kaleidoscope':
      gap.stepKaleidoscope(data as never, state, speed, dt)
      break
    case 'metaball':
      gap.stepMetaball(data as never, state, speed, dt)
      break
    case 'voronoi':
      gap.stepVoronoi(data as never, state, speed, dt)
      break
    case 'reaction':
      gap.stepReaction(data as never, state, speed, dt)
      break
    case 'fractal':
      gap.stepFractal(data as never, state, speed, dt)
      break
    case 'magnetic':
      gap.stepMagnetic(data as never, state, speed, dt)
      break
    case 'attractor':
      gap.stepAttractor(data as never, state, speed, dt)
      break
    case 'nebula':
      gap.stepNebula(data as never, state, speed, dt)
      break
    case 'horizon':
      gap.stepHorizon(data as never, state, speed, dt)
      break
    case 'circuit':
      gap.stepCircuit(data as never, state, speed, dt)
      break
    case 'fabric':
      gap.stepFabric(data as never, state, speed, dt)
      break
    case 'blossom':
      gap.stepBlossom(data as never, state, speed, dt)
      break
    case 'lightning':
      gap.stepLightning(data as never, state, speed, dt)
      break
    case 'tunnel':
      gap.stepTunnel(data as never, state, speed, dt)
      break
    case 'breathe':
      gap.stepBreathe(data as never, state, speed, dt)
      break
    case 'granular':
      gap.stepGranular(data as never, state, speed, dt)
      break
    default: {
      const _exhaustive: never = entry.engine
      return _exhaustive
    }
  }
}

function drawData(ctx: CanvasRenderingContext2D, state: CatalogVisualState) {
  const { entry, data } = state
  switch (entry.engine) {
    case 'particles':
      engines.drawParticles(ctx, entry, data as never, state)
      break
    case 'rings':
      engines.drawRings(ctx, entry, data as never, state)
      break
    case 'orbs':
      engines.drawOrbs(ctx, entry, data as never, state)
      break
    case 'grid':
      engines.drawGrid(ctx, entry, data as never, state)
      break
    case 'lines':
      engines.drawLines(ctx, entry, data as never, state)
      break
    case 'veils':
      engines.drawVeils(ctx, entry, data as never, state)
      break
    case 'contours':
      engines.drawContours(ctx, entry, data as never, state)
      break
    case 'stars':
      engines.drawStars(ctx, entry, data as never, state)
      break
    case 'mesh':
      engines.drawMesh(ctx, entry, data as never, state)
      break
    case 'spiral':
      engines.drawSpiral(ctx, entry, data as never, state)
      break
    case 'lissajous':
      engines.drawLissajous(ctx, entry, data as never, state)
      break
    case 'pendulum':
      engines.drawPendulum(ctx, entry, data as never, state)
      break
    case 'hex':
      engines.drawHex(ctx, entry, data as never, state)
      break
    case 'vortex':
      engines.drawVortex(ctx, entry, data as never, state)
      break
    case 'bubbles':
      engines.drawBubbles(ctx, entry, data as never, state)
      break
    case 'rain':
      engines.drawRain(ctx, entry, data as never, state)
      break
    case 'fireflies':
      engines.drawFireflies(ctx, entry, data as never, state)
      break
    case 'waves':
      engines.drawWaves(ctx, entry, data as never, state)
      break
    case 'orbit':
      engines.drawOrbit(ctx, entry, data as never, state)
      break
    case 'branch':
      gap.drawBranch(ctx, entry, data as never, state)
      break
    case 'flock':
      gap.drawFlock(ctx, entry, data as never, state)
      break
    case 'smoke':
      gap.drawSmoke(ctx, entry, data as never, state)
      break
    case 'ripple':
      gap.drawRipple(ctx, entry, data as never, state)
      break
    case 'flame':
      gap.drawFlame(ctx, entry, data as never, state)
      break
    case 'crystal':
      gap.drawCrystal(ctx, entry, data as never, state)
      break
    case 'kaleidoscope':
      gap.drawKaleidoscope(ctx, entry, data as never, state)
      break
    case 'metaball':
      gap.drawMetaball(ctx, entry, data as never, state)
      break
    case 'voronoi':
      gap.drawVoronoi(ctx, entry, data as never, state)
      break
    case 'reaction':
      gap.drawReaction(ctx, entry, data as never, state)
      break
    case 'fractal':
      gap.drawFractal(ctx, entry, data as never, state)
      break
    case 'magnetic':
      gap.drawMagnetic(ctx, entry, data as never, state)
      break
    case 'attractor':
      gap.drawAttractor(ctx, entry, data as never, state)
      break
    case 'nebula':
      gap.drawNebula(ctx, entry, data as never, state)
      break
    case 'horizon':
      gap.drawHorizon(ctx, entry, data as never, state)
      break
    case 'circuit':
      gap.drawCircuit(ctx, entry, data as never, state)
      break
    case 'fabric':
      gap.drawFabric(ctx, entry, data as never, state)
      break
    case 'blossom':
      gap.drawBlossom(ctx, entry, data as never, state)
      break
    case 'lightning':
      gap.drawLightning(ctx, entry, data as never, state)
      break
    case 'tunnel':
      gap.drawTunnel(ctx, entry, data as never, state)
      break
    case 'breathe':
      gap.drawBreathe(ctx, entry, data as never, state)
      break
    case 'granular':
      gap.drawGranular(ctx, entry, data as never, state)
      break
    default: {
      const _exhaustive: never = entry.engine
      return _exhaustive
    }
  }
}

export function stepCatalogVisual(state: CatalogVisualState, speed: number, dt: number) {
  state.time += dt * speed
  stepData(state, speed, dt)
}

export function drawCatalogVisual(ctx: CanvasRenderingContext2D, state: CatalogVisualState) {
  drawData(ctx, state)
}

export function resizeCatalogVisual(
  state: CatalogVisualState,
  w: number,
  h: number,
  seed: number,
  density: number,
) {
  const fresh = createCatalogVisual(state.entry.id, seed, density, w, h)
  state.seed = seed
  state.data = fresh.data
  state.entry = fresh.entry
  state.firstFrame = true
  state.width = w
  state.height = h
  state.scale = fresh.scale
  state.time = 0
}
