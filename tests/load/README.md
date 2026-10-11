# Load test · not yet run

`registration-rush.js` sends one registration per virtual user against one event, the shape of a launch-day rush. Thresholds fail the run on any unexpected status, on more than 1 % HTTP failures, or when p95 of expected responses exceeds 500 ms. Business outcomes (`201`, `200`, `409 SOLD_OUT`) are counted as expected, so a sold-out event is not reported as an outage.

**Status: prepared, not executed against a deployed environment.** No result from it appears anywhere in this repository. When it is run, record the environment (machine, network, database size and version, commit), the exact command and the k6 summary next to the numbers.

```bash
k6 run -e API_URL=http://localhost:4000 -e EVENT_ID=<uuid> -e TOKENS=<t1,t2,…> -e VUS=100 tests/load/registration-rush.js
```

Never point it at an environment you do not own or have not been authorized to load.
