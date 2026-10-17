import { cameraRig, contestedSeat, projectPoint, queueLane, queueSlot } from './hall-layout'
import { seatOutlines } from './hall-outline'

const WIDTH = 1600
const HEIGHT = 1000

export function HallPoster({
  className = '',
  final,
}: {
  readonly className?: string
  readonly final: boolean
}) {
  const glow = final ? '#3dd68c' : '#6b7bff'
  const edge = final ? '#c4f5dc' : '#c8ceff'
  const rig = cameraRig(WIDTH / HEIGHT)
  const contested = projectPoint(contestedSeat(), rig, WIDTH, HEIGHT)
  const lanePoints = queueLane().map((point) => projectPoint(point, rig, WIDTH, HEIGHT))
  const slot = projectPoint(queueSlot(), rig, WIDTH, HEIGHT)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <defs>
        <radialGradient id="hall-spot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.28" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <pattern id="hall-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#161c25" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="#07090c" />
      <rect
        y={HEIGHT * 0.42}
        width={WIDTH}
        height={HEIGHT * 0.58}
        fill="url(#hall-grid)"
        opacity="0.7"
      />
      <ellipse cx={contested.x} cy={contested.y} rx={240} ry={140} fill="url(#hall-spot)" />
      {final ? (
        <polyline
          points={lanePoints.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="#f2b84b"
          strokeWidth="2"
          strokeDasharray="10 8"
          opacity="0.8"
        />
      ) : null}
      {seatOutlines(rig, WIDTH, HEIGHT).map((seat) => (
        <g
          key={seat.number}
          fill={seat.contested ? glow : '#0b0f15'}
          stroke={seat.contested ? edge : '#4a566a'}
          strokeWidth={seat.contested ? 1.6 : 1}
          strokeLinejoin="round"
        >
          {seat.polygons.map((points, index) => (
            <polygon key={index} points={points} />
          ))}
        </g>
      ))}
      {final ? (
        <>
          <circle cx={slot.x} cy={slot.y} r="8" fill="#f2b84b" />
          <circle cx={slot.x} cy={slot.y} r="20" fill="none" stroke="#f2b84b" opacity="0.5" />
        </>
      ) : null}
    </svg>
  )
}
