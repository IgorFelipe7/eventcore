# DESIGN.md — EventCore web · revision B

The executable design system for `apps/web`. It implements the concept in [`docs/experience/03-concept.md`](docs/experience/03-concept.md) — *every claim has a figure number, and the first figure is a room* — on top of the benchmark in [`02-references.md`](docs/experience/02-references.md). Tokens live in `apps/web/src/styles/tokens.css`.

## 1. Two lights

| Scene | Used for | Ground | Why |
|---|---|---|---|
| **Night** | The hero hall, the Lab's measured timeline, the footer | `--night #07090C`, raised `--night-2 #0E1218` | The claim and the instruments. Glow carries meaning only in the dark (P3). |
| **Paper** | Everything meant to be read: sections, tables, forms, dashboards | `--paper #ECEEEA`, raised `--sheet #F7F8F5` | Revision A's drafting film: highest reading comfort, calm, fast. |

The hero ends by changing light: the page background interpolates from night to paper over the last 20 % of the pinned scene. Without JavaScript the hero is simply night and the next section paper.

## 2. Typography

| Role | Family | Setting | Source of the decision |
|---|---|---|---|
| Hero display | IBM Plex Sans Condensed 600 | `clamp(3rem, 1.6rem + 6vw, 8.5rem)`, line height 0.88, tracking **−0.035em** | P4: tension from tracking (Linear −2.2 %, Vercel −6 %) |
| Section display | IBM Plex Sans Condensed 600 | `clamp(1.75rem, 1.2rem + 2.2vw, 3.25rem)`, line height 0.98, tracking −0.025em | — |
| **Accent** | **Instrument Serif italic 400** | One keyword per headline, optically +6 %, never a whole line | P4: Lando's serif keywords |
| Two-tone lead | Same as display | Lead clause in ink, continuation in `--ink-3` / `--night-muted` | P4: Stripe |
| Body | IBM Plex Sans 400/500 | 16 → 18 px, line height 1.55, measure 68ch | — |
| HUD and data | IBM Plex Mono 500 | 11 px caps, tracking 0.12em on night; tabular, slashed zero | P2: Igloo's instrument labels; Lusion uses the same mono |

All four families are SIL OFL and self-hosted through `next/font`.

## 3. Colour by function

| Token | Value | Function | Contrast |
|---|---|---|---|
| `--paper` / `--sheet` | `#ECEEEA` / `#F7F8F5` | Paper grounds | — |
| `--ink`, `--ink-2`, `--ink-3` | `#0F1412`, `#444C47`, `#5F6762` | Text on paper | 15.9 / 7.6 / 5.0 on paper |
| `--night`, `--night-2` | `#07090C`, `#0E1218` | Night grounds | — |
| `--night-ink` | `#E9EDF3` | Text on night | 17.0 on night |
| `--night-muted` | `#8C95A3` | Secondary text on night | 6.6 on night |
| `--night-line` | `rgba(233,237,243,.10)` | Hairlines on night | non-text |
| `--signal` | `#2536E0` | Contested seat, lock, focus, primary hover on paper | 6.7 on paper |
| `--signal-glow` | `#6B7BFF` | The same meaning on night; text and emissive light | 5.6 on night |
| `--confirmed` / `--confirmed-glow` | `#0B6A47` / `#3DD68C` | Confirmed, on paper / on night | 5.7 / 10.6 |
| `--waitlisted` / `--waitlisted-glow` | `#8A5800` / `#F2B84B` | Waitlisted | 5.2 / 11.1 |
| `--rejected` / `--rejected-glow` | `#A42A1D` / `#FF6B5E` | Rejected, errors | 6.1 / 7.1 |

Status is never colour alone: glyph + word everywhere, including HUD callouts.

## 4. Grid, frame and marks

