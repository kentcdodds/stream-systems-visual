import { createCanvasVisualPage } from '../components/canvas-visual-page'
import { readHarmonicStringsParams } from '../config/harmonic-strings-params'
import {
  createHarmonicStrings,
  drawHarmonicStrings,
  resizeHarmonicStrings,
  stepHarmonicStrings,
} from '../visualizations/harmonic-strings/harmonic-strings'

export const HarmonicStringsVisualPage = createCanvasVisualPage({
  routeId: 'harmonic-strings',
  readParams: readHarmonicStringsParams,
  datasetVisual: 'harmonic-strings',
  create: createHarmonicStrings,
  resize: resizeHarmonicStrings,
  step: stepHarmonicStrings,
  draw: drawHarmonicStrings,
})
