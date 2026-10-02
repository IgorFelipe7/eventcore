# 04 · Structure and base copy

## Site map

| Route | Sheet | Purpose | Primary action |
|---|---|---|---|
| `/` | 01 · The last seat | Thesis, failure modes, mechanism, proof teaser, limits. | Open the Lab |
| `/explore` | 02 · Board | Every public event with live seat counts. | Open an event |
| `/events/[organization]/[event]` | 02 · Event | Details, availability snapshot, registration. | Register |
| `/me/registrations` | 03 · My registrations | Status, queue position, history, cancellation. | Cancel or open event |
| `/dashboard` | 05 · Organizer | Organizations and their events. | Open an event panel |
| `/dashboard/events/new` | 05 · New event | Create a draft with capacity and rules. | Create draft |
| `/dashboard/events/[event]` | 05 · Event panel | Inventory, lifecycle, capacity, registrations, audit, integrity. | Change capacity / status |
| `/lab` | 04 · Reliability Lab | Recorded runs as a test report. | Pick a scenario |
| `/architecture` | 06 · Architecture | Modules, data flow, ADRs, threat model. | Read an ADR |
| `/api-docs` | 06 · API | Endpoint index generated from OpenAPI. | Open Swagger UI |

## Landing sequence

Each section answers one visitor question, offers its proof and points to the next action.

| # | Visitor question | Answer | Proof | Next |
|---|---|---|---|---|
| Hero | What is this? | A reservation engine that settles the last seat exactly once. | Fig. 1, runnable. | Run the sequence · Open the Lab |
| §1 | Why should I care? | Four failures that naive systems ship by default. | Recorded baseline: N confirmations for 10 seats. | — |
| §2 | What exactly is guaranteed? | Eight invariants, each with an enforcing layer. | Test file per invariant. | — |
| §3 | How does it work? | One transaction, a fixed lock order, nine steps. | The SQL itself. | Architecture sheet |
| §4 | Does it hold under load? | Recorded runs, with conditions. | Lab numbers read from the replay files. | Open the Lab |
| §5 | What doesn't it solve? | Three honest limits. | ADR references. | — |
| End | Can I check it myself? | Four commands. | — | Title block |

## Base copy

### Hero

- **Kicker:** Sheet 01 · Reservations under contention
- **Headline:** Two requests. One seat. Exactly one confirmation.
- **Support:** EventCore is a reservation engine for events with limited seats. Every decision is serialized on a single database row, so capacity holds under concurrent load, retries never book twice and the waitlist keeps its order.
- **Primary:** Run the sequence
- **Secondary:** Open the Reliability Lab
- **Figure caption:** Fig. 1 — The real algorithm, illustrated step by step. Not a measurement: recorded runs live on Sheet 04.

### Fig. 1 steps

| t | Caption | Statement |
|---|---|---|
| t₀ | Both requests arrive within the same millisecond. | `POST /v1/events/{id}/registrations` ×2 |
| t₁ | A takes the inventory row lock. B waits for it. | `SELECT … FROM event_inventory … FOR UPDATE` |
| t₂ | A re-reads 23 of 24 seats and an empty queue: confirmed. | `UPDATE event_inventory SET confirmed_count = 24` |
| t₃ | A commits. The lock is released. | `COMMIT` |
| t₄ | B takes the lock and re-reads 24 of 24: first in line. | `INSERT INTO registrations … 'WAITLISTED'` |
| t₅ | Both answers are final and both are true. | `201 CONFIRMED` · `201 WAITLISTED #1` |

### §1 · What breaks without it

Headline: **Read, then write, is a race.** Support: Most booking bugs are not exotic. They are what happens by default when a read and a write are separated by time.

| Failure | A naive system | EventCore |
|---|---|---|
| Overbooking | Two requests read "1 seat left" and both write. | Every decision for an event waits for one row lock and re-reads under it. |
| Double effects | A double-click or a retry after a timeout books twice. | The idempotency key is committed with the effect; a retry gets the original answer. |
| False notifications | The email is sent for a transaction that rolled back, or never sent for one that committed. | The notification is written to an outbox in the same transaction and delivered after commit. |
| Cross-tenant reads | Changing an id in the URL shows another organizer's attendees. | Every organizer query is scoped by verified membership; foreign ids are simply not found. |

### §5 · Known limits

1. One very hot event serializes on one row lock. The limit is measurable and documented, not hidden.
2. Rate limits are kept per API process until a shared store is configured.
3. The Lab replays recorded runs. It does not send traffic, and its timings describe one local machine.

### Closing

Headline: **Don't take the page's word for it.** Commands: clone, install, start PostgreSQL, run the tests.

### Microcopy

| Situation | Copy |
|---|---|
| Registering | Asking the database… |
| Confirmed | You're confirmed. Seat held by the database, not by this page. |
| Waitlisted | You're #N in line. If a seat opens, you're promoted automatically, in order. |
| Sold out, no waitlist | Every seat is taken and this event doesn't keep a waitlist. |
| Replayed | Same request as before — here is the original answer. Nothing was booked twice. |
| Temporary failure | We couldn't confirm the outcome. Retrying is safe: it uses the same key, so it can't book twice. |
| API offline | The API isn't reachable from this deployment. The Lab and the architecture sheet still work. |
| Needs persona | Choose a demo persona to act as. No account, no personal data. |
