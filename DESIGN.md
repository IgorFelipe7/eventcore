# DESIGN.md — EventCore web · revision D

The executable design system for `apps/web`. Tokens live in [`apps/web/src/styles/tokens.css`](apps/web/src/styles/tokens.css), utilities and motion in [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css). The research behind every decision is in [`docs/experience/02-references.md`](docs/experience/02-references.md); the concept and its history are in [`docs/experience/03-concept.md`](docs/experience/03-concept.md).

> **One room, lit by its own evidence.** The whole product lives in the light of the hall where the race for the last seat happens. Surfaces are glass in that room, the signal colour is the glow of the contested seat, and nothing moves unless it shows a recorded fact.

## 1. Principles

| # | Principle | Consequence in the interface |
|---|---|---|
| D1 | **Continuity of light.** The reader never leaves the hall. | One dark theme for every page. The hero, the Lab and the dashboard share ground, glass and glow. |
| D2 | **The keyword glows, nothing else does.** | Each headline has at most one bracketed keyword rendered in the signal colour with a soft glow. Glow elsewhere is reserved for state: the contested seat, a held lock, a confirmed or waitlisted answer. |
| D3 | **Rounded, never boxy.** | Every container is a surface with a 20 px radius and a lit top edge; data rows are pills; buttons are capsules. No ruled tables where a card reads better. |
| D4 | **Type carries the tension.** | Mona Sans at expanded width and heavy weight for display, with −4 to −5 % tracking. Body stays at normal width. Mono only for data, SQL and labels. |
| D5 | **Motion is evidence.** | Every animation replays a recorded or real step: the race, the lock, the 100 decisions, the SQL statement of the current step. Decorative motion is limited to entrance reveals. |
| D6 | **Fast on a slow laptop.** | Scroll-driven CSS for reveals, rAF and direct DOM writes for counters, idle throttling and adaptive resolution for WebGL. Measured, not assumed (section 9). |

## 2. Colour

All values are tokens on `@theme`, so every Tailwind utility (`bg-paper`, `text-ink-2`, `border-rule`, …) resolves to them. Contrast ratios are measured against the page ground `#07090C` and the raised surface `#0D1117`.

| Token | Value | Role | On ground | On surface |
|---|---|---|---|---|
| `--color-paper` | `#07090C` | Page ground, shared with the 3D hall | — | — |
| `--color-sheet` | `#0D1117` | Raised surface, ticket body | — | — |
| `--color-ink` | `#EEF1F6` | Headlines, primary text, primary button | 17.6 | 16.7 |
| `--color-ink-2` | `#B4BCC8` | Body copy, leads | 10.4 | 9.9 |
| `--color-ink-3` | `#8A93A1` | Labels, metadata, inactive steps | 6.4 | 6.1 |
| `--color-signal` | `#7D8BFF` | Keyword, contested seat, held lock, focus ring | 6.7 | 6.3 |
| `--color-confirmed` | `#3DD68C` | Confirmed answers and passing checks | 10.6 | 10.1 |
| `--color-waitlisted` | `#F2B84B` | Waitlisted answers, queue | 11.1 | 10.6 |
| `--color-rejected` | `#FF6B5E` | Rejections, broken invariants, the naive baseline | 7.1 | 6.8 |
| `--color-cancelled` | `#7D8696` | Cancelled and disabled | 5.4 | 5.2 |
| `--color-rule` | `rgb(238 241 246 / .09)` | Hairlines and surface borders | non-text | non-text |
| `--color-*-wash` | tone at 12 % | Tinted backgrounds behind a tone | non-text | non-text |

Status is never colour alone: every state also has a glyph (`●`, `◐`, `×`, `○`, `✓`) and a word.

## 3. Typography

| Role | Family | Setting | Token / utility |
|---|---|---|---|
| Hero | Mona Sans, variable `wdth` | `clamp(3rem, 1.2rem + 6.2vw, 7.75rem)`, weight 650, width 112 %, leading 0.90, tracking −0.05em | `text-hero` |
| Page display | Mona Sans | `clamp(2.75rem, 1.5rem + 5vw, 6.25rem)`, leading 0.92, tracking −0.045em | `text-display` |
| Section heading | Mona Sans | `clamp(2.25rem, 1.35rem + 3.4vw, 4.75rem)`, leading 0.95, tracking −0.042em | `text-heading` |
| Numbers | Mona Sans at 125 % width, weight 700, proportional figures | 3–9 rem depending on context | `wide` |
| Body | Mona Sans at 100 % width | 16–18 px, leading 1.6, `text-wrap: pretty` | default |
| Data, SQL, labels | Geist Mono 500 | 11 px uppercase at 0.06em for labels; 13 px for code | `label`, `font-mono` |

