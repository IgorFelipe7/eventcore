# Deployment

The public demo runs on free tiers: the web app and the API as two Vercel projects, PostgreSQL on Neon. The reasoning and its limits are in [ADR 0005](adr/0005-public-demo-on-serverless.md). For containers, use the `api` and `worker` targets of [`infra/Dockerfile`](../infra/Dockerfile).

## Database

1. Create a Neon project in **AWS US East 1** with PostgreSQL 18. Keep only the Postgres service.
2. Copy the **direct** connection string (the host without `-pooler`).
3. Apply the schema and the demo data from a local checkout:

```powershell
$env:DATABASE_URL="<connection string>"; pnpm db:migrate; pnpm db:seed
```

```bash
DATABASE_URL="<connection string>" pnpm db:migrate && DATABASE_URL="<connection string>" pnpm db:seed
```

## Shared secrets

Generate two values, one for `AUTH_DEMO_SECRET` and one for `METRICS_TOKEN`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`AUTH_ISSUER`, `AUTH_AUDIENCE` and `AUTH_DEMO_SECRET` must be identical in both projects: the web app signs the demo persona tokens and the API verifies them.

## API project

Import the repository with **Root Directory** `apps/api`. `apps/api/vercel.json` sets the framework, the build command and the rewrite.

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon direct connection string |
| `DATABASE_POOL_SIZE` | `3` |
| `API_PUBLIC_ORIGIN` | `https://<api project>.vercel.app` |
| `WEB_ORIGIN` | `https://<web project>.vercel.app` |
| `TRUST_PROXY` | `true` |
| `AUTH_ISSUER` | `https://<web project>.vercel.app` |
| `AUTH_AUDIENCE` | `eventcore-api` |
| `AUTH_DEMO_SECRET` | shared secret |
| `METRICS_TOKEN` | generated token |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` |

## Web project

Import the repository with **Root Directory** `apps/web`. The Next.js preset is detected.

| Variable | Value |
|---|---|
| `EVENTCORE_API_URL` | `https://<api project>.vercel.app` |
| `NEXT_PUBLIC_API_ORIGIN` | `https://<api project>.vercel.app` |
| `NEXT_PUBLIC_REPOSITORY_URL` | the public repository URL |
| `NEXT_PUBLIC_DISPLAY_TIME_ZONE` | `America/Sao_Paulo` |
| `AUTH_ISSUER` | same as the API |
| `AUTH_AUDIENCE` | same as the API |
| `AUTH_DEMO_SECRET` | same as the API |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` |

`ENABLE_EXPERIMENTAL_COREPACK` makes Vercel install with the pnpm version pinned in `packageManager`.

## Checks after a deploy

- `https://<api project>.vercel.app/health/ready` answers `200`.
- `https://<api project>.vercel.app/docs` shows the Swagger UI.
- `https://<web project>.vercel.app/explore` lists the demo events, and a persona under **Acting as** can register for *The Last Seat*.

`NEXT_PUBLIC_*` values are inlined at build time, so changing one requires a redeploy of the web project.
