# 02 · References

## Revision D · component by component

Revision B's hero survived review; everything around it did not. Reviewers called the reading pages boxy, generic and dated: square ruled tables, IBM Plex everywhere, mono labels with `//` prefixes, a serif italic accent that reads as a template. Revision D keeps the hall and rebuilds every other component against the strongest dark product sites, measured the same way as before: each site opened in Chromium at 1440 × 900 on 2026-10-18 and read from computed styles, not screenshots.

### What the best dark product sites actually do

| Site | Ground | Display type (computed) | Surfaces (computed) | Radii in use | Signature |
|---|---|---|---|---|---|
| **Linear** | `#08090A` | Inter Variable 510, 64/64 px, −1.408 px; second heading in muted `#8A8F98` | `#101112` cards, 1 px `rgba(255,255,255,.08)`, radial glow `rgba(255,255,255,.04)` behind sections | 12 px (×25), 8, 16, 22 | Two-tone headings: a bright clause and a muted continuation |
| **Raycast** | `#07080A` | Inter 600, 64/70 px | Glass: `rgba(0,0,0,.44)`, `blur(2px)`, 1 px `rgba(255,255,255,.08)`, **inset `0 .5px 0 rgba(255,255,255,.3)`** top highlight; menus at `blur(36px)` | 20 px (×35), 12, 11 | The lit top edge on every surface; a coloured radial bloom at the top of cards |
| **Resend** | `#000` | Domaine serif 96 px for the hero, ABC Favorit 56 px at **−5 %** for sections | Transparent cards, 1 px `rgba(214,235,253,.19)`, radial highlight at the top edge | 24 px (×10), 16 (×33) | Large radii and a single soft highlight per card |
| **Basement** | `#000` | Geist 600, 87/78 px at **−4 %** (leading 0.9) | None: type and media only | — | Display type tight enough to read as an image |
| **Clerk** | `#F7F7F8` | Geist 700, 56/64 px at −3.5 % | White cards with layered hairline shadows | 8, 12, 16 | Product UI shown as components, not screenshots |
| **Lusion** (SOTY 2023) | `#FFF` | Aeonik 400 | Rounded viewport window around WebGL | 15 px | Pill buttons with 74 px radius |
| **Lando Norris** (SOTY 2025, from revision B) | Off-white → olive | **Mona Sans** 700 | — | — | A variable grotesque used at extreme width |

Common ground across all of them: a near-black between `#000` and `#08090A`; 1 px borders at 8–19 % white; radii of 12–24 px on cards and full capsules on buttons; display tracking between −2 % and −5 %; a muted second tone in headings; light that comes from one edge of a surface, never a full gradient fill.

### Decisions per component

| Component | Reference | Taken | Left behind |
|---|---|---|---|
| Ground and grain | Linear `#08090A`, Raycast `#07080A` | `#07090C`, the same night as the hall, plus a 4.5 % grain so large dark areas do not band | Their exact palettes |
| Display type | Basement −4 %, Resend −5 %, Lando's Mona Sans | **Mona Sans** at 112–125 % width, weight 650–700, −4.2 to −5 % tracking, leading 0.9 | Geist, Favorit, Domaine (licences or ubiquity) |
| Keyword | Linear's two-tone heading | One bracketed word per headline in the signal colour with a soft glow; the rest in ink | Serif italic accents (template tell) |
| Cards | Raycast inset highlight, Resend radius, Linear hairline | `surface`: 20 px radius, 9 % border, inset 1 px top light, faint vertical gradient, long shadow | Their colours and shadow stacks |
| Hover | Linear's cursor spotlight (studied through its imitators) | `[data-spotlight]`: one delegated pointer listener sets `--spot-x/y`; a 420 px inner glow and a masked 260 px border glow | Per-card listeners, neighbour glow |
| Header | Raycast and Linear floating navigation | Glass capsule detached from the edges, active page as a filled pill, language as a segmented control | Mega-menus |
| Buttons | Lusion and Linear capsules | Ink capsule with a signal halo; glass secondary; arrow nudge on hover | — |
| Section marks | Linear and Resend eyebrows | Pill with a glowing dot whose colour states the section's tone (red for failures, amber for limits, green for proof) | Numbered drafting markers from revision C |
| Code | Resend's code panels | Surface with a title bar and a language chip, lock clauses as signal chips, a glowing rule on highlighted lines | Window-chrome dots |
| Scrollytelling | Apple-style sticky storytelling and code walkthroughs | Nine transaction steps scroll past a sticky SQL panel that highlights the lines of the active step | Scroll hijacking |
| Proof | Stripe's live counter (revision B) | Counters that count to recorded values, and a field of the 100 recorded requests that lights in recorded order | Anything that looks live |
| Closing | Basement and Resend oversized type | A centred display heading, a typed terminal, and a 12.4 vw wordmark fading into the floor glow | — |