Both families are SIL OFL and self-hosted by `next/font`. Mona Sans's tabular figures draw a slashed zero, so display numbers use proportional figures and only tabular data keeps `tabular`.

Headlines are written in the dictionaries with one bracketed keyword (`'Read, then write, is a [race].'`). [`Marked`](apps/web/src/components/headline.tsx) splits the text into words, numbers each word for the staggered reveal and renders the bracketed one as `.keyword`.

## 4. Surfaces and layout

| Utility | Recipe | Used for |
|---|---|---|
| `surface` | 1 px `--color-rule` border, 20 px radius, a 4 → 1.2 % white vertical gradient, inset top highlight, long soft drop shadow | Cards, panels, figures, code blocks, the terminal |
| `surface-quiet` | 5 % border, 1.8 % fill | Secondary facts, accordions |
| `glass` | 62 % surface fill, `backdrop-filter: blur(18px) saturate(140%)`, inset highlight | The floating header and the persona menu |
| `[data-spotlight]` | A 420 px radial glow and a 260 px masked border glow that follow the cursor, faded in on hover and focus | Every interactive card |
| `eyebrow` | Pill with a glowing dot (`--eyebrow-dot`) and a mono label | Section marks |
| `field` | 14 px radius, focus ring of 4 px signal wash | Inputs, selects, textareas |

The page frame is `sheet-frame`: max 1320 px, margins 20 / 32 / 48 px. Grids are 12 columns with 24 px gutters; every single-column grid that can hold wide content is `grid-cols-[minmax(0,1fr)]`, and flex children that scroll get `min-w-0` (section 10, VAL-D3).

A fixed grain layer (an inline SVG `feTurbulence`, 4.5 % opacity) sits above everything to keep large dark areas from banding.

## 5. Components

| Component | File | States and behaviour |
|---|---|---|
| Header | `components/site-header.tsx` | Floating glass capsule, active page as a filled pill, language switch as a segmented control that keeps the current path, persona menu as a glass popover. A second capsule holds the navigation on small screens. |
| Section heading | `components/section-heading.tsx` | Eyebrow, word-staggered headline, lead. `align`, `size` and `dot` props; `PageIntro` adds an ambient signal glow behind a page's first heading. |
| Button | `components/button.tsx` | Primary: ink capsule with a signal halo that strengthens on hover. Secondary: glass capsule. The arrow slides 4 px on hover. Press scales to 98 %. |
| Ticket | `components/ticket.tsx` | Dark body, dashed perforation, notched stub in the outcome's tone with a moving sheen; the idempotency key printed as the serial. |
| Notice | `components/notice.tsx` | Surface with a glowing tone bar on the left edge. |
| Status tag | `components/status-tag.tsx` | Pill with glyph and word in the state's tone. |
| Seat meter | `components/seat-meter.tsx` | Rounded cells up to 60 seats, the last free seat glowing; a gradient bar above that. |
| Code block | `components/code-block.tsx` | Surface with a title bar and a language chip; SQL keywords, parameters and literals coloured; lock clauses marked as signal chips; highlighted lines get a glowing left rule. Highlighting is memoised per code string. |
| Count-up | `components/count-up.tsx` | Server-renders the final value. When it starts below the fold and motion is allowed, counts from zero with a quartic ease, writing text directly. |
| Hall | `features/landing/hall/*` | See section 6. |
| Fig. 1 | `features/landing/last-seat-figure.tsx` | Seat plan, two request pills, the lock area that glows while held, the statement of the step. Autoplays once when 55 % visible; stepper and keyboard control stay. |
| Mechanism walkthrough | `features/landing/anatomy-scroller.tsx` | Nine steps scroll past a sticky panel; the step nearest the viewport centre lights its node and highlights its SQL lines; a chip says when a step has no SQL. |
| Request field | `features/landing/request-field.tsx` | The 100 recorded requests in decision order. Each cell lights at the moment its caller received the answer, driven by CSS transition delays; counters and the clock update through refs. |
| Terminal | `features/landing/terminal.tsx` | Types the four verification commands once when scrolled into view; the full text is always in an `sr-only` copy. |
| Replay tape | `features/landing/ledger-tape.tsx` | Marquee of the first 40 recorded decisions as pills; pauses on hover, static under reduced motion. |

