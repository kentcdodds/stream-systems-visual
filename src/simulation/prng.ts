/**
 * Deterministic PRNG (Mulberry32). All stochastic choices in the sim
 * must flow through one seeded instance so replays match for a given seed.
 */

export type Rng = {
  next: () => number
  range: (min: number, max: number) => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  fork: (salt: number) => Rng
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function range(min: number, max: number) {
    return min + (max - min) * next()
  }

  function int(min: number, max: number) {
    return Math.floor(range(min, max + 1))
  }

  function pick<T>(items: readonly T[]) {
    return items[int(0, items.length - 1)]
  }

  function fork(salt: number) {
    return createRng((state ^ (salt * 2654435761)) >>> 0)
  }

  return { next, range, int, pick, fork }
}
