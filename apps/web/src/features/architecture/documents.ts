import 'server-only'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { marked } from 'marked'

const DOCS_ROOT = path.resolve(process.cwd(), '../../docs')

export interface Decision {
  readonly number: string
  readonly title: string
  readonly status: string
  readonly date: string
  readonly path: string
  readonly html: string
}

const field = (markdown: string, name: string) =>
  new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`).exec(markdown)?.[1]?.trim() ?? ''

export const loadDecisions = async (): Promise<Decision[]> => {
  try {
    const directory = path.join(DOCS_ROOT, 'adr')
    const files = (await readdir(directory)).filter((file) => /^\d{4}-.+\.md$/.test(file)).sort()
    return await Promise.all(
      files.map(async (file) => {
        const markdown = await readFile(path.join(directory, file), 'utf8')
        const heading = /^# ADR (\d{4}) · (.+)$/m.exec(markdown)
        const body = markdown.replace(/^# .+$/m, '').replace(/^- \*\*(Status|Date):\*\*.+$/gm, '')
        return {
          number: heading?.[1] ?? file.slice(0, 4),
          title: heading?.[2] ?? file,
          status: field(markdown, 'Status'),
          date: field(markdown, 'Date'),
          path: `docs/adr/${file}`,
          html: await marked.parse(body, { gfm: true }),
        }
      }),
    )
  } catch {
    return []
  }
}
