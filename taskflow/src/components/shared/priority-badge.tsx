import { cn } from '@/lib/utils'

const PRIORITY_CONFIG = {
  low:    { label: 'Bassa',   bg: '#E8E6DF', ink: '#1f1f1f' },
  medium: { label: 'Media',   bg: '#FFE36B', ink: '#1f1f1f' },
  high:   { label: 'Alta',    bg: '#FF8A3D', ink: '#1f1f1f' },
  urgent: { label: 'Urgente', bg: '#FF3B30', ink: '#FFFFFF' },
} as const

type Priority = keyof typeof PRIORITY_CONFIG

export function PriorityBadge({
  priority,
  size = 'md',
  className,
}: {
  priority: Priority
  size?: 'sm' | 'md'
  className?: string
}) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  const dims = size === 'sm'
    ? { height: 20, fontSize: 10.5, paddingX: 7 }
    : { height: 22, fontSize: 11.5, paddingX: 8 }

  return (
    <span
      className={cn('inline-flex items-center rounded-full whitespace-nowrap font-bold', className)}
      style={{
        height: dims.height,
        padding: `0 ${dims.paddingX}px`,
        fontSize: dims.fontSize,
        background: cfg.bg,
        color: cfg.ink,
      }}
    >
      {cfg.label}
    </span>
  )
}
