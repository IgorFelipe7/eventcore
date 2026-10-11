# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [0.1.0] · 2026-10-11

### Added

- Registration serialized on the inventory row lock, with a FIFO waitlist stamped under the lock.
- Idempotency keys committed with the effect; replays return the original answer.
- Cancellation and capacity changes that promote from the waitlist in the same transaction.
- Organizations, roles and tenant-scoped organizer endpoints.
- Audit trail and transactional outbox written inside every mutation; outbox relay with backoff, jitter and dead letters.
- RFC 9457 problem details, OpenAPI 3.1, Prometheus metrics, rate limits, health checks.
- Web app: Sheet 01 with the interactive last-seat figure, event board, event sheet, participant registrations, organizer dashboard, Reliability Lab, architecture and API sheets.
- Lab recorder producing eight replays from real runs against PostgreSQL 18.
- Unit, model-based property, integration, concurrency, security, resilience and end-to-end tests; CI pipeline and container images.
