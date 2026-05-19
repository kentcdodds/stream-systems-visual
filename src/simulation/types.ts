export type Vec2 = { x: number, y: number }

export type Node = {
  id: number
  pos: Vec2
  /** Operational load 0–1, drifts slowly */
  load: number
  /** Visual tier for status ring */
  tier: 0 | 1 | 2
}

export type Edge = {
  id: number
  a: number
  b: number
  weight: number
}

export type Pulse = {
  id: number
  edgeId: number
  t: number
  speed: number
  strength: number
}

export type Camera = {
  x: number
  y: number
  zoom: number
}

export type World = {
  nodes: Node[]
  edges: Edge[]
  pulses: Pulse[]
  camera: Camera
  time: number
  nextPulseId: number
  nextEdgeId: number
  topologyCooldown: number
}
