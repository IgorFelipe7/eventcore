# 01R · Audit of revision A

Revision A shipped a coherent, accessible "Proof Sheet": light drafting-film paper, IBM Plex, ultramarine signal, numbered figures. It scored 100 in Lighthouse accessibility and passed axe. This audit asks a different question: **does the first screen make a demanding reviewer stop scrolling?**

## What to keep

| Asset | Why it earns its place |
|---|---|
| Every claim tied to a figure, a test and a recorded run | This is the product's argument. No reference site in the benchmark does it, and it cannot be copied without the engineering behind it. |
| The ultramarine signal reserved for the contested seat | Lusion (SOTY 2023) independently uses almost the same blue on near-white; the choice holds up next to award winners. |
| IBM Plex Mono for data, ids and SQL | Same family Lusion uses for its labels. Reads as engineering, not decoration. |
| Fig. 1 as a step-by-step SQL figure | Engineers want the statements. It moves down the page instead of being the hero. |
| The Lab as a test report | The strongest page. It gains a darker instrument panel, not a new structure. |
| Accessibility and reduced-motion guarantees | Non-negotiable; every new effect must have an equivalent static state. |

## What falls short

| Finding | Evidence from the benchmark | Effect |
|---|---|---|
| The hero is a diagram inside a box, not a world | Vercel hangs a rendered shipping container; Igloo builds a lit igloo out of blocks; Luma floats real event cards in 3D; Lusion fills a window with physical objects. | The first second reads "documentation", not "product". |
| No change of light between telling and reading | Lando Norris moves from off-white to deep olive as the story turns; Linear and Vercel stay dark for drama, then use light cards for detail. | Every section has the same temperature, so nothing feels like a climax. |
| Headlines lack tension | Linear tracks −2.2 % at 64 px, Vercel −6 %; Stripe sets the lead clause in ink and the continuation in a muted tone; Lando sets keywords in a high-contrast serif. | Plex Condensed at default tracking looks set, not designed. |
| The domain is invisible | Dice and Lando use ticket and race-card objects; Luma shows the events themselves. | Seats and tickets — the most tangible part of the product — appear only as small squares. |
| Proof is static | Stripe runs a live counter ("GDP running on Stripe: 1.73…%") as its credibility device. | Recorded decisions exist in the replay files but never move on Sheet 01. |

## Decision

Revision B keeps the argument and the system, and changes the first impression: a lit, three-dimensional seating plan at night that the reader scrolls through, and a change of light into the reading sheets. Details in `02-references.md`, `03-concept.md` and `DESIGN.md`.
