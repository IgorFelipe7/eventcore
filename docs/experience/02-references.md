# 02 · References, reduced to principles

References were chosen to answer specific questions, not to be copied. Each row records the principle extracted and how it translates to EventCore.

| Question | Reference type | Principle extracted | Translation | Not copied |
|---|---|---|---|---|
| How do we make claims feel checkable? | Mechanical engineering drawings: title blocks, revision tables, zone markers, dimension lines, numbered callouts. | Annotate the object itself. Every statement is pinned to a location and a revision. | Pages are **sheets** with a title block, a revision and figure numbers. Callouts point at the exact cell, row or SQL line they describe. | Isometric illustration, blueprint-blue backgrounds, hand lettering. |
| How do we show live state at a glance? | Railway and airport departure boards. | Fixed columns, tabular figures, status as words, nothing moves unless the state changed. | The event list is a board: time, event, seats, status. Counters use tabular monospaced figures. | Split-flap animation, dark theatrical palette. |
| How do we present results without overselling? | Laboratory test reports and lab notebooks. | Hypothesis, method, conditions, result, limits — always in that order, always together. | The Lab is a **test report sheet**: question, command, environment, result, invariant checks, what the run does not prove. | Handwriting fonts, graph-paper kitsch. |
| How much decoration can data carry? | Tufte-style statistical graphics: sparklines, small multiples, high data-ink ratio. | Draw the data, not the frame around it. | Seat grids, latency strips and timelines are drawn from real recorded values. No ornamental charts. | Specific chart designs. |
| How do we explain a request/response contract? | Good API references that set request and response side by side. | Show cause and effect in the same eye span. | Fig. 1 pairs each animation step with the SQL statement that causes it; the registration receipt lists the server's steps next to the answer. | Layout, colours, code theme. |
| How do we build hierarchy with type alone? | Swiss International Style posters. | A strict grid, large condensed headlines, asymmetric white space, very few colours. | 12-column sheet grid; condensed display type; one signal colour reserved for the contested seat, focus and the primary action. | Poster compositions. |

## Conflicts resolved

- *Departure board density* versus *drawing-sheet white space*: the sheet governs page layout; board density is allowed only inside tables.
- *Lab report sobriety* versus *interactive figure*: interaction exists only where it explains a mechanism (Fig. 1, Lab timeline). Nothing animates for decoration.

## Conventions kept on purpose

A recognizable top navigation, a plain table for invariants, standard form controls with persistent labels. Familiar where the reader needs to act; distinctive where the reader needs to understand.
