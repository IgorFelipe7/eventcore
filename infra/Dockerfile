FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @eventcore/api --filter @eventcore/worker build
RUN pnpm --filter @eventcore/api deploy --prod --legacy /out/api && cp -r apps/api/dist /out/api/dist
RUN pnpm --filter @eventcore/worker deploy --prod --legacy /out/worker && cp -r apps/worker/dist /out/worker/dist

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S eventcore && adduser -S eventcore -G eventcore
USER eventcore

FROM runtime AS api
COPY --from=build --chown=eventcore:eventcore /out/api ./
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
CMD ["node", "dist/server.js"]

FROM runtime AS worker
COPY --from=build --chown=eventcore:eventcore /out/worker ./
CMD ["node", "dist/main.js"]
