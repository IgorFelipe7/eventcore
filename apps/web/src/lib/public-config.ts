export const publicConfig = {
  repositoryUrl: process.env.NEXT_PUBLIC_REPOSITORY_URL ?? null,
  apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000',
  displayTimeZone: process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE ?? 'America/Sao_Paulo',
} as const

export const repositoryLink = (path: string): string | null =>
  publicConfig.repositoryUrl
    ? `${publicConfig.repositoryUrl.replace(/\/$/, '')}/blob/main/${path}`
    : null
