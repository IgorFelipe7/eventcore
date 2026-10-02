# 01 · Briefing — the web experience

## Who the page is for

| Reader | Arrives with | Must leave with | Time budget |
|---|---|---|---|
| **Technical reviewer** (staff engineer, hiring manager) | Skepticism. Has seen a hundred "scalable" portfolio projects. | The thesis, the mechanism and a test they can run. | 60 s to the thesis, 5 min to verification. |
| **Business owner / CTO** | A product question: "would this hold on launch day?" | Confidence that the failure modes they fear were designed for, and honesty about limits. | 90 s. |
| **Participant / organizer** (demo personas) | A task: reserve a seat, manage an event. | The task done, with an unambiguous status. | As long as the task takes. |

## The one action

**Open the Reliability Lab** and watch a recorded race for the last seat resolve correctly. Everything on the landing page either sets up that action or follows from it.

Secondary actions, in order: read the test that proves a claim; try the flow as a demo participant; read the architecture sheet.

## What the reader must believe

1. Overbooking and double effects are real failures with real costs, not hypotheticals.
2. EventCore prevents them with a mechanism simple enough to explain on one sheet.
3. Every claim on the page is backed by something they can open: a test, an ADR, a recorded run.

## Proof we actually have

| Proof | Where | Can be shown publicly |
|---|---|---|
| A naive implementation overbooking against real PostgreSQL | `tests/concurrency/naive-baseline.test.ts` and the Lab baseline replay | Yes |
| Last-seat, 100-on-10, FIFO and capacity races passing | `tests/concurrency/*` | Yes |
| Idempotency, outbox, tenant isolation tests | `tests/http`, `tests/resilience`, `tests/security` | Yes |
| Recorded runs with environment, commit and timings | `apps/web/src/lab/replays/*.json` | Yes, labelled as local measurements |
| ADRs and threat model | `docs/` | Yes |

## What we will not show

No testimonials, logos, user counts, uptime numbers or throughput claims. No metric that was not measured, and no measurement without its conditions next to it. No countdown timers or fake scarcity: the only scarcity on the page is the domain itself, and every seat count shown comes from the database.

## Tone

Precise, calm, specific. The page reads like a good engineering document that happens to be beautiful: short declarative sentences, numbers with units, no superlatives, no exclamation marks.

## Constraints

- Works without JavaScript for reading; interactive figures degrade to a numbered static sequence.
- Works with `prefers-reduced-motion`, keyboard only, 200 % zoom and a 360 px viewport.
- The landing, the Lab and the architecture sheet render without the API running; product pages explain clearly when the API is unreachable.
- Fonts and assets are self-hosted at build time; no third-party trackers.
