# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Serverless entry for the API and a Vercel configuration for the public demo, with the deployment guide and ADR 0005.
- One-shot worker run (`pnpm --filter @eventcore/worker once`) and a scheduled workflow that drains the demo outbox and sweeps invariants.

### Fixed

- The API loads `content-disposition` as CommonJS, which Vercel's function loader requires.
- A connection closed by the server while idle in the pool, as on shutdown or when Neon suspends its compute, is logged instead of crashing the process.

## [0.2.0] · 2026-10-18

### Added

- Brazilian Portuguese for every page under `/pt-br`, with typed dictionaries, translated API problems and pattern-based translation of recorded Lab runs.
- The landing opens inside a three.js hall where two requests race for the last seat; a server-rendered poster covers no-WebGL and reduced motion.
- Mechanism walkthrough that highlights the SQL of each transaction step, a field of the 100 recorded requests, recorded counters and a typed terminal.
- Registration receipts issued as tickets.

### Changed

- One dark design system for every page: Mona Sans and Geist Mono, glass surfaces with a cursor spotlight, scroll-driven reveals.
- The drafting-sheet furniture (sheet bars, title blocks, registration marks) is gone.

### Fixed

- Reveals frozen by `overflow: hidden` ancestors, horizontal overflow at 360 px, contrast of inactive steps, relative `hreflang` alternates.

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
