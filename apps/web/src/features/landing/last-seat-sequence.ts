export type LaneId = 'A' | 'B'

export type LanePosition = 'arriving' | 'waiting' | 'holding' | 'done'

export interface SequenceStep {
  readonly tick: string
  readonly statement: string
  readonly lock: LaneId | null
  readonly lanes: Readonly<Record<LaneId, LanePosition>>
  readonly confirmed: number
  readonly queue: readonly LaneId[]
  readonly outcomes: Readonly<Partial<Record<LaneId, string>>>
}

export const CAPACITY = 24

export const LAST_SEAT_SEQUENCE: readonly SequenceStep[] = [
  {
    tick: 't₀',
    statement: 'POST /v1/events/{id}/registrations   ×2',
    lock: null,
    lanes: { A: 'arriving', B: 'arriving' },
    confirmed: 23,
    queue: [],
    outcomes: {},
  },
  {
    tick: 't₁',
    statement:
      'SELECT capacity, confirmed_count FROM event_inventory WHERE event_id = $1 FOR UPDATE',
    lock: 'A',
    lanes: { A: 'holding', B: 'waiting' },
    confirmed: 23,
    queue: [],
    outcomes: {},
  },
  {
    tick: 't₂',
    statement:
      'UPDATE event_inventory SET confirmed_count = confirmed_count + 1 WHERE event_id = $1',
    lock: 'A',
    lanes: { A: 'holding', B: 'waiting' },
    confirmed: 24,
    queue: [],
    outcomes: {},
  },
  {
    tick: 't₃',
    statement: 'COMMIT',
    lock: null,
    lanes: { A: 'done', B: 'waiting' },
    confirmed: 24,
    queue: [],
    outcomes: { A: '201 · CONFIRMED' },
  },
  {
    tick: 't₄',
    statement:
      "INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, 'WAITLISTED')",
    lock: 'B',
    lanes: { A: 'done', B: 'holding' },
    confirmed: 24,
    queue: ['B'],
    outcomes: { A: '201 · CONFIRMED' },
  },
  {
    tick: 't₅',
    statement: 'COMMIT',
    lock: null,
    lanes: { A: 'done', B: 'done' },
    confirmed: 24,
    queue: ['B'],
    outcomes: { A: '201 · CONFIRMED', B: '201 · WAITLISTED #1' },
  },
]
