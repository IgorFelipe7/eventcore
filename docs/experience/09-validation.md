# 09 · Validation

Findings from reviewing the implemented web app against the brief, the concept and DESIGN.md. Each finding records where it was seen, its effect and how the fix was verified.

## Conditions

Production build (`next build` + `next start`) of `apps/web` on localhost, Chromium, API and PostgreSQL 18 running locally, 2026-10-11. No network or CPU throttling unless stated. These are lab measurements: they locate risks and do not stand for field data.

## Automated checks

| Check | Pages | Result |
|---|---|---|
| Lighthouse accessibility, mobile | `/`, `/explore`, `/lab` | 100 on all three after QA-04. |
| Lighthouse best practices and SEO, mobile | `/`, `/explore`, `/lab` | 100 on all three. |
| Performance trace, cold load of `/` | `/` | LCP 154 ms (TTFB 14 ms, render delay 139 ms), CLS 0.00. |
| axe, WCAG 2.2 AA, serious or critical | `/`, `/explore`, `/lab`, `/architecture`, event sheet | None after QA-01 to QA-03 (`tests/e2e/experience.spec.ts`). |
| Horizontal overflow at 360 px | `/`, `/explore`, `/lab`, `/architecture` | None (`tests/e2e/experience.spec.ts`). |
| Keyboard-only Fig. 1 | `/` | Steps reachable and announced (`tests/e2e/experience.spec.ts`). |
| Reduced motion | `/` | Run shows the final state without animation. |

## Findings

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

## Kept on purpose

- Every page renders on the server and reads the session cookie, so all routes are dynamic. Static rendering of the landing and Lab would be faster to serve, but the header must show who you are acting as. Revisit if the persona switch moves client-side.
- No dark theme. The concept is ink on drafting film; a second theme would double the contrast work for no gain in understanding.

## Open

- Lighthouse reports about 14 kB of legacy JavaScript transforms in the client bundle. A browserslist target for modern browsers would remove them.
- Real-device testing on iOS Safari and Android Chrome has not been done.
