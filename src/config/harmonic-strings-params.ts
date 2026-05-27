import { createVisualParamsReader, paramsFromPartial } from './create-visual-params'

export { paramsFromPartial }
export const readHarmonicStringsParams = createVisualParamsReader({ seed: 19, density: 0.6, speed: 1 })
