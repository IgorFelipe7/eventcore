# 03 · Concept

## Routes considered

| Route | Central idea | Why it could work | Why it was not chosen |
|---|---|---|---|
| **A · Proof Sheet** | The product is presented as an engineering drawing set. Every page is a sheet; every claim has a figure number and a reference to its evidence. | Matches the thesis exactly: credibility comes from annotated, checkable artefacts. Distinctive without being theatrical. Works in print, at 360 px and without motion. | **Chosen.** |
| B · Departure Board | A live operations board: dark, split-flap counters, constant motion. | Instantly communicates "real time". | Theatrical; dark dashboards are the default look of developer tools; motion would compete with the explanation and fail the reduced-motion test. |
| C · Lab Notebook | Handwritten annotations over graph paper. | Warm, personal, explanatory. | Reads as playful to a business owner; hand-drawn type undermines the precision the product sells. |

## The chosen idea

> **Every claim has a figure number.**

The page never says "robust" or "scalable". It shows a figure, labels it, points at the part that matters and links the test that proves it.

### Where the idea is visible

1. **Fig. 1 on the first sheet.** A seat plan with one free seat — the only coloured cell — and two requests approaching it. The reader runs the sequence; numbered callouts and the SQL panel advance together until one request is confirmed and the other is first in line.
2. **The Reliability Lab** as a test report sheet: a conditions block (machine, PostgreSQL version, commit, date), the result, the invariant checks and a "what this does not prove" note.
3. **The invariants table**, where each rule is paired with the layer that enforces it and the file that verifies it.
4. **The title block** at the end of every sheet: author, revision, sheet number. It is how the page ends, and it is a quiet signature.

### Rules that follow from the idea

- One signal colour (ultramarine) for the contested seat, the lock, focus and the primary action. Nothing else competes with it.
- Status is always text plus glyph; colour is redundant, never the only carrier.
- Numbers on the page come from the database or from recorded runs, and say which.
- Motion only explains: a request moving, a lock being held, a row changing state.

### Discarded, so it does not come back

Particle backgrounds, gradient meshes, glass panels, floating 3D devices, logo walls, testimonial carousels, "trusted by" strips, animated counters that count up to invented numbers.

## Persuasion, with limits

The page uses well-documented principles of attention and judgement, and refuses the ones that manipulate.

| Principle | Use on the page | Limit we respect |
|---|---|---|
| Problem framing / loss aversion | The first section after the hero shows what breaks without the mechanism, with a real recorded overbooking count. | The failure shown is reproduced, not dramatized. |
| Isolation (Von Restorff) | The free seat is the only coloured cell in Fig. 1. | The colour carries meaning everywhere it appears. |
| Curiosity gap and agency | Fig. 1 waits at t₀ until the reader presses *Run*; steps can be advanced one by one. | It never autoplays under reduced motion and never blocks reading. |
| Contrast and anchoring | The Lab shows the naive baseline next to the locked implementation for the same load. | Both runs are real and recorded under the same conditions. |
| Operational transparency (labour illusion) | The registration receipt lists what the server did: key claimed, lock taken, rows re-read, decision, commit. | Every step listed is a step the code performs. |
| Processing fluency | One grid, one type family, short lines, generous spacing. | — |
| Hick's law | One primary action per viewport. | — |
| Pratfall effect | A *Known limits* section names what the design does not solve. | The limits listed are the real ones from the ADRs. |
| Peak-end rule | Peak: the race resolving. End: three commands to verify everything yourself, then the title block. | — |
| Scarcity | Seat counts on event pages. | Only real counts, with their snapshot time. No timers, no "X people are viewing". |