### Rejected in revision D

| Seen | Why not here |
|---|---|
| Lenis smooth scroll | Same reason as revision B; the hall eases its own progress. |
| Bento grids | The most repeated layout of 2024–2026 landing pages; the content here is sequential, not a catalogue. |
| Gradient text on headings | Kept only for the footer wordmark, where it is a texture rather than a message. |
| Custom cursors | Interfere with text selection and assistive technology. |

## Revision B benchmark, kept for the record

Revision B was benchmarked against three groups: Awwwards Sites of the Year, the strongest product sites in developer infrastructure, and the best-designed event platforms. Every site was opened in Chromium at 1440 × 900 on 2026-10-13; type, colour and runtime facts below were read from computed styles, loaded font faces and the DOM, not guessed from screenshots.

### Extracted design systems

| Site | Recognition | Display type (computed) | Body / labels | Ground and ink | Signature device | Runtime |
|---|---|---|---|---|---|---|
| **Lando Norris** | Awwwards SOTY 2025 | Mona Sans Variable 700, all caps, centred manifesto; keywords in **Brier**, a high-contrast serif, in lime | Mona Sans 14 px | Off-white → deep olive `#282C20` as the story turns; accent `#D2FF00` | Wireframe helmet over a portrait; topographic track lines; a "Next race" ticket card | Lenis smooth scroll, ~20 canvases |
| **Igloo Inc** | Awwwards SOTY 2024 | Logo only; all UI is small mono HUD text in the corners (`// Copyright`, `////// Manifesto`) | Mono, ~13 px | Cold grey-blue scene | A full-screen lit igloo built from blocks, annotated with crosshairs, numbers and leader lines drawn over the 3D object | Three.js, preloader, sound toggle |
| **Lusion v3** | Awwwards SOTY 2023 | Aeonik 400, 38 px headline beside the logo | Aeonik 14 px caps; **IBM Plex Mono** and a house mono for labels | Lavender-white `#F0F1FA`; objects in black, white and an ultramarine close to `#1A2BE0` | Physics-driven 3D objects inside a rounded window; `+` registration marks along the bottom edge | WebGL, 1440 × 900 canvas |
| **Messenger (abeto)** | Awwwards SOTY 2025 | Extruded block letters as a 3D object | — | Flat teal world | A tiny planet you enter with one yellow "Begin" button | Game engine in WebGL |
| **Linear** | Category reference | Inter Variable **510**, 64/64 px, tracking **−1.408 px (−2.2 %)** | Inter 15/24 px, muted `#8A8F98`; Berkeley Mono for code | `#08090A` near-black, ink `#F7F8F8`, hairlines `rgba(255,255,255,.08)` | The product UI itself as the hero, cropped at the fold | Next.js, no WebGL |
| **Vercel** | Category reference | Geist **400**, 64/64 px, tracking **−3.84 px (−6 %)** | Geist 14 px; Geist Mono | Pure black, ink `#EDEDED`, muted `#A1A1A1` | A rendered shipping container hanging from a crane hook: the metaphor as a physical object | Three.js, two canvases |
| **Stripe** | Category reference | Söhne **300**, 44/50.6 px, tracking −2 %; **lead clause in ink, continuation in a muted tone** | Söhne 300 | White; ink `#061B31`; action `#533AFD` | A live counter as proof ("GDP running on Stripe: 1.73…%"); a WebGL gradient ribbon; visible vertical column guides | Three.js |
| **PlanetScale** | Category reference | Everything in `ui-monospace` 16 px, bold for emphasis | Same | Black, ink `#E1E1E1`, link `#47B7F8`, orange actions | A brutal, document-like page: credibility through the absence of decoration | No framework, no canvas |
| **Luma** | Event-platform reference | System sans 500, 80/73.6 px, tracking −1 %; last line in a gradient; a rotating adjective | Inter 20/30 px at 50 % white | `#151515` | Real event covers floating in 3D around the centred headline | Three.js |
| **DICE** | Event-platform reference | **Foggy**, ultra-condensed, 106 px on an 88 px line (0.83), all caps | Favorit 18 px 350 | Black and white only; one yellow "Book now" | The ticket and the phone as the product | Next.js |
| **Opal** | Product storytelling reference | Die Grotesk C, centred editorial column | Die Grotesk 21 px | Black over a top-down photograph of real objects | "The table": the whole archive of products as a scene | One canvas |

