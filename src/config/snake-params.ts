import { createVisualParamsReader, paramsFromPartial } from './create-visual-params'

export { paramsFromPartial }
export const readSnakeParams = createVisualParamsReader({ seed: 7, density: 0.5, speed: 1 })
