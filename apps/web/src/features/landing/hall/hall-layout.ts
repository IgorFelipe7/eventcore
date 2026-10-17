export interface Point3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface SeatPlacement extends Point3 {
  readonly row: number
  readonly column: number
  readonly number: number
  readonly yaw: number
}

export const ROWS = 4
export const SEATS_PER_ROW = 6
export const CAPACITY = ROWS * SEATS_PER_ROW
export const ROW_LABELS = ['A', 'B', 'C', 'D'] as const
export const CONTESTED = { row: 1, column: 3 } as const

const FIRST_ROW_RADIUS = 6.4
const ROW_SPACING = 1.32
const RAKE = 0.34
const ARC = 0.62
export const STAGE_Z = -2.6

export const rowRadius = (row: number) => FIRST_ROW_RADIUS + row * ROW_SPACING

export const seatPlacements = (): SeatPlacement[] =>
  Array.from({ length: ROWS * SEATS_PER_ROW }, (_, index) => {
    const row = Math.floor(index / SEATS_PER_ROW)
    const column = index % SEATS_PER_ROW
    const radius = rowRadius(row)
    const angle = ((column - (SEATS_PER_ROW - 1) / 2) / (SEATS_PER_ROW - 1)) * ARC
    return {
      row,
      column,
      number: index + 1,
      x: Math.sin(angle) * radius,
      y: row * RAKE,
      z: STAGE_Z + Math.cos(angle) * radius,
      yaw: angle,
    }
  })

export const contestedSeat = (): SeatPlacement => {
  const seat = seatPlacements().find(
    (placement) => placement.row === CONTESTED.row && placement.column === CONTESTED.column,
  )
  if (!seat) throw new Error('The contested seat is outside the hall.')
  return seat
}

export const queueSlot = (): Point3 => {
  const seat = contestedSeat()
  return { x: seat.x + 4.8, y: seat.y + 0.1, z: seat.z + 3 }
}

export const queueLane = (): Point3[] => {
  const seat = contestedSeat()
  return [
    { x: seat.x + 0.6, y: seat.y + 0.04, z: seat.z },
    { x: seat.x + 4.2, y: seat.y + 0.04, z: seat.z + 0.9 },
    { x: seat.x + 4.8, y: seat.y + 0.04, z: seat.z + 3 },
  ]
}

export const contestedLabel = (format: (row: string, number: number) => string) => {
  const seat = contestedSeat()
  return format(ROW_LABELS[seat.row] ?? '?', seat.number)
}

export interface CameraRig {
  readonly position: Point3
  readonly target: Point3
  readonly fov: number
}

export const cameraRig = (aspect: number): CameraRig => {
  const portrait = aspect < 0.9
  return {
    position: portrait ? { x: 0.4, y: 11, z: -8 } : { x: 0.9, y: 9.4, z: -10.6 },
    target: portrait ? { x: 0.2, y: -1.8, z: 7 } : { x: 3.1, y: 0.1, z: 5.8 },
    fov: portrait ? 50 : 33,
  }
}

const subtract = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const dot = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Point3, b: Point3): Point3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const normalize = (a: Point3): Point3 => {
  const length = Math.hypot(a.x, a.y, a.z) || 1
  return { x: a.x / length, y: a.y / length, z: a.z / length }
}

export const projectPoint = (
  point: Point3,
  rig: CameraRig,
  width: number,
  height: number,
): { x: number; y: number; depth: number } => {
  const forward = normalize(subtract(rig.target, rig.position))
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }))
  const up = cross(right, forward)
  const relative = subtract(point, rig.position)
  const depth = dot(relative, forward)
  const focal = height / 2 / Math.tan((rig.fov * Math.PI) / 360)
  return {
    x: width / 2 + (dot(relative, right) / depth) * focal,
    y: height / 2 - (dot(relative, up) / depth) * focal,
    depth,
  }
}

export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount

export const segment = (progress: number, start: number, end: number) =>
  Math.min(1, Math.max(0, (progress - start) / (end - start)))

export const easeInOut = (value: number) =>
  value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2

export const BEAT_STARTS = [0, 0.06, 0.3, 0.42, 0.66] as const

export const beatAt = (progress: number): number => {
  const index = BEAT_STARTS.findLastIndex((start) => progress >= start)
  return Math.max(0, index)
}

export interface HallMoment {
  readonly lockHolder: 'A' | 'B' | null
  readonly confirmed: number
  readonly a: 'arriving' | 'holding' | 'confirmed'
  readonly b: 'arriving' | 'waiting' | 'holding' | 'queued'
}

export const momentAt = (progress: number): HallMoment => ({
  lockHolder:
    progress >= 0.3 && progress < 0.62 ? 'A' : progress >= 0.68 && progress < 0.9 ? 'B' : null,
  confirmed: progress >= 0.5 ? CAPACITY : CAPACITY - 1,
  a: progress >= 0.5 ? 'confirmed' : progress >= 0.3 ? 'holding' : 'arriving',
  b:
    progress >= 0.86
      ? 'queued'
      : progress >= 0.68
        ? 'holding'
        : progress >= 0.32
          ? 'waiting'
          : 'arriving',
})
