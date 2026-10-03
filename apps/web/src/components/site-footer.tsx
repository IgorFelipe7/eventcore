import Link from 'next/link'
import { publicConfig } from '@/lib/public-config'

export function SiteFooter() {
  return (
    <footer className="border-t border-ink bg-ink text-paper">
      <div className="sheet-frame grid gap-8 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-display text-2xl font-semibold">EventCore</p>
          <p className="mt-3 max-w-md text-sm text-paper/70">
            A reservation engine for events with limited seats. Every number on these sheets comes
            from the database or from a recorded run, and says which.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:col-span-4">
          <Link className="hover:underline" href="/explore">
            Event board
          </Link>
          <Link className="hover:underline" href="/lab">
            Reliability Lab
          </Link>
          <Link className="hover:underline" href="/architecture">
            Architecture
          </Link>
          <Link className="hover:underline" href="/api-docs">
            API reference
          </Link>
          <Link className="hover:underline" href="/dashboard">
            Organizer dashboard
          </Link>
          <Link className="hover:underline" href="/me/registrations">
            My registrations
          </Link>
        </nav>
        <div className="text-sm text-paper/70 md:col-span-3">
          <p>Fictional events and demo personas only.</p>
          {publicConfig.repositoryUrl ? (
            <a
              className="mt-2 inline-block underline hover:text-paper"
              href={publicConfig.repositoryUrl}
            >
              Source code
            </a>
          ) : (
            <p className="mt-2">MIT licensed.</p>
          )}
        </div>
      </div>
    </footer>
  )
}
