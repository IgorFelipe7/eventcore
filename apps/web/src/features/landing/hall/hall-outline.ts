import {
  CONTESTED,
  type CameraRig,
  type Point3,
  type SeatPlacement,
  projectPoint,
  seatPlacements,
} from './hall-layout'

type Local = readonly (readonly [number, number, number])[]

const PAN: Local = [
  [-0.36, 0.44, -0.31],
  [0.36, 0.44, -0.31],
  [0.36, 0.44, 0.27],
  [-0.36, 0.44, 0.27],
]

const BACK: Local = [
  [-0.36, 0.46, 0.26],
  [0.36, 0.46, 0.26],
  [0.36, 1.06, 0.36],
  [-0.36, 1.06, 0.36],
]

const SIDE: Local = [
  [0, 0, -0.29],
  [0, 0.6, -0.29],
  [0, 0.6, 0.37],
  [0, 0, 0.37],
]

const offsetSide = (offset: number): Local => SIDE.map(([x, y, z]) => [x + offset, y, z] as const)

const toWorld = (placement: SeatPlacement, corners: Local): Point3[] =>
  corners.map(([x, y, z]) => ({
    x: placement.x + x * Math.cos(placement.yaw) + z * Math.sin(placement.yaw),
    y: placement.y + y,
    z: placement.z - x * Math.sin(placement.yaw) + z * Math.cos(placement.yaw),
  }))

export interface SeatOutline {
  readonly number: number
  readonly contested: boolean
  readonly polygons: readonly string[]
}

export const seatOutlines = (rig: CameraRig, width: number, height: number): SeatOutline[] => {
  const project = (point: Point3) => projectPoint(point, rig, width, height)
  const path = (points: Point3[]) =>
    points
      .map(project)
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' ')
  return seatPlacements()
    .map((placement) => ({ placement, depth: project(placement).depth }))
    .sort((first, second) => second.depth - first.depth)
    .map(({ placement }) => ({
      number: placement.number,
      contested: placement.row === CONTESTED.row && placement.column === CONTESTED.column,
      polygons: [
        path(toWorld(placement, BACK)),
        path(toWorld(placement, offsetSide(-0.42))),
        path(toWorld(placement, PAN)),
        path(toWorld(placement, offsetSide(0.42))),
      ],
    }))
}
