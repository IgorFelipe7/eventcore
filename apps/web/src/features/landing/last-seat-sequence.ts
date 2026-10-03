export type LaneId = 'A' | 'B'

export type LanePosition = 'arriving' | 'waiting' | 'holding' | 'done'

export interface SequenceStep {
  readonly tick: string
  readonly caption: string
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
    caption:
      'Both requests arrive within the same millisecond. Each carries its own idempotency key.',
    statement: 'POST /v1/events/{id}/registrations   ×2',
    lock: null,
    lanes: { A: 'arriving', B: 'arriving' },
    confirmed: 23,
    queue: [],
    outcomes: {},
  },
  {
    tick: 't₁',
    caption: 'A takes the inventory row lock. B reaches the same row and waits for it.',
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
    caption: 'Under the lock, A re-reads 23 of 24 seats and an empty queue. Decision: confirmed.',
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
    caption:
      'A commits its seat, history, audit entry and outbox event together. The lock is released.',
    statement: 'COMMIT',
    lock: null,
    lanes: { A: 'done', B: 'waiting' },
    confirmed: 24,
    queue: [],
    outcomes: { A: '201 · CONFIRMED' },
  },
  {
    tick: 't₄',
    caption:
      'B takes the lock and re-reads the row: 24 of 24. It does not trust what it saw before.',
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
    caption:
      'Both answers are final and both are true. If A cancels, B is promoted in the same transaction.',
    statement: 'COMMIT',
    lock: null,
    lanes: { A: 'done', B: 'done' },
    confirmed: 24,
    queue: ['B'],
    outcomes: { A: '201 · CONFIRMED', B: '201 · WAITLISTED #1' },
  },
]
