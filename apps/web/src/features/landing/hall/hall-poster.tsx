import {
  CONTESTED,
  cameraRig,
  contestedSeat,
  projectPoint,
  queueLane,
  queueSlot,
  seatPlacements,
} from './hall-layout'

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
  const rig = cameraRig(WIDTH / HEIGHT)
  const seats = seatPlacements()
    .map((seat) => ({ seat, point: projectPoint(seat, rig, WIDTH, HEIGHT) }))
    .sort((a, b) => b.point.depth - a.point.depth)
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
          <stop offset="0%" stopColor={glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <pattern id="hall-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#1f2632" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="#07090c" />
      <rect
        y={HEIGHT * 0.42}
        width={WIDTH}
        height={HEIGHT * 0.58}
        fill="url(#hall-grid)"
        opacity="0.6"
      />
      <ellipse cx={contested.x} cy={contested.y} rx={260} ry={150} fill="url(#hall-spot)" />
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
      {seats.map(({ seat, point }) => {
        const scale = 900 / point.depth
        const width = scale * 0.82
        const height = scale * 0.62
        const isContested = seat.row === CONTESTED.row && seat.column === CONTESTED.column
        return (
          <g key={seat.number} transform={`translate(${point.x - width / 2} ${point.y - height})`}>
            <rect
              width={width}
              height={height}
              rx={scale * 0.08}
              fill={isContested ? (final ? '#173a2c' : '#1d2350') : '#1c232d'}
              stroke={isContested ? glow : '#2b3442'}
              strokeWidth={isContested ? 2 : 1}
            />
            <rect
              y={height * 0.62}
              width={width}
              height={height * 0.38}
              rx={scale * 0.06}
              fill={isContested ? (final ? '#1f4a37' : '#2a3170') : '#232b37'}
            />
          </g>
        )
      })}
      {final ? (
        <>
          <circle cx={slot.x} cy={slot.y} r="9" fill="#f2b84b" />
          <circle cx={slot.x} cy={slot.y} r="22" fill="#f2b84b" opacity="0.15" />
        </>
      ) : null}
    </svg>
  )
}
