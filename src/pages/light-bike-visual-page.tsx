import { createCanvasVisualPage } from '../components/canvas-visual-page'
import { readLightBikeParams } from '../config/light-bike-params'
import {
  createLightBike,
  drawLightBike,
  resizeLightBike,
  stepLightBike,
} from '../visualizations/light-bike/light-bike'

export const LightBikeVisualPage = createCanvasVisualPage({
  routeId: 'light-bike',
  readParams: readLightBikeParams,
  datasetVisual: 'light-bike',
  create: createLightBike,
  resize: resizeLightBike,
  step: stepLightBike,
  draw: drawLightBike,
})
