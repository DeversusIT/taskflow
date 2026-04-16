import { cn } from '@/lib/utils'

const PRIORITY_CONFIG = {
  low: { label: 'Bassa', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  medium: { label: 'Media', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
} as const

type Priority = keyof typeof PRIORITY_CONFIG

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { label, className: colorClass } = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass, className)}>
      {label}
    </span>
  )
}
