/**
 * Captures canvas screenshots for every visual route.
 * Requires a production build (`npm run build`) — uses `vite preview`.
 *
 * Usage: npm run capture-thumbnails
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from 'playwright'
import { visualizationRouteConfigs } from '../src/routes/route-config.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'public', 'thumbnails')
const port = 4173
const baseUrl = `http://127.0.0.1:${port}`

const previewParams = new URLSearchParams({
  seed: '42',
  density: '0.55',
  speed: '1',
})

const viewport = { width: 640, height: 360 }
/** Minimum time after canvas is visible before sampling content. */
const warmupMs = 4500
/** Poll interval while waiting for non-empty canvas pixels. */
const pollMs = 250
/** Max extra wait after warmup for slow-start visuals. */
const contentWaitMs = 6000
/** Mean RGB brightness below this is treated as an empty/near-black frame. */
const emptyBrightnessThreshold = 8
/** Extra settle time per route (ms) on top of shared warmup. */
const extraWarmupMs: Record<string, number> = {
  'flow-ribbons': 8000,
  'storm-flash': 5000,
  'still-pool': 2500,
  'strange-loop': 3500,
  'sand-flow': 3500,
  'root-growth': 2000,
  'slow-breath': 2000,
  'morph-field': 4000,
}

function waitForServerReady(proc: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server did not start in time')), 60_000)
    const onData = (chunk: Buffer) => {
      const text = chunk.toString()
      if (text.includes('localhost') || text.includes('127.0.0.1')) {
        clearTimeout(timeout)
        proc.stdout?.off('data', onData)
        proc.stderr?.off('data', onData)
        resolve()
      }
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.on('error', err => {
      clearTimeout(timeout)
      reject(err)
    })
    proc.on('exit', code => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout)
        reject(new Error(`Preview server exited with code ${code}`))
      }
    })
  })
}

function startPreview(): ChildProcess {
  return spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })
}

function filterRoutes() {
  const only = process.argv.slice(2)
  if (only.length === 0) return visualizationRouteConfigs
  const set = new Set(only)
  return visualizationRouteConfigs.filter(r => set.has(r.id))
}

async function canvasMeanBrightness(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return 0
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    const w = canvas.width
    const h = canvas.height
    if (w === 0 || h === 0) return 0
    const sampleStep = Math.max(4, Math.floor(Math.min(w, h) / 48))
    const data = ctx.getImageData(0, 0, w, h).data
    let sum = 0
    let count = 0
    for (let y = 0; y < h; y += sampleStep) {
      for (let x = 0; x < w; x += sampleStep) {
        const i = (y * w + x) * 4
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3
        count++
      }
    }
    return count > 0 ? sum / count : 0
  })
}

async function waitForCanvasContent(page: Page, routeId: string): Promise<number> {
  const extra = extraWarmupMs[routeId] ?? 0
  await page.waitForTimeout(warmupMs + extra)
  const deadline = Date.now() + contentWaitMs
  let brightness = await canvasMeanBrightness(page)
  while (brightness < emptyBrightnessThreshold && Date.now() < deadline) {
    await page.waitForTimeout(pollMs)
    brightness = await canvasMeanBrightness(page)
  }
  if (brightness < emptyBrightnessThreshold) {
    await page.waitForTimeout(4000)
    brightness = await canvasMeanBrightness(page)
  }
  return brightness
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const preview = startPreview()
  try {
    await waitForServerReady(preview)
    await new Promise(r => setTimeout(r, 400))

    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport })

    let ok = 0
    let fail = 0

    const routes = filterRoutes()

    for (const route of routes) {
      const url = `${baseUrl}${route.path}?${previewParams}`
      const outPath = path.join(outDir, `${route.id}.jpg`)
      process.stdout.write(`  ${route.id} … `)

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
        const canvas = page.locator('canvas').first()
        await canvas.waitFor({ state: 'visible', timeout: 30_000 })
        const brightness = await waitForCanvasContent(page, route.id)
        await canvas.screenshot({ path: outPath, type: 'jpeg', quality: 85 })
        ok++
        process.stdout.write(`ok (${brightness.toFixed(1)})\n`)
      } catch (err) {
        fail++
        process.stdout.write(`failed (${err instanceof Error ? err.message : err})\n`)
      }
    }

    await browser.close()
    console.log(`\nDone: ${ok} captured, ${fail} failed → ${outDir}`)
    if (fail > 0) process.exitCode = 1
  } finally {
    preview.kill('SIGTERM')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
