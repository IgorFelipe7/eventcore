'use client'

import { useEffect, useState } from 'react'
import {
  CONTESTED,
  ROW_LABELS,
  SEATS_PER_ROW,
  type SeatPlacement,
  cameraRig,
  contestedLabel,
  contestedSeat,
  projectPoint,
  queueLane,
  queueSlot,
  seatPlacements,
} from './hall-layout'

type Local = readonly (readonly [number, number, number])[]

const CUSHION: Local = [
  [-0.41, 0.42, -0.36],
  [0.41, 0.42, -0.36],
  [0.41, 0.42, 0.28],
  [-0.41, 0.42, 0.28],
]

const BACK: Local = [
  [-0.41, 0.42, 0.27],
  [0.41, 0.42, 0.27],
  [0.41, 0.95, 0.27],
  [-0.41, 0.95, 0.27],
]

const outline = (placement: SeatPlacement, corners: Local) =>
  corners.map(([x, y, z]) => ({
    x: placement.x + x * Math.cos(placement.yaw) + z * Math.sin(placement.yaw),
    y: placement.y + y,
    z: placement.z - x * Math.sin(placement.yaw) + z * Math.cos(placement.yaw),
  }))

interface Size {
  readonly width: number
  readonly height: number
}

export function HallDrawing({ host }: { readonly host: React.RefObject<HTMLDivElement | null> }) {
  const [size, setSize] = useState<Size | null>(null)

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [host])

  if (!size) return null
  const { width, height } = size
  const rig = cameraRig(width / height)
  const project = (point: { x: number; y: number; z: number }) =>
    projectPoint(point, rig, width, height)
  const seats = seatPlacements()
  const seat = contestedSeat()
  const seatPoint = project({ x: seat.x, y: seat.y + 0.5, z: seat.z })
  const lane = queueLane().map(project)
  const slot = project(queueSlot())
  const front = seats.filter((placement) => placement.row === 0)
  const firstFront = front[0]
  const lastFront = front[SEATS_PER_ROW - 1]
  const dimensionStart = firstFront && project({ x: firstFront.x, y: 0, z: firstFront.z - 0.9 })
  const dimensionEnd = lastFront && project({ x: lastFront.x, y: 0, z: lastFront.z - 0.9 })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden
      style={{ opacity: 'var(--lights, 0)' }}
    >
      <g fill="none" stroke="var(--color-ink)" strokeWidth="1">
        {[...seats]
          .sort((first, second) => project(second).depth - project(first).depth)
          .map((placement) => {
            const isContested =
              placement.row === CONTESTED.row && placement.column === CONTESTED.column
            const cushion = outline(placement, CUSHION).map(project)
            const back = outline(placement, BACK).map(project)
            const path = (points: { x: number; y: number }[]) =>
              points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
            return (
              <g
                key={placement.number}
                fill={isContested ? 'var(--color-confirmed-wash)' : 'var(--color-sheet)'}
                stroke={isContested ? 'var(--color-confirmed)' : 'var(--color-ink)'}
                strokeWidth={isContested ? 1.4 : 0.8}
                strokeLinejoin="round"
              >
                <polygon points={path(back)} />
                <polygon points={path(cushion)} />
              </g>
            )
          })}
        {ROW_LABELS.map((label, row) => {
          const edge = seats
            .filter((placement) => placement.row === row)
            .map((placement) => ({ placement, point: project(placement) }))
            .sort((first, second) => first.point.x - second.point.x)[0]
          if (!edge) return null
          const point = { x: edge.point.x - 64, y: edge.point.y - 4 }
          return (
            <text
              key={label}
              x={point.x}
              y={point.y}
              fill="var(--color-ink-3)"
              stroke="none"
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              Row {label}
            </text>
          )
        })}
        <polyline
          points={lane.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke="var(--color-waitlisted)"
          strokeDasharray="6 5"
        />
        <circle cx={slot.x} cy={slot.y} r="5" fill="var(--color-waitlisted)" stroke="none" />
        {dimensionStart && dimensionEnd ? (
          <g stroke="var(--color-ink-3)">
            <line
              x1={dimensionStart.x}
              y1={dimensionStart.y}
              x2={dimensionEnd.x}
              y2={dimensionEnd.y}
            />
            <line
              x1={dimensionStart.x}
              y1={dimensionStart.y - 6}
              x2={dimensionStart.x}
              y2={dimensionStart.y + 6}
            />
            <line
              x1={dimensionEnd.x}
              y1={dimensionEnd.y - 6}
              x2={dimensionEnd.x}
              y2={dimensionEnd.y + 6}
            />
            <text
              x={(dimensionStart.x + dimensionEnd.x) / 2}
              y={(dimensionStart.y + dimensionEnd.y) / 2 + 16}
              textAnchor="middle"
              fill="var(--color-ink-3)"
              stroke="none"
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              6 seats · 4 rows · capacity 24
            </text>
          </g>
        ) : null}
        <g stroke="var(--color-confirmed)">
          <circle cx={seatPoint.x} cy={seatPoint.y} r="2.5" fill="var(--color-confirmed)" />
          <line x1={seatPoint.x} y1={seatPoint.y} x2={seatPoint.x - 70} y2={seatPoint.y - 150} />
          <line
            x1={seatPoint.x - 70}
            y1={seatPoint.y - 150}
            x2={seatPoint.x - 100}
            y2={seatPoint.y - 150}
          />
          <text
            x={seatPoint.x - 106}
            y={seatPoint.y - 146}
            textAnchor="end"
            fill="var(--color-confirmed)"
            stroke="none"
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
          >
            {contestedLabel()} · A · confirmed
          </text>
        </g>
        <g stroke="var(--color-waitlisted)">
          <line x1={slot.x} y1={slot.y} x2={slot.x - 30} y2={slot.y + 34} />
          <text
            x={slot.x - 36}
            y={slot.y + 38}
            textAnchor="end"
            fill="var(--color-waitlisted)"
            stroke="none"
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
          >
            B · waitlisted #1
          </text>
        </g>
      </g>
    </svg>
  )
}
