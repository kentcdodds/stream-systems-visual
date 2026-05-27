import { createCanvasVisualPage } from '../components/canvas-visual-page'
import { readSnakeParams } from '../config/snake-params'
import { createSnake, drawSnake, resizeSnake, stepSnake } from '../visualizations/snake/snake'

export const SnakeVisualPage = createCanvasVisualPage({
  routeId: 'snake',
  readParams: readSnakeParams,
  datasetVisual: 'snake',
  create: createSnake,
  resize: resizeSnake,
  step: stepSnake,
  draw: drawSnake,
})