### Principles extracted

Each principle is stated without the reference's colours, fonts or layout, then translated for EventCore.

| # | Principle | Seen in | Translation for EventCore | Not copied |
|---|---|---|---|---|
| P1 | **The metaphor is an object you can see, not an illustration about it.** | Vercel's container, Igloo's blocks, Luma's cards, Lusion's pieces | A lit 3D seating plan of a small hall, every seat taken except one glowing seat. The product's whole problem in one object. | Their models, scenes, materials |
| P2 | **Annotate the object like an instrument.** | Igloo's crosshairs, numbers and leader lines over 3D | HUD callouts pinned to real positions in the scene: row and seat, `event_inventory · lock`, counters. It is the Proof Sheet's callout idea at full scale. | Their HUD copy, layout |
| P3 | **Let the light change when the story changes.** | Lando (light → olive), Linear/Vercel (dark for the claim, light cards for detail) | Sheet 01 opens at night inside the venue; once the race resolves, the page "turns the lights on" into drafting-film paper for reading. | Their palette |
| P4 | **Tension in large type comes from tracking and contrast, not size alone.** | Linear −2.2 %, Vercel −6 %, Stripe's two-tone lead, Lando's serif keywords | Plex Condensed at −3.5 % and 0.9 line height; one keyword per headline in an italic high-contrast serif; lead clause in ink, continuation in a muted tone. | Brier, Söhne, Geist, Mona Sans |
| P5 | **Show proof moving.** | Stripe's live counter | A ledger tape of decisions replayed from the recorded run — labelled as a replay, never as live traffic. | The counter's metric |
| P6 | **Use the domain's own objects.** | DICE's ticket, Lando's race card, Luma's covers | Receipts and board rows become tickets: seat, stub, perforation, the idempotency key printed like a serial number. | Their card designs |
| P7 | **Frame the page with visible structure.** | Stripe's column guides, Lusion's `+` marks | Faint column guides and registration crosses on the sheets, continuing the drawing-set language. | — |
| P8 | **Restraint is a credibility device.** | PlanetScale, Linear | Effects stay in the hero and the Lab; reading sections remain quiet, mono-led and fast. | — |

### Deliberately rejected

| Seen | Why not here |
|---|---|
| Preloaders and "Begin" gates (Igloo, Messenger) | The reader must reach the thesis in seconds; the scene loads progressively behind a static frame instead. |
| Smooth-scroll hijacking (Lenis on Lando) | Native scroll is kept for accessibility, anchor links and predictable timing; pinned scenes use scroll position only. |
| Sound | No information value for this product. |
| Gradient text, rotating adjectives (Luma) | Read as consumer marketing; the audience is engineers and owners. |
| Logo walls (Vercel, Stripe, PlanetScale) | EventCore has no customers to show and will not invent any. |
