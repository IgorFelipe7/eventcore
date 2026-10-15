import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  CONTESTED,
  type Point3,
  ROWS,
  SEATS_PER_ROW,
  cameraRig,
  contestedSeat,
  easeInOut,
  lerp,
  queueLane,
  queueSlot,
  seatPlacements,
  segment,
} from './hall-layout'

export interface ScreenAnchor {
  readonly x: number
  readonly y: number
  readonly visible: boolean
}

export interface HallFrame {
  readonly seat: ScreenAnchor
  readonly a: ScreenAnchor
  readonly b: ScreenAnchor
  readonly queue: ScreenAnchor
}

const COLORS = {
  night: 0x07090c,
  seat: 0x2a3340,
  riser: 0x0f141b,
  grid: 0x1f2632,
  gridMajor: 0x2b3442,
  signal: 0x6b7bff,
  waitlisted: 0xf2b84b,
  confirmed: 0x3dd68c,
  rim: 0x9aa6b8,
} as const

const TRAIL_POINTS = 36
const DUST_POINTS = 140

const toVector = (point: Point3) => new THREE.Vector3(point.x, point.y, point.z)

const seatGeometry = () => {
  const cushion = new RoundedBoxGeometry(0.82, 0.2, 0.72, 3, 0.07)
  cushion.translate(0, 0.32, 0)
  const back = new RoundedBoxGeometry(0.82, 0.66, 0.14, 3, 0.06)
  back.translate(0, 0.62, 0.33)
  const leg = new THREE.BoxGeometry(0.1, 0.24, 0.1)
  leg.translate(0, 0.11, 0)
  const merged = mergeGeometries(
    [cushion, back, leg].map((part) => (part.index ? part.toNonIndexed() : part)),
  )
  if (!merged) throw new Error('Seat geometry could not be merged.')
  return merged
}

class Beam {
  readonly head: THREE.Mesh
  readonly light: THREE.PointLight
  readonly trail: THREE.Points
  private readonly history: THREE.Vector3[] = []

  constructor(
    scene: THREE.Scene,
    private readonly color: THREE.Color,
  ) {
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 16),
      new THREE.MeshBasicMaterial({ color }),
    )
    this.light = new THREE.PointLight(color, 4, 3.2, 1.6)
    this.head.add(this.light)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3),
    )
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 4), 4))
    this.trail = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.11,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    scene.add(this.head, this.trail)
  }

  place(position: THREE.Vector3, visible: boolean, tint: THREE.Color) {
    this.head.visible = visible
    this.trail.visible = visible
    this.head.position.copy(position)
    ;(this.head.material as THREE.MeshBasicMaterial).color.copy(tint)
    this.light.color.copy(tint)
    const last = this.history.at(-1)
    if (!last || last.distanceToSquared(position) > 0.0004) this.history.push(position.clone())
    while (this.history.length > TRAIL_POINTS) this.history.shift()
    const positions = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = this.trail.geometry.getAttribute('color') as THREE.BufferAttribute
    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      const point = this.history[this.history.length - 1 - index] ?? position
      positions.setXYZ(index, point.x, point.y, point.z)
      colors.setXYZW(index, tint.r, tint.g, tint.b, Math.max(0, 1 - index / TRAIL_POINTS) * 0.85)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  reset() {
    this.history.length = 0
  }

  dispose() {
    this.head.geometry.dispose()
    ;(this.head.material as THREE.Material).dispose()
    this.trail.geometry.dispose()
    ;(this.trail.material as THREE.Material).dispose()
  }

  get baseColor() {
    return this.color
  }
}

