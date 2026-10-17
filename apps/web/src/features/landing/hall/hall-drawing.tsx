'use client'

import { memo, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/provider'
import {
  ROW_LABELS,
  SEATS_PER_ROW,
  cameraRig,
  contestedLabel,
  contestedSeat,
  projectPoint,
  queueLane,
  queueSlot,
  seatPlacements,
} from './hall-layout'
import { seatOutlines } from './hall-outline'

const GLYPH_WIDTH = 7.4

function Label({
  x,
  y,
  anchor = 'start',
  color,
  children,
}: {
  readonly x: number
  readonly y: number
  readonly anchor?: 'start' | 'middle' | 'end'
  readonly color: string
  readonly children: string
}) {
  const width = children.length * GLYPH_WIDTH
  const left = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x
  return (
    <g>
      <rect
        x={left - 4}
        y={y - 10}
        width={width + 8}
        height={14}
        fill="var(--color-paper)"
        stroke="none"
      />
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fill={color}
        stroke="none"
        className="font-mono text-[10px] uppercase tracking-[0.14em]"
      >
        {children}
      </text>
    </g>
  )
}

interface Size {
  readonly width: number
  readonly height: number
}

function Drawing({ host }: { readonly host: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useI18n()
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
        {seatOutlines(rig, width, height).map((outline) => (
          <g
            key={outline.number}
            fill={outline.contested ? 'var(--color-confirmed-wash)' : 'var(--color-sheet)'}
            stroke={outline.contested ? 'var(--color-confirmed)' : 'var(--color-ink)'}
            strokeWidth={outline.contested ? 1.4 : 0.8}
            strokeLinejoin="round"
          >
            {outline.polygons.map((points, index) => (
              <polygon key={index} points={points} />
            ))}
          </g>
        ))}
        {ROW_LABELS.map((label, row) => {
          const edge = seats
            .filter((placement) => placement.row === row)
            .map((placement) => ({ placement, point: project(placement) }))
            .sort((first, second) => first.point.x - second.point.x)[0]
          if (!edge) return null
          const point = { x: edge.point.x - 64, y: edge.point.y - 4 }
          return (
            <Label key={label} x={point.x} y={point.y} color="var(--color-ink-3)">
              {t.hero.row(label)}
            </Label>
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
            <Label
              x={(dimensionStart.x + dimensionEnd.x) / 2}
              y={(dimensionStart.y + dimensionEnd.y) / 2 + 16}
              anchor="middle"
              color="var(--color-ink-3)"
            >
              {t.hero.drawingDimension}
            </Label>
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
          <Label
            x={seatPoint.x - 106}
            y={seatPoint.y - 146}
            anchor="end"
            color="var(--color-confirmed)"
          >
            {t.hero.drawingSeat(contestedLabel(t.hero.seat))}
          </Label>
        </g>
        <g stroke="var(--color-waitlisted)">
          <line x1={slot.x} y1={slot.y} x2={slot.x - 30} y2={slot.y + 34} />
          <Label x={slot.x - 36} y={slot.y + 38} anchor="end" color="var(--color-waitlisted)">
            {t.hero.drawingQueue}
          </Label>
        </g>
      </g>
    </svg>
  )
}

export const HallDrawing = memo(Drawing)
