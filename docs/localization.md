# Localization

EventCore's web app ships in **English** and **Brazilian Portuguese**. English is served at the root (`/lab`); Portuguese under `/pt-br` (`/pt-br/lab`). Every route exists once and renders for both locales.

## Routing

| Piece | File | Responsibility |
|---|---|---|
| Locale table | [`apps/web/src/i18n/locales.ts`](../apps/web/src/i18n/locales.ts) | The list of locales, their URL segments and names; `localePath` builds a localized path, `splitLocale` reads one. |
| Proxy | [`apps/web/src/proxy.ts`](../apps/web/src/proxy.ts) | Strips `/pt-br` and rewrites to the shared route, sets the `x-eventcore-locale` request header (always overwritten, never trusted from the client) and records the original path for redirects. |
| Server access | [`apps/web/src/i18n/server.ts`](../apps/web/src/i18n/server.ts) | `getI18n()` returns the locale, its dictionary and an `href` helper for server components, route handlers and server actions. |
| Client access | [`apps/web/src/i18n/provider.tsx`](../apps/web/src/i18n/provider.tsx) | The root layout passes only the locale; client components read the dictionary through `useI18n()`. Dictionaries contain functions, so they are never serialized across the server/client boundary. |
| Links | [`apps/web/src/i18n/link.tsx`](../apps/web/src/i18n/link.tsx) | A drop-in `Link` that prefixes internal paths with the current locale. Hash links and external URLs pass through. |

Because the rewrite happens before routing, server actions posted from a Portuguese page also run with the Portuguese locale: redirects keep the prefix and validation messages come back translated. The language switch in the header links to the same path and query in the other locale with `hreflang`, and the layout publishes `<link rel="alternate" hreflang>` for both versions.

## Dictionaries

[`en.ts`](../apps/web/src/i18n/dictionaries/en.ts) is the source of truth. [`pt-br.ts`](../apps/web/src/i18n/dictionaries/pt-br.ts) is typed as `Dictionary = typeof en`, so a missing key, a missing function argument or an extra key fails `tsc`. Interpolated strings are functions (`seats: (value) => …`), which keeps plural rules and word order inside each language instead of in components.

Headlines mark their keyword with brackets — `'Ler e depois escrever é uma [corrida].'` — so translators move the emphasis with the word that carries it in their language.

Terms that are names of things in the code stay in English in both languages: SQL, table and column names, HTTP status codes, API result codes (`CONFIRMED`, `WAITLISTED`), `lock`, `outbox`, `idempotency key` in prose is translated as *chave de idempotência*. The Portuguese copy was written for Brazilian engineers, not machine-translated: it prefers *requisição*, *fila*, *vaga* and *retentativa*, the words used in Brazilian engineering teams.

## Recorded Lab runs

The Lab's text — titles, questions, methods, summaries, check details, actor names — is produced by `pnpm lab:record` in English and stored with the measurements. Translating the JSON files would break the next re-recording, so [`replay-text.ts`](../apps/web/src/features/lab/replay-text.ts) translates at render time with ordered pattern rules. Each rule captures the measured numbers and rebuilds the sentence around them:

```ts
[/^(\d+) confirmed for (\d+) seats?$/, (confirmed, seats) => `${confirmed} confirmadas para ${seats} vagas`]
```

Strings that are data rather than prose (participant ids, result codes such as `403 FORBIDDEN_TENANT`) pass through unchanged.

## Problems from the API

The API answers in English with RFC 9457 problem documents and a stable `code`. The web app shows a translated title for every code in `PROBLEM_CATALOG`; in Portuguese the English `detail` is omitted, and field validation messages fall back to a translated "check this field" next to the right input.

## Tests

[`apps/web/test/i18n.test.ts`](../apps/web/test/i18n.test.ts) and [`apps/web/test/replay-text.test.ts`](../apps/web/test/replay-text.test.ts) run in the `web` Vitest project:

| Test | Guards against |
|---|---|
| Same shape | A key, list entry or function present in one dictionary and not the other (checked at runtime as well as by the type). |
| No empty or copied strings | A Portuguese value left empty or pasted from English. |
| Locale paths | Prefixing of `/`, query strings and hashes; external links left alone; `/pt-brx` not mistaken for a locale. |
| Every recorded sentence translated | A new or re-worded recording sentence with no Portuguese rule. |
| Numbers preserved | A translation rule that drops or changes a measured number. |

## Adding a locale

1. Add it to `LOCALES`, `SEGMENTS` and `LOCALE_NAMES` in `locales.ts`.
2. Create its dictionary typed as `Dictionary` and register it in `dictionaries/index.ts`.
3. Add replay rules for it, or extend `localizeReplay` to fall back to English for that locale.
4. Run `pnpm vitest run --project web`.
