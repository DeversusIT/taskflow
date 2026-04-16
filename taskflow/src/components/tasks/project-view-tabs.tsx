'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { List, Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProjectViewTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`
  const tabs = [
    { href: base, label: 'Lista', icon: List, exact: true },
    { href: `${base}/kanban`, label: 'Kanban', icon: Columns3, exact: false },
  ]

  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors -mb-px',
              active
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
