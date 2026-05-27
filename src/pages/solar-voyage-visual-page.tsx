import { createCanvasVisualPage } from '../components/canvas-visual-page'
import { readSolarVoyageParams } from '../config/solar-voyage-params'
import {
  createSolarVoyage,
  drawSolarVoyage,
  resizeSolarVoyage,
  stepSolarVoyage,
} from '../visualizations/solar-voyage/solar-voyage'

export const SolarVoyageVisualPage = createCanvasVisualPage({
  routeId: 'solar-voyage',
  readParams: readSolarVoyageParams,
  datasetVisual: 'solar-voyage',
  create: createSolarVoyage,
  resize: resizeSolarVoyage,
  step: stepSolarVoyage,
  draw: drawSolarVoyage,
})
