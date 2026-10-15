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
const STAGE_Z = -2.6

export const seatPlacements = (): SeatPlacement[] =>
  Array.from({ length: ROWS * SEATS_PER_ROW }, (_, index) => {
    const row = Math.floor(index / SEATS_PER_ROW)
    const column = index % SEATS_PER_ROW
    const radius = FIRST_ROW_RADIUS + row * ROW_SPACING
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
  return { x: seat.x - 3.4, y: 0.42, z: seat.z - 2.9 }
}

export const queueLane = (): Point3[] => {
  const seat = contestedSeat()
  return [
    { x: seat.x - 0.6, y: 0.06, z: seat.z - 1.0 },
    { x: seat.x - 2.2, y: 0.06, z: seat.z - 2.2 },
    { x: seat.x - 4.6, y: 0.06, z: seat.z - 3.4 },
  ]
}

export const contestedLabel = () => {
  const seat = contestedSeat()
  return `Row ${ROW_LABELS[seat.row] ?? '?'} · Seat ${seat.number}`
}

export interface CameraRig {
  readonly position: Point3
  readonly target: Point3
  readonly fov: number
}

export const cameraRig = (aspect: number): CameraRig => {
  const portrait = aspect < 0.9
  return {
    position: portrait ? { x: 0, y: 8.8, z: -10.6 } : { x: 0.9, y: 6.2, z: -10.4 },
    target: portrait ? { x: 0.8, y: 4.6, z: 5.2 } : { x: 2.3, y: 0.9, z: 5.4 },
    fov: portrait ? 56 : 33,
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

export interface Beat {
  readonly index: number
  readonly title: string
  readonly caption: string
  readonly from: number
}

export const BEATS: readonly Beat[] = [
  {
    index: 1,
    title: 'Arrival',
    caption: '23 of 24 seats are taken. One is left, and two requests want it.',
    from: 0,
  },
  {
    index: 2,
    title: 'Contention',
    caption: 'A and B arrive within the same millisecond, each with its own idempotency key.',
    from: 0.06,
  },
  {
    index: 3,
    title: 'The lock',
    caption: 'A takes the inventory row with FOR UPDATE. B reaches the same row and waits.',
    from: 0.3,
  },
  {
    index: 4,
    title: 'Decision',
    caption: 'Under the lock, A re-reads 23 of 24 and an empty queue. Confirmed, committed.',
    from: 0.42,
  },
  {
    index: 5,
    title: 'Queue',
    caption:
      'B takes the lock, re-reads 24 of 24 and becomes first in line. Both answers are true.',
    from: 0.66,
  },
]

export const beatAt = (progress: number): Beat =>
  [...BEATS].reverse().find((beat) => progress >= beat.from) ?? (BEATS[0] as Beat)

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
