import { createVisualParamsReader, paramsFromPartial } from './create-visual-params'

export { paramsFromPartial }
export const readSpinnerParams = createVisualParamsReader({ seed: 1, density: 0.5, speed: 1 })
