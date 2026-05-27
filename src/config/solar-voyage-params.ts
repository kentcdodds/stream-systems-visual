import { createVisualParamsReader, paramsFromPartial } from './create-visual-params'

export { paramsFromPartial }
export const readSolarVoyageParams = createVisualParamsReader({ seed: 88, density: 0.55, speed: 1 })
