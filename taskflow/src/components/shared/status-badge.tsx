import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  open:        { label: 'Aperta',   color: '#2E5BFF' },
  in_progress: { label: 'In corso', color: '#7C3AED' },
  on_hold:     { label: 'Sospesa',  color: '#9A9A9A' },
  completed:   { label: 'Conclusa', color: '#00C26E' },
} as const

type Status = keyof typeof STATUS_CONFIG

export function StatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: Status
  size?: 'sm' | 'md'
  className?: string
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  const dims = size === 'sm'
    ? { height: 20, fontSize: 10.5, paddingX: 7 }
    : { height: 22, fontSize: 11.5, paddingX: 8 }

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full whitespace-nowrap font-bold border', className)}
      style={{
        height: dims.height,
        padding: `0 ${dims.paddingX}px`,
        fontSize: dims.fontSize,
        borderColor: '#E6E5E0',
        background: '#FFFFFF',
        color: '#0A0A0A',
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}
