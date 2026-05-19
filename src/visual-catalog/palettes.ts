export type Palette = {
  hue: number
  accent: number
  bg: { r: number, g: number, b: number }
}

const PALETTES: Palette[] = [
  { hue: 28, accent: 18, bg: { r: 8, g: 6, b: 5 } },
  { hue: 198, accent: 42, bg: { r: 5, g: 8, b: 12 } },
  { hue: 142, accent: 35, bg: { r: 4, g: 9, b: 7 } },
  { hue: 278, accent: 48, bg: { r: 7, g: 5, b: 11 } },
  { hue: 338, accent: 28, bg: { r: 9, g: 5, b: 8 } },
  { hue: 52, accent: 22, bg: { r: 8, g: 8, b: 4 } },
  { hue: 215, accent: 38, bg: { r: 4, g: 7, b: 13 } },
  { hue: 168, accent: 32, bg: { r: 4, g: 10, b: 9 } },
  { hue: 12, accent: 20, bg: { r: 10, g: 6, b: 5 } },
  { hue: 248, accent: 45, bg: { r: 6, g: 5, b: 12 } },
]

export function paletteAt(index: number): Palette {
  return PALETTES[((index % PALETTES.length) + PALETTES.length) % PALETTES.length]
}