## 6. The hall

| Element | Specification |
|---|---|
| Rendering | Hidden-line model: seat fills in `#0D1219` with polygon offset, edges as one merged `LineSegments` batch, the contested seat as an emissive solid with bright edges. |
| Lock | A CAD selection box — 24 corner ticks — that closes from 1.9× around the seat while the lock is held, in the holder's colour. |
| Requests | Two glowing heads with a camera-facing halo ring and a 48-point additive trail. |
| Pipeline | Multisampled half-float render target, Unreal bloom (strength 0.9, threshold 0.5), ACES tone mapping. |
| Camera | Two rigs from shared geometry: a landscape rig that leaves the lower left for the headline and a portrait rig that fills the middle of a phone. Pointer parallax ±0.45 units. |
| Story | Arrival → contention → lock → decision → queue over a 230 vh sticky section; the scene stays at night and hands over to the replay tape. |
| Budget | `three` is imported after first paint; pixel ratio capped at 1.75 and lowered in 0.25 steps when more than 24 of 40 frames exceed 24 ms; when nothing moves the loop renders at 15 fps; the loop stops off screen. |
| Fallback | Without WebGL 2 or under reduced motion a server-rendered SVG of the same projection shows the final state with the same callouts. |

## 7. Motion

| Motion | Mechanism | Range or timing | Reduced motion |
|---|---|---|---|
| Headline words | `animation-timeline: view()` on each `.word` | `entry 5 % + 1.5 % × i` → `cover 28 % + 1.5 % × i`, blur 8 px → 0, rise 0.6 em | Static |
| Blocks (`rise-in`, `scale-in`) | View timeline | `entry 0 %` → `cover 24–30 %` | Static |
| Hall | Scroll progress eased per frame | 230 vh | Static poster |
| Counters, field, terminal, Fig. 1 | IntersectionObserver, once | 1.4 s, 2.6 s, 22 ms per character, 1.7 s per step | Final state |
| Hover | CSS transitions | 200–500 ms, `--ease-out-expo` | Instant |

Scroll-driven reveals only run where `animation-timeline` is supported; elsewhere content is simply visible. Ancestors of animated elements use `overflow: clip`, never `overflow: hidden`, because a hidden-overflow box becomes the scroll container of the view timeline and freezes the reveal (section 10, VAL-D2).

## 8. Localization in the interface

Every visible string comes from the typed dictionaries described in [`docs/localization.md`](docs/localization.md). Portuguese copy is on average 18 % longer; headings therefore wrap by `text-wrap: balance` rather than fixed line breaks, and no component sets a width from English text.

## 9. Performance budget

| Measure | Target | Measured (production build, 1440 × 900, Chromium) |
|---|---|---|
| Full landing scroll, 12 s | No frame over 33 ms at native CPU | 142.6 fps on a 144 Hz display, p99 7.3 ms, 0 frames over 33 ms |
| Same with 4× CPU throttling | p99 under 33 ms | Warm: 79.6 fps, p95 20.9 ms, p99 27.8 ms, 0 frames over 50 ms. Cold first run: p99 48.7 ms |
| Hero only, 4× CPU | No sustained drops | 123 fps average, 8 frames over 33 ms in 741, all during the paper cross-fade that revision D removed |

## 10. Restrictions

| Avoid | Reason |
|---|---|
| Serif italic accents, gradient headline text, "///" or "//" decorations | Recognisable template tells; they read as generated, not designed. |
| Three-dot window chrome on code | Same reason; the language chip carries the information. |
| `overflow: hidden` around animated content | Breaks view timelines (VAL-D2). Use `overflow: clip`. |
| Count-ups of figures that are not recorded | The animation implies the number was measured. |
| Smooth-scroll libraries | Native scroll keeps anchors, keyboard and assistive technology predictable; the scrubbed feel comes from easing the hall, not the page. |
