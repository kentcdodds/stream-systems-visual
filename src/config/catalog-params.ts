import { createVisualParamsReader } from './create-visual-params'

export const readCatalogParams = createVisualParamsReader({
  seed: 42,
  density: 0.55,
  speed: 1,
})
