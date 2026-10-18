# 09 · Validation

Findings from reviewing the implemented web app against the brief, the concept and DESIGN.md. Each finding records where it was seen, its effect and how the fix was verified. Revision D is listed first; earlier revisions are kept below for the record.

## Revision D

### Conditions

Production build (`next build` + `next start`) of `apps/web` on localhost, Chromium 155, 1440 × 900 and 390 × 844, API and PostgreSQL 18 running locally, 2026-10-18. The same machine also ran the development server, the API and Docker, so frame-time figures are conservative. These are lab measurements, not field data.

### Automated checks

| Check | Scope | Result |
|---|---|---|
| Vitest | 20 files: domain, contracts, auth, worker, web (dictionaries, locale paths, replay translation) and the PostgreSQL integration, concurrency, security and resilience suites | 115 passed |
| Playwright | Participant journey, organizer isolation, Fig. 1 by keyboard, reduced motion, the Lab comparison | 11 passed |
| axe, WCAG 2.2 AA, serious or critical | `/`, `/explore`, `/lab`, `/architecture`, an event page | None |
| Horizontal overflow at 360 px | `/`, `/explore`, `/lab`, `/architecture` | None |
| Lighthouse, desktop | `/` | Accessibility 100 after VAL-D5 and VAL-D6, Best practices 100, SEO 100 after VAL-D7 |
| Lighthouse, desktop | Event page | Accessibility 100, Best practices 100, SEO 100 |

### Frame times

Scripted scroll from top to bottom of `/` in 12 s, recording every `requestAnimationFrame` interval.

| CPU | Frames | Average | p95 | p99 | Over 33 ms | Over 50 ms |
|---|---|---|---|---|---|---|
| Native | 1,711 | 142.6 fps (144 Hz display) | 7.0 ms | 7.3 ms | 0 | 0 |
| 4× throttled, warm | 955 | 79.6 fps | 20.9 ms | 27.8 ms | 3 | 0 |
| 4× throttled, cold first run | 680 | 56.6 fps | 27.8 ms | 48.7 ms | 23 | 6 |

The cold run's long frames clustered where components start (Fig. 1 autoplay, the mechanism walkthrough, the request field) before JIT warm-up. VAL-D8 moved the counters and the request field off React re-renders.

### Findings

| ID | Where | Finding | Severity | Fix | Verified by |
|---|---|---|---|---|---|
| VAL-D1 | Hero end | The night-to-paper cross-fade passed through grey and ended on a near-empty white page; reviewers read it as a broken screen. | Blocker | The scene stays at night; the header changes only after the hero leaves the viewport. | Visual review, desktop and mobile |
| VAL-D2 | Every page intro | Leads and headings stayed half-blurred above the fold. An `overflow: hidden` ancestor became the scroll container of `animation-timeline: view()`, so the timeline never advanced. | Blocker | `overflow: clip` everywhere content animates. | Visual check; Lighthouse contrast |
| VAL-D3 | Landing at 390 px | Page 21,105 px wide. With `overflow: clip` the marquee's flex item lost the implicit `min-width: 0` that scroll containers get. | Blocker | `min-w-0 flex-1` on the marquee track; `overflow-x: clip` on the band. | Overflow probe, e2e at 360 px |
| VAL-D4 | Lab and board at 360 px | Single-column grids grew to the widest child (a 34 rem table, long titles). | Blocker | `grid-cols-[minmax(0,1fr)]` and `min-w-0` on grid items. | e2e at 360 px |
| VAL-D5 | Mechanism walkthrough | Inactive steps dimmed with 40 % opacity fell to 1.9:1 and 2.5:1. | Improvement | Inactive steps use `--ink-3` (6.4:1) and brighten when active. | Lighthouse |
| VAL-D6 | Language switch | The accessible name "Português (Brasil)" did not contain the visible "PT". | Improvement | Visible code plus a visually hidden full name. | Lighthouse |
| VAL-D7 | `<head>` | `hreflang` alternates were relative URLs. | Improvement | `metadataBase` from the request's host and protocol. | Lighthouse SEO |
| VAL-D8 | Counters, request field | One React render per frame per counter and per field tick. | Improvement | Text written through refs; the field lights by CSS `transition-delay`. | Frame-time runs |
| VAL-D9 | Hero, lights-on phase | Changing `--lights` on the stage restyled the whole SVG drawing every frame (55–62 ms frames at 4× CPU). | Improvement | Removed with VAL-D1; light values now reach only the layers that use them. | Frame-time runs |
| VAL-D10 | Hall callouts | At 98 % lights the callout boxes still showed as pale rectangles. | Improvement | Removed with VAL-D1. | Visual check |
| VAL-D11 | Board, counters | Mona Sans's tabular figures draw a slashed zero that read as a typo at display size. | Improvement | Proportional figures for display numbers. | Visual check |

