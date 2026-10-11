# API contract · v1

The generated OpenAPI 3.1 document is served at `GET /openapi.json` and rendered at `/docs`. This page explains the conventions the document cannot.

## Conventions

- **Authentication.** `Authorization: Bearer <JWT>`. The actor is always the token subject; bodies never carry a user id.
- **Idempotency.** `POST /v1/events/{id}/registrations`, `POST /v1/registrations/{id}/cancel` and `POST /v1/organizations/{id}/events/{eventId}/capacity` require `Idempotency-Key` (8–128 of `A–Z a–z 0–9 - _`). Use one random key per user intent and reuse it on retries. A replay carries `Idempotent-Replayed: true` and the original body. See ADR 0003.
- **Request ids.** Send `x-request-id` to correlate; otherwise one is generated. It is returned on every response and logged as `request_id`.
- **Pagination.** Lists return `{ items, nextCursor }`. Pass `cursor=<nextCursor>`; `limit` is 1–100.
- **Snapshots.** `inventory` and `observedAt` describe the instant of the read. They are not a reservation.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/events` | public | Published and closed events, soonest first. |
| GET | `/v1/events/{eventId}` | public | One event with an inventory snapshot. |
| GET | `/v1/events/by-slug/{organizationSlug}/{eventSlug}` | public | Resolve an event from its public address. |
| POST | `/v1/events/{eventId}/registrations` | participant | Register; idempotent. `201` for a new decision, `200` when unchanged, `409 SOLD_OUT` without a waitlist. |
| GET | `/v1/me` | authenticated | The caller and their memberships. |
| GET | `/v1/me/registrations` | participant | Own registrations with queue positions and history. |
| POST | `/v1/registrations/{registrationId}/cancel` | owner or org admin | Cancel and promote the head of the queue; idempotent. |
| POST | `/v1/organizations` | authenticated | Create an organization; the caller becomes admin. |
| GET | `/v1/organizations/{id}/events` | member | Every event of the organization, drafts included. |
| POST | `/v1/organizations/{id}/events` | admin, organizer | Create a draft with capacity. |
| GET, PATCH | `/v1/organizations/{id}/events/{eventId}` | member / admin, organizer | Read or update metadata under the inventory lock. |
| POST | `/v1/organizations/{id}/events/{eventId}/status` | per transition table | Publish, close, reopen, cancel. |
| POST | `/v1/organizations/{id}/events/{eventId}/capacity` | admin | Change capacity with batched promotion; idempotent. |
| GET | `/v1/organizations/{id}/events/{eventId}/registrations` | admin, organizer | Registrations, oldest first. |
| GET | `/v1/organizations/{id}/audit` | admin | Audit trail, newest first. |
| GET | `/v1/organizations/{id}/integrity` | admin, organizer | Counter versus rows, per event. |
| GET | `/health/live`, `/health/ready`, `/metrics` | infrastructure | Operations. |

## Problem details

Every error is `application/problem+json` (RFC 9457):

```json
{
  "type": "/problems/sold-out",
  "title": "The event is sold out and has no waitlist.",
  "status": 409,
  "detail": "Every seat is taken and this event does not keep a waitlist.",
  "instance": "/v1/events/0193…/registrations",
  "code": "SOLD_OUT",
  "requestId": "4fbf8f17-…",
  "retryable": false
}
```

`retryable: true` (only `RATE_LIMITED` and `TEMPORARY_UNAVAILABLE`) means the same request, with the same idempotency key, may be sent again; `Retry-After` says when. Validation failures add `errors: [{ path, message }]`.

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | The request does not match its schema. |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | The endpoint needs an `Idempotency-Key`. |
| `UNAUTHENTICATED` | 401 | Missing or invalid token. |
| `FORBIDDEN_TENANT` | 403 | Not a member of the organization in the path. |
| `INSUFFICIENT_ROLE` | 403 | Member, but the role does not allow the action. |
| `NOT_FOUND` | 404 | Does not exist, or is not visible to the caller. |
| `EVENT_CLOSED` | 409 | Enrollment is not open. |
| `SOLD_OUT` | 409 | Full and no waitlist. |
| `CAPACITY_BELOW_CONFIRMED` | 409 | The new capacity is below confirmed seats. |
| `INVALID_EVENT_TRANSITION` | 409 | The status change is not in the transition table. |
| `SLUG_TAKEN` | 409 | The slug is already used. |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Same key, different request. |
| `INVALID_CAPACITY`, `INVALID_ENROLLMENT_WINDOW` | 422 | Domain validation failed. |
| `RATE_LIMITED` | 429 | Slow down; retryable. |
| `INTERNAL_ERROR`, `INVARIANT_VIOLATION` | 500 | Our fault; logged with the request id. |
| `TEMPORARY_UNAVAILABLE` | 503 | Dependency unavailable; retryable. |
