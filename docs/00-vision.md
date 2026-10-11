# 00 · Vision

## One sentence

EventCore is a reservation platform for capacity-limited events that keeps its promises under concurrent pressure: it never sells a seat twice, never applies a retried request twice, never lets one organization see another's data, and lets anyone verify those claims by reading and running the tests.

## The problem

Ordinary booking systems tend to fail in the same few places:

| Failure | What actually happens | Who pays |
|---|---|---|
| **Overbooking** | Two requests read "1 seat left", both write. The event now has `capacity + 1` attendees. | The organizer, at the door. |
| **Duplicate effects** | A double-click or a client retry after a timeout creates a second registration, a second email, a second charge. | The participant, and support. |
| **Inconsistent notifications** | The email is sent but the transaction rolls back, or the transaction commits but the email is lost. | Everyone's trust. |
| **Tenant leakage** | An organizer changes an ID in the URL and reads another organization's attendee list. | The company, legally. |

None of these are exotic. They are what happens by default when a read and a write are separated by time.

## The hypothesis

A **modular monolith** backed by **correct PostgreSQL transactions**, **scoped idempotency keys** and **strict server-side authorization** solves this problem more simply, more auditably and more reliably than premature microservices.

This is a hypothesis, not a result. The project exists to test it in the open.

## What makes it different

Not the number of features. The differentiator is that every business rule is stated as an **invariant**, every invariant is enforced at the layer that can actually guarantee it, and every guarantee is backed by a test that runs against a real database.

## Personas

| Persona | Wants | Fears |
|---|---|---|
| **Participant** | Find an event, see honest availability, reserve, check status. | Being charged or registered twice; being told "confirmed" when it isn't. |
| **Organizer** | Create events, manage capacity, follow registrations, audit changes. | Overbooking; a colleague's change with no trace; data from the wrong org. |
| **Technical reviewer** | Understand the decisions in 60 seconds, verify them in 5 minutes. | Marketing claims with no evidence behind them. |

## Verifiable objectives

These are targets the code must satisfy, not achieved metrics.

| ID | Invariant |
|---|---|
| **I1** | `0 <= confirmed_count <= capacity` after every committed transaction. |
| **I2** | A participant has at most one logical registration per event. Re-entries are transitions of the same row, recorded in history. |
| **I3** | The same actor + action + scope + key with the same payload hash produces no new effect. Same key with a different payload is a conflict. |
| **I4** | Data from one organization is neither visible nor editable by members of another. |
| **I5** | The waitlist has a deterministic arrival order and a new registration never overtakes an active queue. |
| **I6** | Critical mutations write an audit entry in the same transaction. |
| **I7** | A committed mutation produces a transactional outbox event; external delivery is asynchronous, retried and deduplicated. |
| **I8** | Repeated requests and transient failures produce clear messages that never push the participant into retrying indefinitely. |

## Scope of the MVP

**In:** authentication through a token verifier, organizations and membership, events with capacity, registrations, waitlist, cancellation and promotion, capacity changes, audit trail, outbox with a demo mail sink, documented API, integration and concurrency tests against real PostgreSQL, and the Reliability Lab in replay mode.

**Out:** payments, invoicing, ticket tiers, QR codes, resale, chat, Kubernetes, distributed queues, microservices. Each of these needs its own requirements and none of them helps prove the hypothesis.

## Definition of done for the vision

Another engineer can explain how EventCore prevents overbooking, duplicate effects and tenant leakage **before reading any code**, using only this folder.
