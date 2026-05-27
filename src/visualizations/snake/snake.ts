import { canvasLayoutFields, scaled } from '../../rendering/resolution-scale'
import { createRng } from '../../simulation/prng'
import type { CanvasVisualState } from '../../components/canvas-visual-page'

type Dir = 0 | 1 | 2 | 3

type Segment = { col: number, row: number }

export type SnakeState = CanvasVisualState & {
  seed: number
  cols: number
  rows: number
  cell: number
  originX: number
  originY: number
  snake: Segment[]
  dir: Dir
  food: Segment
  moveTimer: number
  moveInterval: number
  score: number
  time: number
  firstFrame: boolean
}

const BG = { r: 6, g: 8, b: 10 }
const DIRS: { dc: number, dr: number }[] = [
  { dc: 0, dr: -1 },
  { dc: 1, dr: 0 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
]

function wrap(value: number, max: number) {
  return ((value % max) + max) % max
}

function layoutGrid(w: number, h: number, scale: number, density: number) {
  const margin = scaled(32, scale)
  const availW = Math.max(1, w - margin * 2)
  const availH = Math.max(1, h - margin * 2)
  const cell = scaled(16 + (1 - density) * 4, scale)
  const cols = Math.max(18, Math.floor(availW / cell))
  const rows = Math.max(12, Math.floor(availH / cell))
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

function spawnFood(rng: ReturnType<typeof createRng>, cols: number, rows: number, snake: Segment[]): Segment {
  for (let attempt = 0; attempt < 80; attempt++) {
    const col = rng.int(0, cols - 1)
    const row = rng.int(0, rows - 1)
    if (!snake.some(s => s.col === col && s.row === row)) return { col, row }
  }
  return { col: rng.int(0, cols - 1), row: rng.int(0, rows - 1) }
}

function initSnake(rng: ReturnType<typeof createRng>, cols: number, rows: number): Segment[] {
  const col = rng.int(4, cols - 5)
  const row = rng.int(4, rows - 5)
  const len = rng.int(4, 7)
  const horizontal = rng.next() > 0.5
  const snake: Segment[] = []
  for (let i = 0; i < len; i++) {
    snake.push({
      col: wrap(col - (horizontal ? i : 0), cols),
      row: wrap(row - (horizontal ? 0 : i), rows),
    })
  }
  return snake
}

function distWrap(a: Segment, b: Segment, cols: number, rows: number) {
  let dc = b.col - a.col
  let dr = b.row - a.row
  if (Math.abs(dc) > cols / 2) dc -= Math.sign(dc) * cols
  if (Math.abs(dr) > rows / 2) dr -= Math.sign(dr) * rows
  return Math.hypot(dc, dr)
}

function pickDirection(state: SnakeState): Dir {
  const head = state.snake[0]
  const { food, cols, rows, dir } = state
  const body = new Set(state.snake.map(s => `${s.col},${s.row}`))

  const candidates: Dir[] = []
  const scores: number[] = []

  for (let d = 0; d < 4; d++) {
    const { dc, dr } = DIRS[d]
    const nc = wrap(head.col + dc, cols)
    const nr = wrap(head.row + dr, rows)
    const key = `${nc},${nr}`
    const isTail = state.snake.length > 1 && nc === state.snake[state.snake.length - 1].col && nr === state.snake[state.snake.length - 1].row
    if (body.has(key) && !isTail) continue

    const reverse = (d + 2) % 4 === dir
    let score = distWrap({ col: nc, row: nr }, food, cols, rows)
    if (reverse) score += 100
    if (d === dir) score -= 0.05
    candidates.push(d as Dir)
    scores.push(score)
  }

  if (candidates.length === 0) return dir

  let best = candidates[0]
  let bestScore = scores[0]
  for (let i = 1; i < candidates.length; i++) {
    if (scores[i] < bestScore) {
      best = candidates[i]
      bestScore = scores[i]
    }
  }
  return best
}

export function createSnake(seed: number, density: number, w: number, h: number): SnakeState {
  const rng = createRng(seed)
  const layout = canvasLayoutFields(w, h)
  const grid = layoutGrid(w, h, layout.scale, density)
  const snake = initSnake(rng.fork(3), grid.cols, grid.rows)
  return {
    seed,
    ...grid,
    snake,
    dir: rng.int(0, 3) as Dir,
    food: spawnFood(rng.fork(5), grid.cols, grid.rows, snake),
    moveTimer: 0,
    moveInterval: rng.range(0.11, 0.16),
    score: 0,
    time: 0,
    ...layout,
    firstFrame: true,
  }
}

export function stepSnake(state: SnakeState, speed: number, dt: number) {
  state.time += dt * speed
  state.moveTimer -= dt * speed
  if (state.moveTimer > 0) return
  state.moveTimer += state.moveInterval

  state.dir = pickDirection(state)
  const head = state.snake[0]
  const { dc, dr } = DIRS[state.dir]
  const next = {
    col: wrap(head.col + dc, state.cols),
    row: wrap(head.row + dr, state.rows),
  }

  const hitSelf = state.snake.some((s, i) => i > 0 && s.col === next.col && s.row === next.row)
  if (hitSelf) {
    const rng = createRng(state.seed + state.score * 997 + Math.floor(state.time))
    state.snake = initSnake(rng.fork(11), state.cols, state.rows)
    state.dir = rng.int(0, 3) as Dir
    state.food = spawnFood(rng.fork(13), state.cols, state.rows, state.snake)
    return
  }

  state.snake.unshift(next)
  const ate = next.col === state.food.col && next.row === state.food.row
  if (ate) {
    state.score += 1
    const rng = createRng(state.seed + state.score * 503 + 19)
    state.food = spawnFood(rng, state.cols, state.rows, state.snake)
  } else {
    state.snake.pop()
  }
}

function gridPoint(state: SnakeState, col: number, row: number) {
  return {
    x: state.originX + (col + 0.5) * state.cell,
    y: state.originY + (row + 0.5) * state.cell,
  }
}

export function drawSnake(ctx: CanvasRenderingContext2D, state: SnakeState) {
  const { width: w, height: h, cols, rows, cell, scale } = state

  if (state.firstFrame) {
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, w, h)
    state.firstFrame = false
  } else {
    ctx.fillStyle = `rgba(${BG.r},${BG.g},${BG.b},0.18)`
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  ctx.strokeStyle = 'rgba(80, 120, 90, 0.07)'
  ctx.lineWidth = scaled(0.5, scale)
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

  const foodPt = gridPoint(state, state.food.col, state.food.row)
  ctx.fillStyle = 'rgba(255, 90, 110, 0.75)'
  ctx.beginPath()
  ctx.arc(foodPt.x, foodPt.y, scaled(4, scale), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 140, 150, 0.25)'
  ctx.beginPath()
  ctx.arc(foodPt.x, foodPt.y, scaled(8, scale), 0, Math.PI * 2)
  ctx.fill()

  for (let i = state.snake.length - 1; i >= 0; i--) {
    const seg = state.snake[i]
    const pt = gridPoint(state, seg.col, seg.row)
    const t = 1 - i / Math.max(1, state.snake.length)
    const hue = 138 + t * 18
    const r = scaled(i === 0 ? 4.2 : 3.2 - t * 0.4, scale)
    ctx.fillStyle = `hsla(${hue}, 72%, ${52 + t * 16}%, ${0.35 + t * 0.45})`
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function resizeSnake(state: SnakeState, w: number, h: number, seed: number, density: number) {
  const fresh = createSnake(seed, density, w, h)
  Object.assign(state, fresh)
}
