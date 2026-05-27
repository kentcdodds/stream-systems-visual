import { createVisualParamsReader, paramsFromPartial } from './create-visual-params'

export { paramsFromPartial }
export const readLightBikeParams = createVisualParamsReader({ seed: 42, density: 0.55, speed: 1 })
