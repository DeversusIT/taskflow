import { createClient } from '@/lib/supabase/server'

interface PermissionGateProps {
  workspaceId: string
  allowedRoles: ('super_admin' | 'member')[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/** Server component: mostra children solo se l'utente ha uno dei ruoli richiesti. */
export async function PermissionGate({
  workspaceId,
  allowedRoles,
  children,
  fallback = null,
}: PermissionGateProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <>{fallback}</>

  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!data || !allowedRoles.includes(data.role as 'super_admin' | 'member')) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
