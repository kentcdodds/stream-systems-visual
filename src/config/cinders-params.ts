import { createVisualParamsReader, paramsFromPartial } from './create-visual-params'

export { paramsFromPartial }
export const readCindersParams = createVisualParamsReader({ seed: 29, density: 0.62, speed: 1 })
