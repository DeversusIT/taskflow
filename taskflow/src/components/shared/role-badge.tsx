import { Badge } from '@/components/ui/badge'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  member: 'Membro',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  super_admin: 'default',
  admin: 'default',
  editor: 'secondary',
  member: 'secondary',
  viewer: 'outline',
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={ROLE_VARIANTS[role] ?? 'outline'}>
      {ROLE_LABELS[role] ?? role}
    </Badge>
  )
}
