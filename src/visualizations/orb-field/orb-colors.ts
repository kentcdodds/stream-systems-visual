/** Cosmic debris — low saturation, no candy / Easter hues */

import * as THREE from 'three'

export type OrbColor = {
  highlight: string
  mid: string
  shadow: string
  glow: string
}

/** Four restrained families; spawn picks among these only */
export const orbColors: OrbColor[] = [
  {
    highlight: 'rgba(95, 88, 82, 0.9)',
    mid: 'rgba(62, 58, 54, 0.88)',
    shadow: 'rgba(12, 11, 10, 0.98)',
    glow: 'rgba(70, 65, 60, 0.12)',
  },
  {
    highlight: 'rgba(75, 88, 98, 0.88)',
    mid: 'rgba(42, 52, 62, 0.9)',
    shadow: 'rgba(8, 12, 18, 0.98)',
    glow: 'rgba(50, 65, 80, 0.11)',
  },
  {
    highlight: 'rgba(88, 58, 48, 0.88)',
    mid: 'rgba(58, 32, 26, 0.9)',
    shadow: 'rgba(14, 8, 6, 0.98)',
    glow: 'rgba(80, 45, 35, 0.1)',
  },
  {
    highlight: 'rgba(58, 68, 78, 0.85)',
    mid: 'rgba(32, 40, 50, 0.88)',
    shadow: 'rgba(6, 10, 16, 0.98)',
    glow: 'rgba(40, 55, 70, 0.1)',
  },
]

function parseRgb(css: string) {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return new THREE.Color(0x888888)
  return new THREE.Color(
    Number(m[1]) / 255,
    Number(m[2]) / 255,
    Number(m[3]) / 255,
  )
}

const parsed = orbColors.map(c => ({
  emissive: parseRgb(c.mid),
  base: parseRgb(c.shadow),
}))

export function orbThreeColors(index: number) {
  return parsed[index % parsed.length]
}

/** Favor neutral tones so the field reads cohesive, not confetti */
export function pickOrbColorIndex(rng: { int: (min: number, max: number) => number, next: () => number }) {
  const roll = rng.next()
  if (roll < 0.38) return 0
  if (roll < 0.68) return 1
  if (roll < 0.86) return 3
  return 2
}
