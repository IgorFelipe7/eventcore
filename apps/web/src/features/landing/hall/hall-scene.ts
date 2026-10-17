import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  CONTESTED,
  type Point3,
  ROWS,
  STAGE_Z,
  cameraRig,
  contestedSeat,
  easeInOut,
  lerp,
  queueLane,
  queueSlot,
  rowRadius,
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
  fill: 0x0d1219,
  edge: 0x4a566a,
  edgeFar: 0x2a323f,
  grid: 0x161c25,
  gridMajor: 0x222a36,
  signal: 0x6b7bff,
  signalEdge: 0xc8ceff,
  waitlisted: 0xf2b84b,
  confirmed: 0x3dd68c,
  confirmedEdge: 0xc4f5dc,
  request: 0xe9edf3,
} as const

const TRAIL_POINTS = 48
const MAX_PIXEL_RATIO = 1.75
const MIN_PIXEL_RATIO = 0.75
const SLOW_FRAME_MS = 24
const IDLE_FRAME_MS = 66

const toVector = (point: Point3) => new THREE.Vector3(point.x, point.y, point.z)

interface Part {
  readonly size: readonly [number, number, number]
  readonly position: readonly [number, number, number]
  readonly tilt: number
}

const SEAT_PARTS: readonly Part[] = [
  { size: [0.72, 0.08, 0.58], position: [0, 0.4, -0.02], tilt: -0.06 },
  { size: [0.72, 0.6, 0.07], position: [0, 0.76, 0.31], tilt: 0.16 },
  { size: [0.06, 0.6, 0.66], position: [-0.42, 0.3, 0.04], tilt: 0 },
  { size: [0.06, 0.6, 0.66], position: [0.42, 0.3, 0.04], tilt: 0 },
]

const seatParts = () =>
  SEAT_PARTS.map((part) => {
    const box = new THREE.BoxGeometry(...part.size)
    box.rotateX(part.tilt)
    box.translate(...part.position)
    return box
  })

const seatFill = () => {
  const merged = mergeGeometries(seatParts().map((part) => part.toNonIndexed()))
  if (!merged) throw new Error('Seat geometry could not be merged.')
  return merged
}

const seatEdges = () => {
  const merged = mergeGeometries(seatParts().map((part) => new THREE.EdgesGeometry(part)))
  if (!merged) throw new Error('Seat edges could not be merged.')
  return merged
}

const placementMatrix = (placement: { x: number; y: number; z: number; yaw: number }) =>
  new THREE.Matrix4().compose(
    toVector(placement),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, placement.yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  )

const arcPoints = (radius: number, y: number, spread: number, steps = 48) =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const angle = -spread + (index / steps) * spread * 2
    return new THREE.Vector3(Math.sin(angle) * radius, y, STAGE_Z + Math.cos(angle) * radius)
  })

const bracketSegments = (half: number, height: number, arm: number) => {
  const points: THREE.Vector3[] = []
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const sy of [0, 1]) {
        const corner = new THREE.Vector3(sx * half, sy * height, sz * half)
        points.push(corner, corner.clone().add(new THREE.Vector3(-sx * arm, 0, 0)))
        points.push(corner, corner.clone().add(new THREE.Vector3(0, 0, -sz * arm)))
        points.push(corner, corner.clone().add(new THREE.Vector3(0, sy ? -arm : arm, 0)))
      }
    }
  }
  return points
}

class Beam {
  readonly head: THREE.Mesh
  readonly halo: THREE.Mesh
  readonly trail: THREE.Points
  private readonly history: THREE.Vector3[] = []

  constructor(
    scene: THREE.Scene,
    readonly baseColor: THREE.Color,
  ) {
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 20, 20),
      new THREE.MeshBasicMaterial({ color: baseColor }),
    )
    this.halo = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.175, 48),
      new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.head.add(this.halo)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3),
    )
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 4), 4))
    this.trail = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.075,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    scene.add(this.head, this.trail)
  }

  place(position: THREE.Vector3, visible: boolean, tint: THREE.Color, camera: THREE.Camera) {
    this.head.visible = visible
    this.trail.visible = visible
    this.head.position.copy(position)
    this.halo.quaternion.copy(camera.quaternion)
    ;(this.head.material as THREE.MeshBasicMaterial).color.copy(tint)
    ;(this.halo.material as THREE.MeshBasicMaterial).color.copy(tint)
    const last = this.history.at(-1)
    if (!last || last.distanceToSquared(position) > 0.0016) this.history.push(position.clone())
    while (this.history.length > TRAIL_POINTS) this.history.shift()
    const positions = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = this.trail.geometry.getAttribute('color') as THREE.BufferAttribute
    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      const point = this.history[this.history.length - 1 - index] ?? position
      positions.setXYZ(index, point.x, point.y, point.z)
      colors.setXYZW(index, tint.r, tint.g, tint.b, (1 - index / TRAIL_POINTS) ** 1.6 * 0.9)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  reset() {
    this.history.length = 0
  }

  dispose() {
    for (const mesh of [this.head, this.halo]) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    this.trail.geometry.dispose()
    ;(this.trail.material as THREE.Material).dispose()
  }
}

