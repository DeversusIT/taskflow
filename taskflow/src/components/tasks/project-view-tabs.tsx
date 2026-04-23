'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { List, Columns3 } from 'lucide-react'

export function ProjectViewTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`
  const tabs = [
    { href: base, label: 'Lista', icon: List, exact: true },
    { href: `${base}/kanban`, label: 'Kanban', icon: Columns3, exact: false },
  ]

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: 'var(--tf-hover)',
        borderRadius: 10,
        gap: 2,
      }}
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 700,
              background: active ? 'var(--tf-panel)' : 'transparent',
              color: active ? 'var(--tf-ink)' : 'var(--tf-muted)',
              boxShadow: active ? 'var(--tf-shadow-1)' : 'none',
              transition: 'all 160ms var(--tf-ease)',
              textDecoration: 'none',
            }}
          >
            <Icon style={{ width: 13, height: 13 }} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