export class HallScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220)
  private lastTime = 0
  private elapsed = 0
  private readonly seat = contestedSeat()
  private readonly seatTop: THREE.Vector3
  private readonly contestedMaterial: THREE.MeshStandardMaterial
  private readonly spot: THREE.SpotLight
  private readonly lock: THREE.Mesh
  private readonly lane: THREE.Line
  private readonly dust: THREE.Points
  private readonly pathA: THREE.CatmullRomCurve3
  private readonly pathB: THREE.CatmullRomCurve3
  private readonly queuePath: THREE.CatmullRomCurve3
  private readonly beamA: Beam
  private readonly beamB: Beam
  private readonly disposables: { dispose(): void }[] = []
  private readonly pointer = new THREE.Vector2()
  private readonly cameraOffset = new THREE.Vector2()
  private targetProgress = 0
  private progress = 0
  private width = 1
  private height = 1
  private frame: number | null = null
  private running = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onFrame: (frame: HallFrame) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(COLORS.night, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.62)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.scene.background = new THREE.Color(COLORS.night)
    this.scene.fog = new THREE.Fog(COLORS.night, 9, 24)
    this.seatTop = toVector(this.seat).add(new THREE.Vector3(0, 0.78, 0))

    this.scene.add(new THREE.HemisphereLight(0x9aa6b8, 0x07090c, 0.9))
    const rim = new THREE.DirectionalLight(COLORS.rim, 2.2)
    rim.position.set(-2, 7, 16)
    const key = new THREE.DirectionalLight(0x6b7bff, 0.8)
    key.position.set(4, 9, -8)
    this.scene.add(rim, key)

    this.spot = new THREE.SpotLight(COLORS.signal, 60, 14, 0.32, 0.85, 1.4)
    this.spot.position.set(this.seat.x - 0.6, 6.4, this.seat.z - 1.6)
    this.spot.target.position.copy(toVector(this.seat))
    this.scene.add(this.spot, this.spot.target)

    this.buildFloor()
    this.contestedMaterial = this.buildSeats()

    this.lock = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.022, 12, 96),
      new THREE.MeshBasicMaterial({ color: COLORS.signal, transparent: true, opacity: 0 }),
    )
    this.lock.rotation.x = Math.PI / 2
    this.lock.position.copy(this.seatTop).add(new THREE.Vector3(0, -0.2, 0))
    this.scene.add(this.lock)
    this.disposables.push(this.lock.geometry, this.lock.material as THREE.Material)

    const s = this.seat
    this.pathA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, 0.7, s.z - 2.6),
      new THREE.Vector3(-5.6, 0.9, s.z - 1.8),
      new THREE.Vector3(s.x - 1.6, 1.25, s.z - 0.8),
      this.seatTop.clone(),
    ])
    this.pathB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8.5, 0.8, s.z + 6),
      new THREE.Vector3(-4.2, 1.1, s.z + 2.6),
      new THREE.Vector3(s.x - 0.8, 1.4, s.z + 0.9),
      this.seatTop.clone(),
    ])
    const waiting = this.pathB.getPointAt(0.8)
    this.queuePath = new THREE.CatmullRomCurve3([
      waiting.clone(),
      this.seatTop.clone().add(new THREE.Vector3(-1.1, 0.1, -0.6)),
      new THREE.Vector3(s.x - 2.2, 0.7, s.z - 2.0),
      toVector(queueSlot()),
    ])

    const laneGeometry = new THREE.BufferGeometry().setFromPoints(queueLane().map(toVector))
    this.lane = new THREE.Line(
      laneGeometry,
      new THREE.LineDashedMaterial({
        color: COLORS.waitlisted,
        dashSize: 0.18,
        gapSize: 0.12,
        transparent: true,
        opacity: 0,
      }),
    )
    this.lane.computeLineDistances()
    this.scene.add(this.lane)
    this.disposables.push(laneGeometry, this.lane.material as THREE.Material)

    this.beamA = new Beam(this.scene, new THREE.Color(COLORS.signal))
    this.beamB = new Beam(this.scene, new THREE.Color(0xd8dde6))

    this.dust = this.buildDust()
  }

  private buildFloor() {
    const grid = new THREE.GridHelper(60, 60, COLORS.gridMajor, COLORS.grid)
    const gridMaterial = grid.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.55
    grid.position.y = 0.001
    this.scene.add(grid)
    this.disposables.push(grid.geometry, gridMaterial)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ color: COLORS.night }),
    )
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)
    this.disposables.push(floor.geometry, floor.material as THREE.Material)

    const riserMaterial = new THREE.MeshStandardMaterial({ color: COLORS.riser, roughness: 0.9 })
    this.disposables.push(riserMaterial)
    for (let row = 0; row < ROWS; row += 1) {
      const first = seatPlacements()[row * SEATS_PER_ROW]
      if (!first) continue
      const radius = Math.hypot(first.x, first.z + 2.6)
      const padding = 0.2
      const arc = 0.62 + padding
      const geometry = new THREE.RingGeometry(
        radius - 0.62,
        radius + 0.62,
        64,
        1,
        -arc - Math.PI / 2,
        arc * 2,
      )
      const band = new THREE.Mesh(geometry, riserMaterial)
      band.rotation.x = -Math.PI / 2
      band.position.set(0, first.y + 0.004, -2.6)
      this.scene.add(band)
      this.disposables.push(geometry)
    }

    const stageEdge = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.02, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x3a4352 }),
    )
    stageEdge.position.set(0, 0.02, 2.4)
    this.scene.add(stageEdge)
    this.disposables.push(stageEdge.geometry, stageEdge.material as THREE.Material)
  }

  private buildSeats() {
    const geometry = seatGeometry()
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.seat,
      roughness: 0.55,
      metalness: 0.15,
    })
    const placements = seatPlacements()
    const others = placements.filter(
      (placement) => !(placement.row === CONTESTED.row && placement.column === CONTESTED.column),
    )
    const instanced = new THREE.InstancedMesh(geometry, material, others.length)
    const matrix = new THREE.Matrix4()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)
    others.forEach((placement, index) => {
      rotation.setFromEuler(new THREE.Euler(0, placement.yaw, 0))
      matrix.compose(toVector(placement), rotation, scale)
      instanced.setMatrixAt(index, matrix)
    })
    this.scene.add(instanced)

    const contestedMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.seat,
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color(COLORS.signal),
      emissiveIntensity: 1.4,
    })
    const contested = new THREE.Mesh(geometry, contestedMaterial)
    contested.position.copy(toVector(this.seat))
    contested.rotation.y = this.seat.yaw
    this.scene.add(contested)
    this.disposables.push(geometry, material, contestedMaterial)
    return contestedMaterial
  }

  private buildDust() {
    const positions = new Float32Array(DUST_POINTS * 3)
    for (let index = 0; index < DUST_POINTS; index += 1) {
      positions[index * 3] = this.seat.x + (Math.random() - 0.5) * 3.2
      positions[index * 3 + 1] = Math.random() * 5.5
      positions[index * 3 + 2] = this.seat.z - 1 + (Math.random() - 0.5) * 3.2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const dust = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xaab4ff,
        size: 0.025,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.scene.add(dust)
    this.disposables.push(geometry, dust.material as THREE.Material)
    return dust
  }

  setProgress(value: number) {
    this.targetProgress = Math.min(1, Math.max(0, value))
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.renderer.setSize(this.width, this.height, false)
    this.composer.setSize(this.width, this.height)
    this.bloom.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.fov = cameraRig(this.camera.aspect).fov
    this.camera.updateProjectionMatrix()
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const delta = Math.min(0.1, (now - this.lastTime) / 1000)
      this.lastTime = now
      this.elapsed += delta
      this.render(delta)
      this.frame = requestAnimationFrame(loop)
    }
    this.frame = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this.frame !== null) cancelAnimationFrame(this.frame)
  }

  renderOnce(progress: number) {
    this.targetProgress = progress
    this.progress = progress
    this.render(0)
  }

  private anchor(point: THREE.Vector3, visible: boolean): ScreenAnchor {
    const projected = point.clone().project(this.camera)
    return {
      x: ((projected.x + 1) / 2) * this.width,
      y: ((1 - projected.y) / 2) * this.height,
      visible: visible && projected.z < 1,
    }
  }

  private render(delta: number) {
    const smoothing = delta === 0 ? 1 : 1 - Math.exp(-delta * 5.5)
    if (Math.abs(this.targetProgress - this.progress) < 0.0005) this.progress = this.targetProgress
    else this.progress = lerp(this.progress, this.targetProgress, smoothing)
    const p = this.progress

    const rig = cameraRig(this.camera.aspect)
    this.cameraOffset.lerp(this.pointer, delta === 0 ? 1 : 1 - Math.exp(-delta * 2.5))
    this.camera.position.set(
      rig.position.x + this.cameraOffset.x * 0.45,
      rig.position.y + this.cameraOffset.y * 0.25,
      rig.position.z,
    )
    this.camera.lookAt(rig.target.x, rig.target.y, rig.target.z)

    const signal = new THREE.Color(COLORS.signal)
    const waitlisted = new THREE.Color(COLORS.waitlisted)
    const confirmed = new THREE.Color(COLORS.confirmed)

    const travelA = easeInOut(segment(p, 0.04, 0.3))
    const settleA = easeInOut(segment(p, 0.42, 0.52))
    const positionA = this.pathA.getPointAt(travelA).add(new THREE.Vector3(0, -0.45 * settleA, 0))
    if (p < 0.04) this.beamA.reset()
    this.beamA.place(positionA, p >= 0.02 && settleA < 1, signal)

    const travelB = easeInOut(segment(p, 0.06, 0.32)) * 0.8
    const queueB = easeInOut(segment(p, 0.72, 0.86))
    const waitingB = p >= 0.32 && p < 0.68
    const positionB =
      queueB > 0 ? this.queuePath.getPointAt(queueB) : this.pathB.getPointAt(travelB)
    if (p < 0.06) this.beamB.reset()
    this.beamB.place(
      positionB,
      p >= 0.04,
      waitingB || queueB > 0 ? waitlisted : this.beamB.baseColor,
    )

    const lockA = easeInOut(segment(p, 0.28, 0.36)) * (1 - easeInOut(segment(p, 0.58, 0.64)))
    const lockB = easeInOut(segment(p, 0.66, 0.72)) * (1 - easeInOut(segment(p, 0.8, 0.86)))
    const lockAmount = Math.max(lockA, lockB)
    const lockMaterial = this.lock.material as THREE.MeshBasicMaterial
    lockMaterial.opacity = lockAmount
    lockMaterial.color.copy(signal)
    this.lock.scale.setScalar(lerp(2.2, 1, lockAmount))
    this.lock.rotation.z += delta * 0.6

    const fill = easeInOut(segment(p, 0.44, 0.56))
    this.contestedMaterial.emissive.copy(signal).lerp(confirmed, fill)
    this.contestedMaterial.emissiveIntensity = lerp(
      1.4 + Math.sin(this.elapsed * 2.2) * 0.12,
      0.32,
      fill,
    )
    this.spot.color.copy(signal).lerp(confirmed, fill)
    this.spot.intensity = lerp(60, 26, fill)

    const laneMaterial = this.lane.material as THREE.LineDashedMaterial
    laneMaterial.opacity = easeInOut(segment(p, 0.66, 0.76)) * 0.9

    this.dust.rotation.y += delta * 0.03
    const dustPositions = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < DUST_POINTS; index += 1) {
      const y = dustPositions.getY(index) + delta * 0.08
      dustPositions.setY(index, y > 5.5 ? 0 : y)
    }
    dustPositions.needsUpdate = true

    this.composer.render(delta)

    this.onFrame({
      seat: this.anchor(this.seatTop.clone().add(new THREE.Vector3(0, 0.15, 0)), true),
      a: this.anchor(positionA, p >= 0.02 && p < 0.29),
      b: this.anchor(positionB, p >= 0.04),
      queue: this.anchor(this.queuePath.getPointAt(1), p >= 0.7),
    })
  }

  dispose() {
    this.stop()
    this.beamA.dispose()
    this.beamB.dispose()
    for (const resource of this.disposables) resource.dispose()
    this.bloom.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
