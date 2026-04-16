import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  open: { label: 'Aperta', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In corso', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  on_hold: { label: 'Sospesa', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  completed: { label: 'Conclusa', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
} as const

type Status = keyof typeof STATUS_CONFIG

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { label, className: colorClass } = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass, className)}>
      {label}
    </span>
  )
}
