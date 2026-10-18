const count = (value: number, singular: string, plural = `${singular}s`) =>
  `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`

export const en = {
  meta: {
    title: 'EventCore · the last seat, settled exactly once',
    description:
      'A reservation engine for capacity-limited events. Serialized on one database row, idempotent on retry and fair to the waitlist, with the tests and recorded runs to prove it.',
    social: 'Two requests. One seat. Exactly one confirmation.',
    errorTitle: 'Something broke · EventCore',
  },

  common: {
    skipToContent: 'Skip to content',
    figure: 'Fig.',
    figureKinds: { illustrative: 'illustrative', measured: 'measured', schematic: 'schematic' },
    scrollableCode: (name: string) => `${name} code, scrollable`,
    terminal: 'Terminal',
    passes: 'passes',
    fails: 'fails',
    request: 'request',
    seats: (value: number) => count(value, 'seat'),
  },

  sheets: {
    board: 'Event board',
    registrations: 'My registrations',
    lab: 'Reliability Lab',
    dashboard: 'Organizer dashboard',
    eventPanel: 'Event panel',
    newEvent: 'New draft event',
    architecture: 'Architecture',
    api: 'API reference',
    event: 'Event',
  },

  nav: {
    primary: 'Primary',
    compact: 'Primary, compact',
    board: 'Board',
    lab: 'Lab',
    architecture: 'Architecture',
    api: 'API',
    dashboard: 'Dashboard',
    myRegistrations: 'My registrations',
    language: 'Language',
  },

  persona: {
    actingAs: 'Acting as',
    nobody: 'Nobody',
    readOnly: 'Read-only demo',
    intro:
      'Demo personas only. No account and no personal data: choosing one signs a short-lived token on the server.',
    participants: 'Participants',
    organizers: 'Organizers',
    active: 'Active',
    stop: 'Stop acting',
    roles: {
      'demo|participant-rio': 'demo participant',
      'demo|participant-sol': 'demo participant',
      'demo|participant-ivo': 'demo participant',
      'demo|organizer-mara': 'Northwind admin',
      'demo|organizer-teo': 'Northwind organizer',
      'demo|organizer-lis': 'Harbor Guild admin',
    } as Record<string, string>,
    required: (kind: 'participant' | 'organizer') => `Act as a demo ${kind} to open this page`,
    requiredBody: (names: string) =>
      `Use “Acting as” in the header and pick ${names}. Demo personas carry no personal data; choosing one signs a short-lived token on the server.`,
    participantNames: 'Rio, Sol or Ivo',
    organizerNames: 'Mara, Teo or Lis',
    actingAsName: (name: string) => `Acting as ${name}`,
  },

  footer: {
    tagline:
      'Every number on this site comes from the database or from a recorded run, and says which.',
    navigation: 'Footer',
    links: {
      board: 'Event board',
      lab: 'Reliability Lab',
      architecture: 'Architecture',
      api: 'API reference',
      dashboard: 'Organizer dashboard',
      registrations: 'My registrations',
    },
    fictional: 'Fictional events and demo personas only.',
    source: 'Source code',
    license: 'MIT licensed · Igor Felipe, 2026',
  },

  hero: {
    sheetNight: 'Live replay · run 02',
    subject: 'EventCore · reservations under contention',
    titleLead: 'Two requests. One seat.',
    titleBefore: 'Exactly',
    titleKeyword: 'one',
    titleAfter: 'confirmation.',
    lead: 'A reservation engine that serializes every decision on one database row. Capacity holds, retries never book twice and the waitlist keeps its order.',
    primary: 'Open the Reliability Lab',
    secondary: 'Read it as SQL',
    scroll: 'Scroll to run the race',
    finished: 'Now read it as SQL',
    finalState: 'Final state',
    beats: [
      {
        title: 'Arrival',
        caption: '23 of 24 seats are taken. One is left, and two requests want it.',
      },
      {
        title: 'Contention',
        caption: 'A and B arrive within the same millisecond, each with its own idempotency key.',
      },
      {
        title: 'The lock',
        caption: 'A takes the inventory row with FOR UPDATE. B reaches the same row and waits.',
      },
      {
        title: 'Decision',
        caption: 'Under the lock, A re-reads 23 of 24 and an empty queue. Confirmed, committed.',
      },
      {
        title: 'Queue',
        caption:
          'B takes the lock, re-reads 24 of 24 and becomes first in line. Both answers are true.',
      },
    ],
    seat: (row: string, number: number) => `Row ${row} · Seat ${number}`,
    seatState: (capacity: number, confirmed: number, holder: string | null) =>
      `capacity ${capacity} · confirmed ${confirmed} · lock: ${holder ?? 'free'}`,
    a: { arriving: 'A · req 7f3c', holding: 'A · holds the lock' },
    b: {
      arriving: 'B · req 91ad',
      waiting: 'B · waiting for the lock',
      holding: 'B · re-reads 24 / 24',
      queued: 'B · 201 waitlisted #1',
    },
  },

  ledger: {
    label: 'Recorded decisions',
    replay: 'Replay · run 02',
    commit: (hash: string) => `commit ${hash}`,
    description: (shown: number) =>
      `The first ${shown} decisions of the recorded 100-request run, in the order the database took them.`,
  },

  landing: {
    fig1: {
      mark: 'Fig. 1 · Step by step',
      title: 'The race you just watched, statement by [statement].',
      lead: 'The same two requests and the same seat, now as the SQL that decides it. Step through it at your own pace: every statement shown is one the code really runs.',
      asText: 'Read Fig. 1 as text',
      facts: [
        { value: '1', unit: 'row lock', detail: 'serializes every decision for an event' },
        { value: '0', unit: 'mocks', detail: 'where a database guarantee is claimed' },
        { value: '8', unit: 'invariants', detail: 'each with an enforcing layer and a test' },
      ],
    },
    failures: {
      mark: 'Failure modes',
      title: 'Read, then write, is a [race].',
      lead: 'Most booking bugs are not exotic. They are what happens by default when a read and a write are separated by time, and every booking flow separates them.',
      columns: { naive: 'A naive system', eventcore: 'EventCore' },
      rows: [
        {
          name: 'Overbooking',
          naive:
            'Two requests read “1 seat left” and both write. The event now has one attendee too many.',
          eventcore:
            'Every decision for an event waits for one row lock and re-reads the state under it.',
          reference: 'ADR 0002',
        },
        {
          name: 'Double effects',
          naive: 'A double-click, or a retry after a timeout, books the same person twice.',
          eventcore:
            'The idempotency key is committed with the effect. A retry receives the original answer.',
          reference: 'ADR 0003',
        },
        {
          name: 'False notifications',
          naive:
            'An email goes out for a transaction that rolled back, or never goes out for one that committed.',
          eventcore:
            'The notification is written to an outbox in the same transaction and delivered after commit.',
          reference: 'ADR 0004',
        },
        {
          name: 'Cross-tenant reads',
          naive: 'Changing an id in the URL shows another organizer’s attendee list.',
          eventcore:
            'Every organizer query is scoped by verified membership. Foreign ids are simply not found.',
          reference: 'Threat model T1',
        },
      ],
      baseline: (confirmed: number, capacity: number) =>
        `Measured on a real PostgreSQL 18: a check-then-insert implementation confirmed ${confirmed} people for ${capacity} seats when 100 requests arrived together.`,
      baselineLink: 'Lab, test 02',
    },
    invariants: {
      mark: 'Guarantees',
      title: 'Eight invariants. Each one has an [owner] and a test.',
      lead: 'A guarantee is only as strong as the layer that enforces it. Each rule below names that layer and the file that tries to break it against a real PostgreSQL 18.',
      enforcedBy: 'Enforced by',
      verifiedBy: 'Verified by',
      rules: {
        I1: {
          rule: 'Confirmed seats never exceed capacity, and never go below zero.',
          enforcedBy: 'Inventory row lock + CHECK constraints',
        },
        I2: {
          rule: 'A participant holds at most one registration per event; re-entry reuses the same row.',
          enforcedBy: 'UNIQUE (event_id, user_id) + row lock',
        },
        I3: {
          rule: 'The same request with the same key has one effect and one answer; a different payload is refused.',
          enforcedBy: 'Idempotency key committed with the effect',
        },
        I4: {
          rule: 'No organization can read or change another organization’s data.',
          enforcedBy: 'Membership check + tenant-scoped queries',
        },
        I5: {
          rule: 'The waitlist is first in, first out, and a newcomer never overtakes it.',
          enforcedBy: 'queued_at stamped under the lock, ordered (queued_at, id)',
        },
        I6: {
          rule: 'Every critical change leaves an audit entry written in the same transaction.',
          enforcedBy: 'Audit append inside the command',
        },
        I7: {
          rule: 'Every committed change produces exactly one notification, delivered after commit.',
          enforcedBy: 'Transactional outbox + deduplicated relay',
        },
        I8: {
          rule: 'Retries and transient failures produce clear answers that never invite endless resubmission.',
          enforcedBy: 'Problem details with retryable flag + replay header',
        },
      } as Record<string, { rule: string; enforcedBy: string }>,
    },
    anatomy: {
      mark: 'Mechanism',
      title: 'One transaction. One lock [order]. Nine steps.',
      lead: 'A modular monolith and a database that already knows how to serialize. Distributed locks, queues and sagas were considered and left out on purpose.',
      lockOrder: 'Lock order · identical in every command',
      lockOrderNote:
        'Every command takes its locks in this order, so no two commands can wait on each other in a cycle. Deadlocks are designed out instead of retried.',
      codeTitle: 'Registration, condensed',
      cta: 'Read the architecture',
      step: 'Step',
      noSql: 'Pure TypeScript, no SQL',
      steps: [
        {
          title: 'Verify the caller',
          detail:
            'Signature, issuer, audience and expiry. The actor comes from the token, never the body.',
        },
        {
          title: 'Claim the idempotency key',
          detail:
            'Insert or wait on the unique index; a committed twin is replayed instead of re-run.',
        },
        {
          title: 'Lock the inventory row',
          detail: 'SELECT … FOR UPDATE. Every command for this event now runs one at a time.',
        },
        {
          title: 'Re-read under the lock',
          detail: 'Event rules, the participant’s row and the queue length, read fresh.',
        },
        {
          title: 'Ask the domain',
          detail: 'A pure function decides: confirm, waitlist, reject or unchanged.',
        },
        {
          title: 'Write the change',
          detail: 'Registration row, counter, history entry with the request id.',
        },
        {
          title: 'Write the consequences',
          detail: 'Audit entry and outbox event, in the same transaction.',
        },
        {
          title: 'Store the answer',
          detail: 'Status and body saved on the idempotency row, then COMMIT.',
        },
        {
          title: 'Respond',
          detail: 'If the client never hears it, a retry with the same key gets this exact answer.',
        },
      ],
    },
    proof: {
      mark: 'Proof, recorded',
      title: 'Same load, same database. Exactly [ten].',
      lead: 'The Lab replays runs recorded against PostgreSQL 18 through the real API. These figures are read from those files at build time; none of them is typed in by hand.',
      stats: {
        requests: 'Concurrent requests',
        seats: 'Seats',
        confirmed: 'Confirmed',
        waitlisted: 'Waitlisted, in order',
        violations: 'Invariant violations',
      },
      recorded: (date: string, commit: string, postgres: string, cpu: string) =>
        `Recorded ${date} · commit ${commit} · ${postgres} · ${cpu}`,
      latency: (p95: number) => `caller-observed p95 ${p95} ms with all 100 queued on one row lock`,
      scenarios:
        'Eight scenarios, each tied to the test that asserts it, each with the machine, database version and commit it was measured on.',
      cta: 'Open the Reliability Lab',
      field:
        'The 100 requests in the order the database decided them. Each square lights up when its caller received the answer.',
      replay: 'Replay the run',
      confirmed: 'confirmed',
      waitlisted: 'waitlisted',
    },
    limits: {
      mark: 'Known limits',
      title: 'What this design does [not] solve.',
      lead: 'Every architecture trades something. These are the trades, named.',
      items: [
        {
          limit: 'One hot event, one lock',
          detail:
            'Commands for a single event are serialized by design. Throughput for that event is bounded by how fast one short transaction runs. It is measured and documented.',
        },
        {
          limit: 'Rate limits per process',
          detail:
            'Each API replica keeps its own counters until a shared store is configured. Good enough for a demo; a distributed abuse campaign needs more.',
        },
        {
          limit: 'The Lab is a replay',
          detail:
            'It shows runs recorded on one machine. It never sends traffic, and its timings describe that machine only.',
        },
      ],
    },
    verify: {
      mark: 'Verify it yourself',
      title: 'Don’t take the page’s [word] for it.',
      lead: 'Four commands start PostgreSQL in Docker and run every test on this page, including the naive baseline that overbooks. Nothing is mocked where a database guarantee is claimed.',
      primary: 'Open the Reliability Lab',
      secondary: 'Read the architecture',
    },
  },

  fig1: {
    seatPlan: (capacity: number) => `Seat plan · capacity ${capacity}`,
    confirmed: (capacity: number) => `/ ${capacity} confirmed`,
    seatsConfirmed: (confirmed: number, capacity: number) =>
      `${confirmed} of ${capacity} seats confirmed`,
    waitlist: 'Waitlist',
    empty: 'empty',
    waitingForLock: 'waiting for lock',
    row: 'event_inventory row',
    heldBy: (lane: string) => `· held by ${lane}`,
    free: '· free',
    statementTitle: 'Statement at this step',
    pause: 'Pause',
    runAgain: 'Run again',
    run: 'Run the sequence',
    previous: 'Previous step',
    next: 'Next step',
    steps: 'Steps',
    stepLabel: (tick: string, index: number, caption: string) =>
      `${tick}, step ${index}: ${caption}`,
    caption: 'The real algorithm, step by step. Recorded measurements live in the Lab.',
    captions: [
      'Both requests arrive within the same millisecond. Each carries its own idempotency key.',
      'A takes the inventory row lock. B reaches the same row and waits for it.',
      'Under the lock, A re-reads 23 of 24 seats and an empty queue. Decision: confirmed.',
      'A commits its seat, history, audit entry and outbox event together. The lock is released.',
      'B takes the lock and re-reads the row: 24 of 24. It ignores what it saw before.',
      'Both answers are final and both are true. If A cancels, B is promoted in the same transaction.',
    ],
  },

  lab: {
    metaDescription:
      'Recorded runs against PostgreSQL 18: the last seat, 100 people on 10 seats next to a naive baseline, retries, cancellations, capacity changes, tenant probes and a notification outage.',
    mark: 'Reliability Lab · Test report',
    title: 'Recorded runs. Every number here came from a real [database].',
    lead: 'Every number on this page was produced by pnpm lab:record against a real PostgreSQL 18 and the real API. The Lab only replays those files and never sends traffic. Each report says exactly where and how it was measured.',
    scenarios: 'Scenarios',
    holds: 'invariants hold',
    broken: 'invariants broken',
    legend:
      '✓ means every invariant check passed for EventCore in that recording. The naive baseline is shown for contrast and is expected to fail.',
    test: (order: string, date: string, commit: string) =>
      `Test ${order} · recorded ${date} · commit ${commit}`,
    question: 'Question',
    method: 'Method',
    compare: 'Compare implementations',
    holdsMark: '✓ invariants hold',
    brokenMark: '× invariants broken',
    seats: (capacity: number) => `/ ${capacity} seats`,
    result: (label: string) => `Result · ${label}`,
    checks: 'Invariant checks · computed from the final rows',
    timeline: (order: number) => `Fig. 4.${order} · every attempt, as the caller saw it`,
    timelineNote:
      'Each bar runs from the moment a request was sent to the moment its answer arrived, including time spent waiting for a pooled connection and for the inventory lock. Colour is the answer.',
    columns: {
      actor: 'Actor',
      sent: 'Sent',
      answered: 'Answered',
      answer: 'Answer',
      decision: 'DB decision',
    },
    replayed: 'replayed',
    conditions: 'Conditions',
    environment: {
      database: 'Database',
      runtime: 'Runtime',
      machine: 'Machine',
      platform: 'Platform',
      transport: 'Transport',
      pool: 'Pool',
      latency: 'Latency',
    },
    connections: (size: number) => `${size} connections`,
    doesNotProve: 'What this run does not prove',
    reproduce: 'Reproduce',
    assertion: 'The assertion behind this replay lives in',
    replay: 'Replay the run',
    scrub: 'Scrub',
    milliseconds: (value: string) => `${value} milliseconds`,
    attemptsOver: (attempts: number, span: string) =>
      `${attempts} attempts over ${span} milliseconds`,
    answeredSoFar: 'Answered so far',
    nothingYet: 'Nothing yet',
    inFlight: 'In flight',
    outcome: {
      summary: (confirmed: number, capacity: number, overbooked: number, waitlisted: number) =>
        `${confirmed} confirmed for ${capacity} seats${overbooked ? `, ${overbooked} overbooked` : ''}, ${waitlisted} waitlisted`,
      confirmed: 'Confirmed',
      overbooked: 'Overbooked',
      waitlisted: 'Waitlisted',
      capacity: 'Capacity',
    },
  },

  board: {
    metaDescription: 'Every public event with seat counts read from the database at request time.',
    mark: 'Board · live',
    title: 'Every seat count here was read from the database a moment ago.',
    lead: 'Counts are snapshots. When you reserve, the decision is taken again under the inventory lock, whatever this board said.',
    filters: { label: 'Filter events', all: 'All', open: 'Open', closed: 'Closed' },
    empty: 'No events match this filter yet.',
    left: (available: number) => `${available} left`,
    full: 'Full',
    fullWaiting: (waiting: number) => `Full · ${waiting} waiting`,
    snapshot: 'Snapshot',
  },

  event: {
    back: 'Event board',
    starts: 'Starts',
    venue: 'Venue',
    closes: 'Enrollment closes',
    waitlist: 'Waitlist',
    waitlistKept: 'Kept, first in first out',
    waitlistNone: 'None',
    capacity: 'Capacity',
    organizer: 'Organizer',
    availability: 'Availability · snapshot',
    left: (capacity: string) => `of ${capacity} left`,
    snapshotLine: (confirmed: number, waiting: number, time: string) =>
      `${confirmed} confirmed · ${waiting} waiting · read at ${time}`,
    disclaimer:
      'This number can change before you press the button. Your request is decided by the database, under a lock, whatever this page shows.',
    organizerNotice: 'You’re acting as an organizer. Switch to a participant persona to reserve.',
    closed: {
      CLOSED: 'The organizer closed enrollment. Existing seats are kept.',
      CANCELLED: 'This event was cancelled.',
      notYet: 'Enrollment hasn’t opened yet.',
      ended: 'Enrollment for this event has ended.',
    },
  },

  registration: {
    asking: 'Asking the database…',
    steps: [
      'Verified the demo token and resolved the participant',
      'Claimed the idempotency key, or found its committed twin',
      'Locked the inventory row and re-read seats, queue and your row',
      'Committed the decision with its history, audit entry and outbox event',
    ],
    headline: {
      CONFIRMED:
        'You’re confirmed. The seat is held by the database, whatever this page does next.',
      WAITLISTED: (position: string) =>
        `You’re #${position} in line. If a seat opens you’re promoted automatically, in order.`,
      REJECTED: 'Every seat is taken and this event doesn’t keep a waitlist.',
      CANCELLED: 'This registration is cancelled.',
    },
    stub: {
      CONFIRMED: 'Admit one',
      WAITLISTED: 'In line',
      REJECTED: 'Sold out',
      CANCELLED: 'Cancelled',
    },
    replayedAnswer: 'Replayed answer',
    noChange: 'No change',
    newDecision: 'New decision',
    replayedNote:
      'Same request as before, so here is the original answer. Nothing was booked twice.',
    unchangedNote:
      'You already held this registration, so the database returned it instead of creating another.',
    key: 'Idempotency key',
    decidedBy: 'Decided by request',
    answered: 'Answered request',
    after: 'Snapshot after decision',
    queue: 'queue',
    alreadyHeld: 'You already hold this registration',
    currentStatus: 'Current status',
    retrySafe: 'Retrying is safe: it reuses the same key, so it can’t book twice.',
    unavailableTitle: 'We couldn’t confirm the outcome',
    unavailable:
      'The API didn’t answer in time. Retrying is safe: the same idempotency key goes with it, so it can’t book twice.',
    personaTitle: 'Choose a demo persona first',
    persona: 'Use “Acting as” in the header. No account and no personal data.',
    closedTitle: 'Registration is not open',
    retry: 'Retry with the same key',
    askAgain: 'Ask again, it won’t duplicate',
    reserve: 'Reserve a seat',
    resend: (key: string) => `Resend the exact same request (${key}…)`,
    cancelling: 'Cancelling…',
    cancel: 'Cancel registration',
    cancelledPromoted: 'Cancelled. The next person in line was promoted in the same transaction.',
    cancelled: 'Cancelled.',
    retrySafeShort: ' Retrying is safe.',
    noAnswer: 'No answer from the API. Retrying is safe: it reuses the same key.',
  },

  mine: {
    mark: 'Participant',
    title: 'Every state you’ve been in, and why.',
    lead: 'Each registration keeps its full history. Positions in line are computed from the queue at read time, so they only ever move forward.',
    empty: 'No registrations yet.',
    find: 'Find an event',
    history: 'History',
    new: 'new',
    reasons: {
      'participant.registered': 'Registered',
      'participant.reentered': 'Registered again',
      'participant.cancelled': 'Cancelled by you',
      'organizer.cancelled': 'Cancelled by the organizer',
      'waitlist.promoted': 'Promoted from the waitlist',
      seed: 'Imported',
    } as Record<string, string>,
  },

  dashboard: {
    mark: 'Organizer',
    title: 'Only the organizations you belong to. Nothing else exists.',
    lead: 'Every request below carries your token, and the API resolves your role for the organization in the path before it reads anything.',
    role: (role: string) => `Your role · ${role}`,
    newDraft: 'New draft event',
    meter: (confirmed: number, capacity: number, waiting: number) =>
      `${confirmed}/${capacity} confirmed · ${waiting} waiting`,
    roles: { ADMIN: 'admin', ORGANIZER: 'organizer', VIEWER: 'viewer' } as Record<string, string>,
  },

  panel: {
    publicSheet: 'Public page',
    inventory: 'Inventory',
    inventoryLine: (available: number, waiting: number, time: string) =>
      `${available} available · ${waiting} waiting · read at ${time}`,
    lifecycle: 'Lifecycle',
    integrity: 'Integrity check',
    integrityItems: {
      withinCapacity: 'Within capacity',
      projection: 'Counter matches rows',
      idle: 'No idle seat while queued',
    },
    integrityUnavailable: 'Integrity report unavailable.',
    integrityLine: (counter: number, confirmed: number, waitlisted: number) =>
      `counter ${counter} · confirmed rows ${confirmed} · waitlisted rows ${waitlisted}`,
    registrations: 'Registrations',
    nobody: 'Nobody has registered yet.',
    columns: { participant: 'Participant', status: 'Status', registered: 'Registered' },
    audit: 'Audit trail · latest',
    auditAdmins: 'The audit trail is visible to admins only.',
    transitions: {
      DRAFT: 'Back to draft',
      PUBLISHED: 'Publish',
      CLOSED: 'Close enrollment',
      CANCELLED: 'Cancel event',
    },
    applying: 'Applying…',
    terminal: 'This status is terminal.',
    newCapacity: 'New capacity',
    apply: 'Apply under lock',
    locking: 'Locking row…',
    capacityHint: (confirmed: number) =>
      `Never below ${confirmed} confirmed. Raising it promotes from the waitlist in the same transaction.`,
    adminsOnly: 'Only admins can change capacity.',
    moved: (status: string) => `Moved to ${status}.`,
    capacityNow: (capacity: number, promoted: number, replayed: boolean) =>
      `Capacity is now ${capacity}.${promoted > 0 ? ` ${promoted} promoted from the waitlist in the same transaction.` : ''}${replayed ? ' (replayed)' : ''}`,
    unavailable: 'The API didn’t answer. Anything left unchanged can be retried safely.',
  },

  newEvent: {
    mark: 'Draft',
    title: 'Define the seats before anyone can take one.',
    failed: 'The draft wasn’t created',
    identity: 'Identity',
    organization: 'Organization',
    name: 'Name',
    slug: 'Slug',
    slugHint: 'Lowercase letters, digits and single hyphens. Part of the public address.',
    venue: 'Venue',
    description: 'Description',
    schedule: 'Schedule',
    opens: 'Enrollment opens',
    closes: 'Enrollment closes',
    starts: 'Event starts',
    zone: 'Times in UTC−03:00',
    seats: 'Seats',
    capacity: 'Capacity',
    capacityHint: 'Can be raised later; never lowered below confirmed seats.',
    waitlist: 'Keep a first-in-first-out waitlist when full',
    creating: 'Creating draft…',
    create: 'Create draft',
    draftNote: 'The event starts as a draft, invisible to participants.',
    invalidField: 'Check this field.',
  },

  architecture: {
    metaDescription:
      'Modules, request flow, data model, decision records and threat model of EventCore.',
    mark: 'Architecture · System',
    title: 'A modular monolith, on [purpose].',
    lead: 'The hard problem is a synchronous decision about one seat. Splitting it across services would turn one transaction into a distributed protocol. So there is one API, one database and one worker, with module boundaries visible in the code.',
    figure: 'Runtime boundaries and what crosses them.',
    flowMark: 'Request path',
    flowTitle: 'Eight steps from request to delivery.',
    flow: [
      [
        'Authenticate',
        'Verify signature, issuer, audience, expiry; resolve the user from the subject.',
      ],
      ['Authorize', 'Resolve the role for the organization in the path, or own the registration.'],
      ['Validate', 'Zod at the boundary; unknown fields dropped or refused.'],
      ['Claim key', 'Idempotency row inserted inside the transaction.'],
      ['Lock', 'event_inventory FOR UPDATE, the single serialization point.'],
      ['Decide', 'Pure domain function over freshly read state.'],
      ['Persist', 'Rows, counter, history, audit, outbox and stored answer in one COMMIT.'],
      ['Deliver', 'The worker relays the outbox after commit, at least once, deduplicated.'],
    ] as [string, string][],
    lockStep: 4,
    dataMark: 'Data model',
    dataTitle: 'The database enforces what it can. The code enforces the rest.',
    columns: { table: 'Table', constraint: 'Constraint that matters', role: 'Role' },
    tables: {
      event_inventory: 'The row every capacity decision locks.',
      registrations: 'One logical registration per participant.',
      registration_events: 'Every transition, with the request that caused it.',
      idempotency_requests: 'Stored status and body for replays.',
      audit_log: 'Who changed what, never personal data.',
      outbox_events: 'Notifications committed with the change.',
      notification_deliveries: 'Deduplicated delivery record.',
    } as Record<string, string>,
    decisionsMark: 'Decision records',
    decisionsTitle: 'Every structural choice is written down, with what it costs.',
    decisionsEmpty: 'Decision records are read from docs/adr at build time.',
    documentsNote: '',
    readingMark: 'Further reading',
    readingTitle: 'Everything else is [written down].',
    documents: {
      'docs/00-vision.md': 'Vision and invariants',
      'docs/domain-state-machine.md': 'Domain state machine',
      'docs/threat-model.md': 'Threat model',
      'DESIGN.md': 'Design system',
      'docs/experience/03-concept.md': 'Experience concept',
    } as Record<string, string>,
    diagram: {
      label:
        'Browser to Next.js server to Fastify API with eight modules to PostgreSQL; a worker reads the outbox from PostgreSQL and delivers to the demo mailbox.',
      browser: ['Browser', 'no tokens, no keys'],
      next: ['Next.js 16', 'server components · actions'],
      nextNote: 'Signs demo tokens server-side. Renders the Lab from replay files.',
      api: ['Fastify API', 'one process · modular monolith'],
      postgres: ['PostgreSQL 18', 'locks · constraints · outbox'],
      worker: ['Worker', 'relay · backoff · sweep'],
      mailbox: ['Demo mailbox', 'no real email in MVP'],
      links: {
        https: 'HTTPS · cookie',
        bearer: 'bearer JWT',
        transaction: '1 transaction',
        skipLocked: 'SKIP LOCKED',
        dedupe: 'dedupe key',
      },
    },
  },

  apiDocs: {
    metaDescription:
      'Endpoint index generated from the live OpenAPI 3.1 document of the EventCore API.',
    mark: 'API · Contract',
    title: 'Generated from the same schemas that validate requests.',
    lead: 'The API publishes OpenAPI 3.1 built from its Zod contracts, so this index cannot drift from the code. Errors are RFC 9457 problem documents with a stable code and a retryable flag.',
    example: 'One idempotent call',
    swagger: 'Open the interactive Swagger UI',
    endpoints: 'Endpoints',
    bearer: 'bearer',
    idempotent: 'idempotent',
  },

  notFound: {
    mark: '404 · Nothing at this address',
    title: 'This seat was [never] on the plan.',
    lead: 'The page may have moved, or the event may still be a draft that only its organizers can see.',
    board: 'Open the event board',
    home: 'Back to the start',
  },

  error: {
    mark: 'Unexpected failure',
    title: 'This page failed to [render].',
    lead: 'Nothing you submitted was lost: every command is idempotent, so trying again is safe.',
    reference: 'Reference',
    retry: 'Try again',
  },

  api: {
    unavailableTitle: 'The API isn’t reachable from this deployment',
    unavailableAction: 'The Lab still works',
    unavailableBody:
      'Live pages need the EventCore API. The Reliability Lab and the architecture page work without it. Locally, run pnpm db:up and pnpm dev.',
    problems: {} as Record<string, string>,
  },

  status: {
    registration: {
      CONFIRMED: 'Confirmed',
      WAITLISTED: 'Waitlisted',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
    },
    event: { DRAFT: 'Draft', PUBLISHED: 'Open', CLOSED: 'Closed', CANCELLED: 'Cancelled' },
    eventLower: {
      DRAFT: 'draft',
      PUBLISHED: 'published',
      CLOSED: 'closed',
      CANCELLED: 'cancelled',
    } as Record<string, string>,
  },

  meter: {
    summary: (confirmed: number, capacity: number, available: number, waitlisted: number) =>
      `${confirmed} of ${capacity} seats confirmed, ${available} available, ${waitlisted} waitlisted`,
  },
}

export type Dictionary = typeof en
