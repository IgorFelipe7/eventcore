export const requireDatabaseUrl = (): string => {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.')
  return url
}

export const report = (message: string): void => {
  process.stdout.write(`${message}\n`)
}
