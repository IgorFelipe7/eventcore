# DESIGN.md — EventCore web

The executable design system for `apps/web`. It translates the concept in [`docs/experience/03-concept.md`](docs/experience/03-concept.md) ("every claim has a figure number") into rules that can be implemented and checked. Tokens live in `apps/web/src/styles/tokens.css`; this file explains them.

## 1. Concept in two applications

- **Fig. 1** on the landing sheet: a dimensioned seat plan with one free seat in the signal colour, numbered callouts and a synchronized SQL panel.
- **The Lab** as a test report sheet: conditions block, result, invariant checks, limits.

## 2. Typography

| Role | Family | Weights | Size (mobile → desktop) | Notes |
|---|---|---|---|---|
| Display | IBM Plex Sans Condensed | 600 | 40 → 88 px, line-height 0.95, tracking −0.02em | Headlines and sheet titles only. Long headlines wrap; type is never squeezed to fit. |
| Heading | IBM Plex Sans Condensed | 600 | 24 → 36 px | Section titles. |
| Body | IBM Plex Sans | 400, 500 | 16 → 18 px, line-height 1.55 | Reading width capped at 68ch. |
| Data | IBM Plex Mono | 400, 500 | 12 → 14 px | Counters, ids, SQL, timestamps. `font-variant-numeric: tabular-nums slashed-zero`. |
| Label | IBM Plex Mono | 500 | 11 → 12 px, uppercase, tracking 0.08em | Kickers, figure numbers, table headers, title block. |

Plex was chosen over the blueprint's suggested Inter/Geist because its engineering heritage carries the drawing-sheet concept and because the condensed cut gives large headlines without losing reading width at 360 px. All three are open-licensed (SIL OFL) and self-hosted by `next/font` at build time.

## 3. Colour by function

Contrast ratios measured against `--paper` and `--sheet` (WCAG 2.2, 4.5:1 minimum for text).

| Token | Value | Function | On paper | On sheet |
|---|---|---|---|---|
| `--paper` | `#ECEEEA` | Page background, a cool drafting-film grey. | — | — |
| `--sheet` | `#F7F8F5` | Raised sheets, tables, inputs. | — | — |
| `--ink` | `#0F1412` | Text, strong rules, primary button fill. | 15.9 | 17.5 |
| `--ink-2` | `#444C47` | Secondary text. | 7.6 | 8.3 |
| `--ink-3` | `#5F6762` | Tertiary text, input borders, captions. | 5.0 | 5.5 |
| `--rule` | `#C9CEC7` | Hairlines and grid only, never text. | 1.4 | 1.5 |
| `--signal` | `#2536E0` | The contested seat, the lock, focus rings, the primary action hover. Nothing else. | 6.7 | 7.3 |
| `--confirmed` | `#0B6A47` | Status: confirmed. | 5.7 | 6.2 |
| `--waitlisted` | `#8A5800` | Status: waitlisted. | 5.2 | 5.7 |
| `--rejected` | `#A42A1D` | Status: rejected, errors. | 6.1 | 6.7 |
| `--cancelled` | `#5A615C` | Status: cancelled, disabled. | 5.5 | 6.0 |

Status is never colour alone. Every status renders as glyph + word: `● Confirmed`, `◐ Waitlisted #3`, `× Rejected`, `○ Cancelled`.

## 4. Grid and space

- **Sheet:** max width 1320 px, 12 columns, gutters 24 px (16 px under 640 px), outer margins 16 / 32 / 48 px.
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px. Sections are separated by 96–128 px on desktop, 64 px on mobile.
- **Zone ruler:** the first sheet carries column numbers 1–12 along its top edge, like the zone markers of a drawing. Decorative, `aria-hidden`.
- **Registration marks:** sheets have corner crop marks drawn in `--rule`.

## 5. Imagery

There are no photographs or illustrations of people or venues. Figures are drawn from data: seat grids, timelines, latency strips, tables. Every figure has a number and a caption that says whether it is illustrative or measured.

## 6. Components and states

| Component | States | Rules |
|---|---|---|
| Button / primary | default, hover, focus-visible, pressed, pending, disabled | Ink fill, paper text; hover shifts to signal. Pending keeps the label and adds an inline progress mark; the button never changes width. |
| Button / secondary | same | 1 px ink outline. |
| Link | default, hover, focus-visible, visited | Underline offset 3 px; arrow glyph for navigation. |
| Status tag | confirmed, waitlisted, rejected, cancelled | Glyph + word + optional position. |
| Seat meter | n of capacity | Cells for capacity ≤ 60, a proportional bar above that; always with the numbers in text. |
| Receipt | success, replayed, failure | Lists the server-side steps and the request id. |
| Form field | default, focus, invalid, disabled | Persistent label above, hint below, error replaces hint with `aria-describedby`; focus moves to the first invalid field. |
| Table | default, empty, loading | Hairline rows, mono headers, right-aligned numbers. |
| Notice | info, warning, offline | Left rule in the status colour, title + one sentence + next action. |

Focus: 2 px `--signal` outline with 2 px offset on every interactive element. Hit areas are at least 44 × 44 px on touch.

## 7. Motion

| Motion | Function | Trigger | Duration | Reduced motion |
|---|---|---|---|---|
| Fig. 1 sequence | Explain lock serialization. | *Run* or step buttons. Never autoplays. | 900 ms per step, `cubic-bezier(.2,.7,.2,1)` | Final state shown, steps as an ordered list; controls still step through text. |
| Lab timeline scrub | Relate attempts to decisions over time. | Pointer, keyboard or play. | Driven by the recorded timeline, scaled to 4 s. | Static full timeline. |
| Hairline draw-in | Signal a new section. | Section enters viewport (once). | 500 ms | None. |
| Status change | Confirm that a value changed. | Data update. | 180 ms background flash. | None. |

No scroll-jacking, no parallax, no smooth-scroll library. Content is never hidden waiting for an animation.

## 8. Restrictions and why

| Avoid | Reason |
|---|---|
| Gradients, glass, glow, noise textures | They signal "template" and add nothing to a mechanism explanation. |
| More than one accent colour | The signal colour must keep meaning "the contested thing". |
| Count-up number animations | They imply live data and invite invented numbers. |
| Icons as the only label | Status and navigation must be readable as words. |
| Cards with drop shadows as the default container | Sheets and hairline tables already structure the page. |

## 9. Validation targets

- Widths: 360, 390, 768, 1280, 1440 px; 200 % zoom at 1280 px.
- Keyboard: every action reachable, visible focus, logical order, skip link.
- `prefers-reduced-motion: reduce`: all information available.
- No horizontal scroll at any target width.
- Lighthouse accessibility audit with no failing audits on `/`, `/explore` and `/lab` (recorded in `docs/experience/09-validation.md` with the conditions of the run).
