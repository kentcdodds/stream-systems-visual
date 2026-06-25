import { createCanvasVisualPage } from '../components/canvas-visual-page'
import { readCindersParams } from '../config/cinders-params'
import { createCinders, drawCinders, resizeCinders, stepCinders } from '../visualizations/cinders/cinders'

export const CindersVisualPage = createCanvasVisualPage({
  routeId: 'cinders',
  readParams: readCindersParams,
  datasetVisual: 'cinders',
  create: createCinders,
  resize: resizeCinders,
  step: stepCinders,
  draw: drawCinders,
})