export class HallScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220)
  private readonly seat = contestedSeat()
  private readonly seatTop: THREE.Vector3
  private readonly contestedFill: THREE.MeshBasicMaterial
  private readonly contestedEdge: THREE.LineBasicMaterial
  private readonly lock: THREE.LineSegments
  private readonly lane: THREE.Line
  private readonly pathA: THREE.CatmullRomCurve3
  private readonly pathB: THREE.CatmullRomCurve3
  private readonly queuePath: THREE.CatmullRomCurve3
  private readonly beamA: Beam
  private readonly beamB: Beam
  private readonly disposables: { dispose(): void }[] = []
  private readonly pointer = new THREE.Vector2()
  private readonly cameraOffset = new THREE.Vector2()
  private readonly palette = {
    signal: new THREE.Color(COLORS.signal),
    signalEdge: new THREE.Color(COLORS.signalEdge),
    waitlisted: new THREE.Color(COLORS.waitlisted),
    confirmed: new THREE.Color(COLORS.confirmed),
    confirmedEdge: new THREE.Color(COLORS.confirmedEdge),
  }
  private targetProgress = 0
  private progress = 0
  private width = 1
  private height = 1
  private pixelRatio: number
  private frame: number | null = null
  private running = false
  private dormant = false
  private lastTime = 0
  private lastRender = 0
  private elapsed = 0
  private slowFrames = 0
  private sampledFrames = 0

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onFrame: (frame: HallFrame) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setClearColor(COLORS.night, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.42, 0.5)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.scene.background = new THREE.Color(COLORS.night)
    this.scene.fog = new THREE.Fog(COLORS.night, 10, 26)
    this.seatTop = toVector(this.seat).add(new THREE.Vector3(0, 0.78, 0))

    this.scene.add(new THREE.HemisphereLight(0x8c95a3, 0x07090c, 1.4))
    const key = new THREE.DirectionalLight(0xb8c0ff, 0.9)
    key.position.set(3, 9, -6)
    this.scene.add(key)

    this.buildFloor()
    const contested = this.buildSeats()
    this.contestedFill = contested.fill
    this.contestedEdge = contested.edge

    const lockGeometry = new THREE.BufferGeometry().setFromPoints(bracketSegments(0.62, 1.2, 0.2))
    this.lock = new THREE.LineSegments(
      lockGeometry,
      new THREE.LineBasicMaterial({ color: COLORS.signal, transparent: true, opacity: 0 }),
    )
    this.lock.position.copy(toVector(this.seat)).add(new THREE.Vector3(0, 0.05, 0))
    this.lock.rotation.y = this.seat.yaw
    this.scene.add(this.lock)
    this.disposables.push(lockGeometry, this.lock.material as THREE.Material)

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
      this.seatTop.clone().add(new THREE.Vector3(1.0, 0.1, -0.3)),
      new THREE.Vector3(s.x + 3.6, s.y + 0.9, s.z + 1.2),
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
    this.beamB = new Beam(this.scene, new THREE.Color(COLORS.request))
  }

  private addLines(points: THREE.Vector3[], color: number, opacity: number, closed = false) {
    const first = points[0]
    const path = closed && first ? [...points, first] : points
    const geometry = new THREE.BufferGeometry().setFromPoints(path)
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    this.scene.add(new THREE.Line(geometry, material))
    this.disposables.push(geometry, material)
  }

  private buildFloor() {
    const grid = new THREE.GridHelper(60, 60, COLORS.gridMajor, COLORS.grid)
    const gridMaterial = grid.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.7
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

    const spread = 0.62 + 0.14
    for (let row = 0; row < ROWS; row += 1) {
      const radius = rowRadius(row)
      const y = row * 0.34 + 0.004
      const inner = arcPoints(radius - 0.62, y, spread)
      const outer = arcPoints(radius + 0.62, y, spread).reverse()
      this.addLines([...inner, ...outer], COLORS.edgeFar, 0.9, true)
    }
    this.addLines(arcPoints(rowRadius(0) - 1.6, 0.01, 0.9, 64), COLORS.edge, 0.6)
    this.addLines(arcPoints(rowRadius(0) - 1.75, 0.01, 0.9, 64), COLORS.edgeFar, 0.6)
  }

  private buildSeats() {
    const fill = seatFill()
    const edges = seatEdges()
    const fillMaterial = new THREE.MeshLambertMaterial({
      color: COLORS.fill,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const placements = seatPlacements()
    const others = placements.filter(
      (placement) => !(placement.row === CONTESTED.row && placement.column === CONTESTED.column),
    )
    const instanced = new THREE.InstancedMesh(fill, fillMaterial, others.length)
    others.forEach((placement, index) => instanced.setMatrixAt(index, placementMatrix(placement)))
    this.scene.add(instanced)

    const outlines = mergeGeometries(
      others.map((placement) => edges.clone().applyMatrix4(placementMatrix(placement))),
    )
    if (!outlines) throw new Error('Hall outlines could not be merged.')
    const outlineMaterial = new THREE.LineBasicMaterial({ color: COLORS.edge })
    this.scene.add(new THREE.LineSegments(outlines, outlineMaterial))

    const contestedFill = new THREE.MeshBasicMaterial({
      color: COLORS.signal,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const contestedEdge = new THREE.LineBasicMaterial({ color: COLORS.signalEdge })
    const matrix = placementMatrix(this.seat)
    const contested = new THREE.Mesh(fill, contestedFill)
    contested.applyMatrix4(matrix)
    const contestedOutline = new THREE.LineSegments(edges, contestedEdge)
    contestedOutline.applyMatrix4(matrix)
    this.scene.add(contested, contestedOutline)

    this.disposables.push(
      fill,
      edges,
      outlines,
      fillMaterial,
      outlineMaterial,
      contestedFill,
      contestedEdge,
      instanced,
    )
    return { fill: contestedFill, edge: contestedEdge }
  }

  setProgress(value: number) {
    this.targetProgress = Math.min(1, Math.max(0, value))
  }

  setDormant(value: boolean) {
    this.dormant = value
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.applySize()
  }

  private applySize() {
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setSize(this.width, this.height, false)
    this.composer.setPixelRatio(this.pixelRatio)
    this.composer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.fov = cameraRig(this.camera.aspect).fov
    this.camera.updateProjectionMatrix()
    this.lastRender = 0
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const interval = now - this.lastTime
      this.lastTime = now
      this.adapt(interval)
      const delta = Math.min(0.1, interval / 1000)
      this.elapsed += delta
      if (this.dormant || (this.isSettled() && now - this.lastRender < IDLE_FRAME_MS)) {
        this.frame = requestAnimationFrame(loop)
        return
      }
      this.lastRender = now
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

  private isSettled() {
    return (
      this.progress === this.targetProgress &&
      this.cameraOffset.distanceToSquared(this.pointer) < 0.00002
    )
  }

  private adapt(interval: number) {
    if (this.isSettled() || interval > 250) return
    this.sampledFrames += 1
    if (interval > SLOW_FRAME_MS) this.slowFrames += 1
    if (this.sampledFrames < 40) return
    if (this.slowFrames > 24 && this.pixelRatio > MIN_PIXEL_RATIO) {
      this.pixelRatio = Math.max(MIN_PIXEL_RATIO, this.pixelRatio - 0.25)
      this.applySize()
    }
    this.sampledFrames = 0
    this.slowFrames = 0
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
    const smoothing = delta === 0 ? 1 : 1 - Math.exp(-delta * 6)
    if (Math.abs(this.targetProgress - this.progress) < 0.0005) this.progress = this.targetProgress
    else this.progress = lerp(this.progress, this.targetProgress, smoothing)
    const p = this.progress
    const { signal, signalEdge, waitlisted, confirmed, confirmedEdge } = this.palette

    const rig = cameraRig(this.camera.aspect)
    this.cameraOffset.lerp(this.pointer, delta === 0 ? 1 : 1 - Math.exp(-delta * 2.5))
    this.camera.position.set(
      rig.position.x + this.cameraOffset.x * 0.45,
      rig.position.y + this.cameraOffset.y * 0.25,
      rig.position.z,
    )
    this.camera.lookAt(rig.target.x, rig.target.y, rig.target.z)

    const travelA = easeInOut(segment(p, 0.04, 0.3))
    const settleA = easeInOut(segment(p, 0.42, 0.52))
    const positionA = this.pathA.getPointAt(travelA).add(new THREE.Vector3(0, -0.45 * settleA, 0))
    if (p < 0.04) this.beamA.reset()
    this.beamA.place(positionA, p >= 0.02 && settleA < 1, signal, this.camera)

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
      this.camera,
    )

    const lockA = easeInOut(segment(p, 0.28, 0.36)) * (1 - easeInOut(segment(p, 0.58, 0.64)))
    const lockB = easeInOut(segment(p, 0.66, 0.72)) * (1 - easeInOut(segment(p, 0.8, 0.86)))
    const lockAmount = Math.max(lockA, lockB)
    const lockMaterial = this.lock.material as THREE.LineBasicMaterial
    lockMaterial.opacity = lockAmount
    lockMaterial.color.copy(lockB > lockA ? waitlisted : signalEdge)
    this.lock.scale.setScalar(lerp(1.9, 1, lockAmount))

    const fill = easeInOut(segment(p, 0.44, 0.56))
    const pulse = 0.82 + Math.sin(this.elapsed * 2.1) * 0.18 * (1 - fill)
    this.contestedFill.color.copy(signal).lerp(confirmed, fill).multiplyScalar(pulse)
    this.contestedEdge.color.copy(signalEdge).lerp(confirmedEdge, fill)

    const laneMaterial = this.lane.material as THREE.LineDashedMaterial
    laneMaterial.opacity = easeInOut(segment(p, 0.66, 0.76)) * 0.9

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
