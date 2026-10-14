# 03 · Concept

## Revision B · Lights on the last seat

> **Every claim has a figure number — and the first figure is a room.**

Revision A presented the product as an engineering drawing set. Revision B keeps that set and adds the moment before it: the reader arrives at night inside a small hall, every seat taken but one, and watches two requests race for it. When the race resolves, the lights come on and the page becomes the drawing set that explains what they just saw.

### The sequence

| Beat | Scroll | What the reader sees | What it proves |
|---|---|---|---|
| Arrival | 0 % | A dark hall, 24 seats in curved rows, 23 lit dimly, one glowing ultramarine seat. HUD callouts name it: row, seat, `capacity 24 · confirmed 23`. | Scarcity is real and specific. |
| Contention | 0–35 % | Two request beams, A and B, enter from opposite aisles toward the seat. | Concurrency, made visible. |
| The lock | 35–55 % | A ring clamps the seat in A's colour; B stops short, its trail hatched: `waiting for lock`. | Serialization on one row. |
| Decision | 55–75 % | The seat fills — `A · 201 CONFIRMED`. The counter ticks to 24 / 24. | The decision is taken under the lock. |
| Queue | 75–100 % | B re-reads under the lock and drops into a queue lane: `B · 201 WAITLISTED #1`. | Fairness without a second seat. |
| Lights on | exit | The background turns from night to drafting film; the sheet bar and title block appear. | The explanation begins. |

Under `prefers-reduced-motion`, or without WebGL, the hall is drawn once in its final state with the same callouts, and the beats are listed as text.

### Rules that follow

- Night is reserved for the claim (hero) and for instruments (the Lab timeline). Everything meant to be read sits on paper.
- The signal colour still means only "the contested seat, the lock, focus". In the dark it may glow; it never decorates.
- Every 3D element has a job in the race. Nothing orbits for its own sake.
- Recorded data may move on the page; it is always labelled as a replay of a run, with the run's id.
- Tickets are the domain's object: receipts, board rows and the hero's outcome labels share their form.

### Persuasion, revisited

The principles from revision A (listed at the end of this document) stay. Revision B adds three, with the same limits:

| Principle | Use | Limit |
|---|---|---|
| Narrative transport | The hero is a scene with a beginning, a conflict and a resolution the reader drives by scrolling. | It completes in about one and a half screen heights and never traps the reader. |
| Contrast of light (figure–ground) | The dark-to-light transition marks the turn from "watch" to "understand". | Text contrast meets WCAG AA in both lights. |
| Social proof, honestly | The replayed ledger shows real recorded decisions instead of logos or user counts. | Labelled as a replay of run 02, with its commit. |

## Revision A routes, kept for the record

| Route | Status |
|---|---|
| A · Proof Sheet | Kept as the reading system of revision B. |
| B · Departure Board | Rejected again: the board stays a component, not the identity. |
| C · Lab Notebook | Rejected again. |

## Persuasion principles from revision A (still in force)

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
