/**
 * Simulation model (living systems diagram):
 *
 * - Nodes are sparse service-like vertices placed in normalized space.
 * - Edges are undirected links between spatial neighbors (k-nearest).
 * - Pulses are discrete signals traveling edge-wise (0→1), spawned at hubs.
 * - Topology events slowly add/remove edges to keep the graph “alive” but stable.
 * - Camera drift is smooth periodic motion — no random walk jitter.
 * - Contour/grid layers are pure functions of (x,y,time,seed) for the renderer.
 */

import { createRng, type Rng } from './prng'
import type { Camera, Edge, Node, Vec2, World } from './types'

const WORLD_RADIUS = 1.15

function nodeCountFromDensity(density: number) {
  return Math.round(18 + density * 52)
}

function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function placeNodes(rng: Rng, count: number): Node[] {
  const nodes: Node[] = []
  const minSep = 0.11

  for (let id = 0; id < count; id++) {
    let pos: Vec2 | null = null
    for (let attempt = 0; attempt < 80; attempt++) {
      const angle = rng.range(0, Math.PI * 2)
      const radius = Math.sqrt(rng.next()) * WORLD_RADIUS
      const candidate = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.72,
      }
      const ok = nodes.every(n => dist(n.pos, candidate) >= minSep)
      if (ok) {
        pos = candidate
        break
      }
    }
    if (!pos) {
      pos = {
        x: rng.range(-WORLD_RADIUS, WORLD_RADIUS),
        y: rng.range(-WORLD_RADIUS * 0.72, WORLD_RADIUS * 0.72),
      }
    }
    nodes.push({
      id,
      pos,
      load: rng.range(0.2, 0.7),
      tier: rng.int(0, 2) as 0 | 1 | 2,
    })
  }
  return nodes
}

function buildEdges(rng: Rng, nodes: Node[]): Edge[] {
  const edges: Edge[] = []
  const k = 2
  let edgeId = 0

  for (const node of nodes) {
    const neighbors = nodes
      .filter(n => n.id !== node.id)
      .map(n => ({ n, d: dist(node.pos, n.pos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k + rng.int(0, 1))

    for (const { n, d } of neighbors) {
      if (node.id > n.id) continue
      const key = `${Math.min(node.id, n.id)}-${Math.max(node.id, n.id)}`
      if (edges.some(e => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}` === key)) continue
      edges.push({
        id: edgeId++,
        a: node.id,
        b: n.id,
        weight: 0.4 + (1 - Math.min(d / 1.4, 1)) * 0.6,
      })
    }
  }
  return edges
}

function initialCamera(rng: Rng): Camera {
  return {
    x: rng.range(-0.08, 0.08),
    y: rng.range(-0.06, 0.06),
    zoom: rng.range(0.92, 1.05),
  }
}

export function createWorld(seed: number, density: number): World {
  const rng = createRng(seed)
  const nodes = placeNodes(rng, nodeCountFromDensity(density))
  const edges = buildEdges(rng.fork(7), nodes)

  return {
    nodes,
    edges,
    pulses: [],
    camera: initialCamera(rng.fork(11)),
    time: 0,
    nextPulseId: 0,
    nextEdgeId: edges.length,
    topologyCooldown: rng.range(4, 9),
  }
}

function edgeEndpoints(world: World, edge: Edge) {
  const a = world.nodes[edge.a]
  const b = world.nodes[edge.b]
  return { a, b }
}

function spawnPulse(world: World, edge: Edge, rng: Rng) {
  world.pulses.push({
    id: world.nextPulseId++,
    edgeId: edge.id,
    t: 0,
    speed: rng.range(0.18, 0.32),
    strength: rng.range(0.35, 1),
  })
}

function trySpawnPulses(world: World, rng: Rng, dt: number) {
  const rate = 2.4 * dt
  if (rng.next() > rate) return

  const hubs = world.nodes
    .map(n => ({
      n,
      degree: world.edges.filter(e => e.a === n.id || e.b === n.id).length,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, Math.max(3, Math.floor(world.nodes.length * 0.25)))

  const hub = rng.pick(hubs).n
  const incident = world.edges.filter(e => e.a === hub.id || e.b === hub.id)
  if (incident.length === 0) return
  spawnPulse(world, rng.pick(incident), rng)
}

function advancePulses(world: World, dt: number) {
  for (const pulse of world.pulses) {
    const edge = world.edges.find(e => e.id === pulse.edgeId)
    if (!edge) continue
    pulse.t += pulse.speed * dt
  }
  world.pulses = world.pulses.filter(p => p.t <= 1.05)
}

function driftLoads(world: World, rng: Rng, dt: number) {
  for (const node of world.nodes) {
    const target = 0.35 + 0.25 * Math.sin(world.time * 0.4 + node.id * 1.7)
    node.load += (target - node.load) * dt * 0.35
    node.load += (rng.next() - 0.5) * dt * 0.02
    node.load = Math.max(0.08, Math.min(0.95, node.load))
  }
}

function mutateTopology(world: World, rng: Rng) {
  if (world.edges.length < 6) return

  if (rng.next() < 0.55) {
    const removable = world.edges.filter(e => {
      const degA = world.edges.filter(x => x.a === e.a || x.b === e.a).length
      const degB = world.edges.filter(x => x.a === e.b || x.b === e.b).length
      return degA > 2 && degB > 2
    })
    if (removable.length === 0) return
    const edge = rng.pick(removable)
    world.edges = world.edges.filter(e => e.id !== edge.id)
    world.pulses = world.pulses.filter(p => p.edgeId !== edge.id)
    return
  }

  const a = rng.pick(world.nodes)
  const candidates = world.nodes
    .filter(n => n.id !== a.id)
    .map(n => ({ n, d: dist(a.pos, n.pos) }))
    .filter(x => x.d < 1.1)
    .sort((x, y) => x.d - y.d)

  for (const { n } of candidates) {
    const exists = world.edges.some(
      e => (e.a === a.id && e.b === n.id) || (e.a === n.id && e.b === a.id),
    )
    if (exists) continue
    world.edges.push({
      id: world.nextEdgeId++,
      a: a.id,
      b: n.id,
      weight: 0.5 + rng.range(0, 0.4),
    })
    break
  }
}

function updateCamera(world: World, time: number) {
  world.camera.x = Math.sin(time * 0.11) * 0.14 + Math.sin(time * 0.037) * 0.06
  world.camera.y = Math.cos(time * 0.09) * 0.1 + Math.cos(time * 0.041) * 0.05
  world.camera.zoom = 0.98 + Math.sin(time * 0.06) * 0.04
}

export function stepWorld(
  world: World,
  seed: number,
  speed: number,
  dt: number,
) {
  const rng = createRng(seed + Math.floor(world.time * 1000))
  const scaledDt = dt * speed

  world.time += scaledDt
  updateCamera(world, world.time)
  driftLoads(world, rng, scaledDt)
  trySpawnPulses(world, rng.fork(3), scaledDt)
  advancePulses(world, scaledDt)

  world.topologyCooldown -= scaledDt
  if (world.topologyCooldown <= 0) {
    mutateTopology(world, rng.fork(19))
    world.topologyCooldown = rng.range(5, 11)
  }
}

export function getEdgeSegment(world: World, edge: Edge) {
  const { a, b } = edgeEndpoints(world, edge)
  return { from: a.pos, to: b.pos }
}
