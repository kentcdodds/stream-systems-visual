import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Dir = 0 | 1 | 2 | 3

type Bike = {
  col: number
  row: number
  dir: Dir
  hue: number
  trail: { col: number, row: number }[]
  moveTimer: number
  moveInterval: number
  alive: boolean
  preferLeft: boolean
}

export type LightBikeState = CanvasVisualState & {
  seed: number
  cols: number
  rows: number
  cell: number
  originX: number
  originY: number
  bikes: Bike[]
  occupied: Set<string>
  time: number
  firstFrame: boolean
}

const BG = { r: 4, g: 8, b: 14 }
const DIRS: { dc: number, dr: number }[] = [
  { dc: 0, dr: -1 },
  { dc: 1, dr: 0 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
]

function cellKey(col: number, row: number) {
  return `${col},${row}`
}

function turnLeft(dir: Dir): Dir {
  return ((dir + 3) % 4) as Dir
}

function turnRight(dir: Dir): Dir {
  return ((dir + 1) % 4) as Dir
}

function layoutGrid(w: number, h: number, scale: number, density: number) {
  const margin = scaled(28, scale)
  const availW = Math.max(1, w - margin * 2)
  const availH = Math.max(1, h - margin * 2)
  const cell = scaled(14 + (1 - density) * 6, scale)
  const cols = Math.max(16, Math.floor(availW / cell))
  const rows = Math.max(10, Math.floor(availH / cell))
  const gridW = cols * cell
  const gridH = rows * cell
  return {
    cols,
    rows,
    cell,
    originX: margin + (availW - gridW) / 2,
    originY: margin + (availH - gridH) / 2,
  }
}

function spawnBike(rng: ReturnType<typeof createRng>, cols: number, rows: number, hue: number): Bike {
  const col = rng.int(2, cols - 3)
  const row = rng.int(2, rows - 3)
  const dir = rng.int(0, 3) as Dir
  return {
    col,
    row,
    dir,
    hue,
    trail: [{ col, row }],
    moveTimer: rng.range(0, 0.4),
    moveInterval: rng.range(0.09, 0.14),
    alive: true,
    preferLeft: rng.next() > 0.5,
  }
}

function rebuildOccupied(bikes: Bike[]) {
  const occupied = new Set<string>()
  for (const bike of bikes) {
    if (!bike.alive) continue
    for (const p of bike.trail) occupied.add(cellKey(p.col, p.row))
  }
  return occupied
}

function inBounds(col: number, row: number, cols: number, rows: number) {
  return col >= 0 && col < cols && row >= 0 && row < rows
}

function pickTurn(
  bike: Bike,
  cols: number,
  rows: number,
  occupied: Set<string>,
): Dir {
  const forward = bike.dir
  const left = turnLeft(forward)
  const right = turnRight(forward)

  const ordered = bike.preferLeft
    ? [forward, left, right, turnLeft(left), turnRight(right)]
    : [forward, right, left, turnRight(right), turnLeft(left)]

  const tail = bike.trail[bike.trail.length - 1]
  for (const dir of ordered) {
    const { dc, dr } = DIRS[dir]
    const nc = bike.col + dc
    const nr = bike.row + dr
    if (!inBounds(nc, nr, cols, rows)) continue
    const key = cellKey(nc, nr)
    if (occupied.has(key) && !(tail && nc === tail.col && nr === tail.row)) continue
    return dir
  }
  return forward
}

export function createLightBike(seed: number, density: number, w: number, h: number): LightBikeState {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(w, h)
  const grid = layoutGrid(w, h, layout.scale, density)
  const bikeCount = Math.round(2 + density * 2)
  const hues = [186, 312, 28, 156]
  const bikes: Bike[] = []
  for (let i = 0; i < bikeCount; i++) {
    bikes.push(spawnBike(rng.fork(i * 41 + 7), grid.cols, grid.rows, hues[i % hues.length]))
  }
  return {
    seed,
    ...grid,
    bikes,
    occupied: rebuildOccupied(bikes),
    time: 0,
    ...layout,
    firstFrame: true,
  }
}

function respawnBike(bike: Bike, rng: ReturnType<typeof createRng>, cols: number, rows: number) {
  const fresh = spawnBike(rng, cols, rows, bike.hue)
  bike.col = fresh.col
  bike.row = fresh.row
  bike.dir = fresh.dir
  bike.trail = fresh.trail
  bike.moveTimer = fresh.moveTimer
  bike.moveInterval = fresh.moveInterval
  bike.alive = true
  bike.preferLeft = fresh.preferLeft
}

export function stepLightBike(state: LightBikeState, speed: number, dt: number) {
  state.time += dt * speed
  const { cols, rows, bikes } = state
  let respawnNonce = 0

  for (const bike of bikes) {
    if (!bike.alive) continue
    bike.moveTimer -= dt * speed
    if (bike.moveTimer > 0) continue
    bike.moveTimer += bike.moveInterval

    const nextDir = pickTurn(bike, cols, rows, state.occupied)
    bike.dir = nextDir
    const { dc, dr } = DIRS[bike.dir]
    const nc = bike.col + dc
    const nr = bike.row + dr

    if (!inBounds(nc, nr, cols, rows) || state.occupied.has(cellKey(nc, nr))) {
      bike.alive = false
      respawnNonce += 1
      continue
    }

    bike.col = nc
    bike.row = nr
    bike.trail.unshift({ col: nc, row: nr })
    const maxTrail = Math.max(cols, rows) * 3
    if (bike.trail.length > maxTrail) bike.trail.pop()
  }

  for (const bike of bikes) {
    if (bike.alive) continue
    const rng = createRng(state.seed + Math.floor(state.time * 10) * 997 + respawnNonce * 131)
    respawnBike(bike, rng, cols, rows)
    respawnNonce += 1
  }

  state.occupied = rebuildOccupied(bikes)
}

function gridPoint(state: LightBikeState, col: number, row: number) {
  return {
    x: state.originX + (col + 0.5) * state.cell,
    y: state.originY + (row + 0.5) * state.cell,
  }
}

export function drawLightBike(ctx: CanvasRenderingContext2D, state: LightBikeState) {
  const { width: w, height: h, cols, rows, cell, scale } = state

  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.14)`
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  ctx.strokeStyle = 'rgba(0, 180, 220, 0.08)'
  ctx.lineWidth = scaled(0.6, scale)
  for (let col = 0; col <= cols; col++) {
    const x = state.originX + col * cell
    ctx.beginPath()
    ctx.moveTo(x, state.originY)
    ctx.lineTo(x, state.originY + rows * cell)
    ctx.stroke()
  }
  for (let row = 0; row <= rows; row++) {
    const y = state.originY + row * cell
    ctx.beginPath()
    ctx.moveTo(state.originX, y)
    ctx.lineTo(state.originX + cols * cell, y)
    ctx.stroke()
  }

  for (const bike of state.bikes) {
    if (!bike.alive || bike.trail.length < 2) continue
    ctx.lineWidth = scaled(2.2, scale)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let i = 0; i < bike.trail.length - 1; i++) {
      const a = bike.trail[i]
      const b = bike.trail[i + 1]
      const p0 = gridPoint(state, a.col, a.row)
      const p1 = gridPoint(state, b.col, b.row)
      const along = 1 - i / bike.trail.length
      ctx.strokeStyle = `hsla(${bike.hue}, 95%, 62%, ${0.15 + along * 0.55})`
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
    }

    const head = gridPoint(state, bike.col, bike.row)
    ctx.fillStyle = `hsla(${bike.hue}, 100%, 78%, 0.9)`
    ctx.beginPath()
    ctx.arc(head.x, head.y, scaled(3.5, scale), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `hsla(${bike.hue}, 100%, 88%, 0.35)`
    ctx.beginPath()
    ctx.arc(head.x, head.y, scaled(7, scale), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function resizeLightBike(state: LightBikeState, w: number, h: number, seed: number, density: number) {
  const fresh = createLightBike(seed, density, w, h)
  Object.assign(state, fresh)
}
