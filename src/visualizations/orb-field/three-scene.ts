/**
 * Three.js orb-field: PerspectiveCamera rig + instanced emissive spheres (per hue).
 * Simulation state stays in orbs.ts; this module maps it into world space each frame.
 *
 * World: camera near origin, orbs along −Z (ahead). They pass the camera on +Z
 * and recycle to the far plane — real perspective parallax from Three.js.
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createRng } from '../../simulation/prng'
import { orbColors, orbThreeColors } from './orb-colors'
import {
  createOrbField,
  orbVisibility,
  stepOrbField,
  type OrbField,
} from './orbs'

const DEPTH_SCALE = 11
const LATERAL_SCALE = 5.2
const ORB_RADIUS_SCALE = 2.8

export type OrbFieldScene = {
  update: (seed: number, speed: number, dt: number) => void
  resize: () => void
  render: () => void
  dispose: () => void
}

function buildStarfield(seed: number, count: number) {
  const rng = createRng(seed ^ 0x9e3779b9)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    positions[i3] = (rng.next() - 0.5) * 400
    positions[i3 + 1] = (rng.next() - 0.5) * 400
    positions[i3 + 2] = -rng.range(20, 180)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0x5a6470,
    size: 0.28,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  })
  return new THREE.Points(geo, mat)
}

function simZToWorldZ(simZ: number) {
  return -simZ * DEPTH_SCALE
}

export function createOrbFieldScene(
  container: HTMLElement,
  seed: number,
  density: number,
): OrbFieldScene {
  const field: OrbField = createOrbField(seed, density)
  const dummy = new THREE.Object3D()
  const lookTarget = new THREE.Vector3(0, 0, -40)
  const slotCursor = new Array(orbColors.length).fill(0)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070a)
  scene.fog = new THREE.FogExp2(0x040608, 0.017)

  const camera = new THREE.PerspectiveCamera(
    58,
    container.clientWidth / container.clientHeight,
    0.1,
    400,
  )
  camera.position.set(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.72
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0x080a0e, 0.42))
  const key = new THREE.DirectionalLight(0x4a5560, 0.32)
  key.position.set(-8, 6, 10)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x283038, 0.18)
  rim.position.set(4, -2, -6)
  scene.add(rim)

  const stars = buildStarfield(seed, 900)
  scene.add(stars)

  const sharedGeo = new THREE.SphereGeometry(1, 22, 22)
  const orbMeshes: THREE.InstancedMesh[] = []

  function buildOrbMeshes() {
    for (const mesh of orbMeshes) {
      scene.remove(mesh)
      mesh.dispose()
    }
    orbMeshes.length = 0

    const counts = new Array(orbColors.length).fill(0)
    for (const orb of field.orbs) counts[orb.colorIndex]++

    for (let ci = 0; ci < orbColors.length; ci++) {
      if (counts[ci] === 0) continue
      const { emissive, base } = orbThreeColors(ci)
      const material = new THREE.MeshStandardMaterial({
        color: base,
        emissive,
        emissiveIntensity: 0.62,
        roughness: 0.52,
        metalness: 0.28,
        transparent: true,
      })
      const mesh = new THREE.InstancedMesh(sharedGeo, material, counts[ci])
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.userData.colorIndex = ci
      scene.add(mesh)
      orbMeshes.push(mesh)
    }
  }

  buildOrbMeshes()

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.22,
    0.45,
    0.22,
  )
  composer.addPass(bloom)

  function meshForColor(colorIndex: number) {
    return orbMeshes.find(m => m.userData.colorIndex === colorIndex)
  }

  function syncInstances() {
    slotCursor.fill(0)

    for (let i = 0; i < field.orbs.length; i++) {
      const orb = field.orbs[i]
      const mesh = meshForColor(orb.colorIndex)
      if (!mesh) continue

      const slot = slotCursor[orb.colorIndex]++
      const vis = orbVisibility(orb.z)
      const wx = orb.x * LATERAL_SCALE
      const wy = orb.y * LATERAL_SCALE
      const wz = simZToWorldZ(orb.z)
      const scale = ORB_RADIUS_SCALE * orb.baseRadius * DEPTH_SCALE * (0.15 + vis * 0.85)

      dummy.position.set(wx, wy, wz)
      dummy.scale.setScalar(Math.max(scale, 0.001))
      dummy.updateMatrix()
      mesh.setMatrixAt(slot, dummy.matrix)
    }

    for (const mesh of orbMeshes) {
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  function updateCameraRig() {
    const { panX, panY, roll, lookX, lookY } = field.camera
    camera.position.set(panX * LATERAL_SCALE, panY * LATERAL_SCALE, 0)
    lookTarget.set(lookX * LATERAL_SCALE, lookY * LATERAL_SCALE, -45)
    camera.lookAt(lookTarget)
    camera.rotation.z = roll
    stars.position.set(panX * 0.6, panY * 0.6, field.time * 2.5)
  }

  function update(seed: number, speed: number, dt: number) {
    stepOrbField(field, seed, speed, dt)
    updateCameraRig()
    syncInstances()
  }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
    bloom.resolution.set(w, h)
  }

  function render() {
    composer.render()
  }

  function dispose() {
    renderer.dispose()
    composer.dispose()
    stars.geometry.dispose()
    ;(stars.material as THREE.Material).dispose()
    sharedGeo.dispose()
    for (const mesh of orbMeshes) {
      ;(mesh.material as THREE.Material).dispose()
    }
    container.removeChild(renderer.domElement)
  }

  syncInstances()

  return { update, resize, render, dispose }
}