### Kept on purpose

- The axe scan runs with reduced motion: scroll-driven reveals leave text partially transparent for a moment after load, and the contrast that matters is the one a reader settles on.
- Every route remains dynamic because the header shows the acting persona.

### Open

- Real-device testing on iOS Safari and Android Chrome has not been done.
- Firefox does not yet support scroll-driven animations; it shows the static layout, which is the intended fallback, but has not been reviewed visually.

## Revision A and B

### Conditions

Production build (`next build` + `next start`) of `apps/web` on localhost, Chromium, API and PostgreSQL 18 running locally, 2026-10-11. No network or CPU throttling unless stated. These are lab measurements: they locate risks and do not stand for field data.

### Automated checks

| Check | Pages | Result |
|---|---|---|
| Lighthouse accessibility, mobile | `/`, `/explore`, `/lab` | 100 on all three after QA-04. |
| Lighthouse best practices and SEO, mobile | `/`, `/explore`, `/lab` | 100 on all three. |
| Performance trace, cold load of `/` | `/` | LCP 154 ms (TTFB 14 ms, render delay 139 ms), CLS 0.00. |
| axe, WCAG 2.2 AA, serious or critical | `/`, `/explore`, `/lab`, `/architecture`, event sheet | None after QA-01 to QA-03 (`tests/e2e/experience.spec.ts`). |
| Horizontal overflow at 360 px | `/`, `/explore`, `/lab`, `/architecture` | None (`tests/e2e/experience.spec.ts`). |
| Keyboard-only Fig. 1 | `/` | Steps reachable and announced (`tests/e2e/experience.spec.ts`). |
| Reduced motion | `/` | Run shows the final state without animation. |

### Findings

| ID | Where | Finding | Severity | Fix | Verified by |
|---|---|---|---|---|---|
| QA-01 | Sheet zone ruler, code line numbers | Decorative numbers at 2.8:1 contrast. | Improvement | Full `--ink-3` (5.0:1). | axe re-run |
| QA-02 | Code blocks | Horizontally scrollable `pre` not reachable by keyboard. | Blocker | `tabindex="0"` and an accessible name when scrollable; wrapping where the statement is the point. | axe re-run |
| QA-03 | Lab tally | Definition list contained a stray term without a definition. | Improvement | Heading moved out of the list. | axe re-run |
| QA-04 | Fig. 1 step buttons | Visible label "0" not contained in the accessible name. | Improvement | Visible label `t₀`, name `t₀, step 0: …`. | Lighthouse re-run |
| QA-05 | Fig. 1, `t₁` | The decisive `FOR UPDATE` was cut off by horizontal scroll. | Blocker | Statement wraps inside the figure. | Visual check at 1440 and 390 px |
| QA-06 | Lab, naive baseline | Confirmed attempts drawn in the success colour although most of those seats do not exist. | Blocker (misleading) | Unsafe variant draws confirmations as failures and says how many seats are fictional. | Visual check |
| QA-07 | My registrations | The cancellation confirmation disappeared together with the button after refresh. | Blocker | Form stays mounted; only the button depends on status. | `tests/e2e/participant-flow.spec.ts` |
| QA-08 | Status tags | "Waitlisted#1" read without a space by assistive technology. | Improvement | Real space in the text. | E2E text assertion |
| QA-09 | Hero | Headline wrapped to five lines in five columns at 1440 px. | Improvement | Hero scale reduced to `clamp(2.5rem, …, 4.75rem)`. | Visual check |

### Kept on purpose

- Every page renders on the server and reads the session cookie, so all routes are dynamic. Static rendering of the landing and Lab would be faster to serve, but the header must show who you are acting as. Revisit if the persona switch moves client-side.

### Open

- Lighthouse reports about 14 kB of legacy JavaScript transforms in the client bundle. A browserslist target for modern browsers would remove them.
- Real-device testing on iOS Safari and Android Chrome has not been done.