- Sheet: max 1320 px, 12 columns, gutters 24 px (16 px below 640 px), margins 16 / 32 / 48 px.
- **Column guides** (P7): on paper sections, 1 px `--rule-soft` verticals on the 12-column edges, behind content, `aria-hidden`.
- **Registration crosses**: `+` at the four corners of every section frame and along the hero's bottom edge.
- Zone ruler on Sheet 01 continues from revision A.

## 5. The hall (hero scene)

| Element | Specification |
|---|---|
| Seats | 24 instanced rounded boxes in four curved rows of six, on a raked floor; 23 at `--night-2` with a faint rim light, one emissive `--signal-glow`. |
| Requests | Two light beams with short trails, A from the left aisle, B from the right. A uses `--signal-glow`, B `--waitlisted-glow` while waiting. |
| Lock | A torus that closes around the seat while held. |
| Queue lane | A thin line leading out of the hall where B parks as `#1`. |
| Camera | Slight perspective from the balcony; pointer parallax ±1.5°; never moves on its own. |
| HUD | HTML callouts positioned from projected 3D coordinates every frame, with leader lines to their anchors (P2). |
| Budget | `three` loaded only by the hero, after first paint; device pixel ratio capped at 2; one draw call for the seats; paused when off-screen. |
| Fallback | A static SVG of the hall in its final state, rendered on the server, with the same callouts. Used for no-JS, no-WebGL and reduced motion. |

## 6. Components and states

Revision A's components remain. New ones:

| Component | States | Rules |
|---|---|---|
| **Ticket** | confirmed, waitlisted, rejected, replayed | Main body + stub separated by a perforated rule with semicircle notches; seat or position on the stub; the idempotency key printed like a serial number. Used by the registration receipt, board rows and hero outcomes (P6). |
| **Ledger tape** | running, paused, static | A horizontal tape of recorded decisions (`P042 · 201 · WAITLISTED #37 · 512 ms`). Pauses on hover and focus; static under reduced motion; always labelled "replay of run 02 · commit …" (P5). |
| **Callout** | default, active | Mono label, 1 px leader line, 5 px anchor dot; active callout in `--signal-glow`. |
| **Reveal heading** | hidden-before-hydration never | Server renders the final text. After hydration, lines rise 0.6em with a 60 ms stagger once, when entering the viewport. |

## 7. Motion

| Motion | Function | Trigger | Timing | Reduced motion |
|---|---|---|---|---|
| Hall scene | Show contention, lock, decision, queue | Scroll position through a sticky 240 vh section | Scrubbed, eased with a 0.6 s catch-up | Static final frame; beats as text |
| Light change | Mark the turn from watching to reading; the render dissolves into a line drawing of the same hall, projected with the same camera | Last 10 % of the hall | Scrubbed | None; hard edge |
| Ledger tape | Show recorded proof moving | Always, while visible | 60 s per loop | Static |
| Reveal heading | Pace section entries | Enter viewport, once | 700 ms, `cubic-bezier(.2,.7,.2,1)` | None |
| Fig. 1, Lab timeline, status flash | As revision A | — | — | As revision A |

Scroll is native: no scroll-jacking library and no animation library. The hall pins with `position: sticky`; its progress is read from the section's bounding box on scroll and eased toward the target every frame, which gives the scrubbed feel without taking scroll away from the reader. Scrubbed values never hide content that has no static equivalent.

## 8. Restrictions

| Avoid | Reason |
|---|---|
| Preloaders, intro gates, sound | The thesis must be readable in the first second. |
| Smooth-scroll hijacking | Native scroll keeps anchors, keyboard and assistive tech predictable. |
| Glow outside the night scene | On paper the signal is ink-flat; glow would mean nothing. |
| Gradient text, rotating words, logo walls | Consumer-marketing tells; no customers to show. |
| Animated count-ups | They imply live data. |

## 9. Validation targets

Revision A's targets stand (360–1440 px, 200 % zoom, keyboard, reduced motion, no horizontal scroll, Lighthouse accessibility without failing audits). Added: the hero must reach first contentful paint before `three` is requested, and the scene must hold 60 fps on the test machine while scrubbing.
