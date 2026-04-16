import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export type WorkspaceMembership = {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  role: 'super_admin' | 'member'
}

export type WorkspaceMember = {
  id: string
  userId: string
  role: 'super_admin' | 'member'
  joinedAt: string
  profile: {
    fullName: string
    email: string
    avatarUrl: string | null
  }
}

/** Restituisce il workspace a cui appartiene l'utente, null se non ne ha. */
export async function getUserWorkspace(userId: string): Promise<WorkspaceMembership | null> {
  const supabase = await createClient()

  // Due query separate per evitare join che possono innescare RLS circolari
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .limit(1)

  const membership = memberships?.[0] ?? null

  if (!membership) return null

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('id', membership.workspace_id)
    .maybeSingle()

  if (!workspace) return null

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    role: membership.role as 'super_admin' | 'member',
  }
}

/** Crea il primo workspace per un nuovo utente e lo imposta come super_admin. */
export async function createFirstWorkspace(userId: string, userName: string): Promise<string> {
  const supabase = createServiceClient()

  const baseName = userName || 'Il mio workspace'
  const slug =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) +
    '-' +
    Date.now().toString(36)

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name: baseName, slug, created_by: userId })
    .select('id')
    .single()

  if (error || !workspace) throw new Error(error?.message ?? 'Errore creazione workspace')

  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'super_admin',
  })

  return workspace.id
}

/** Lista tutti i membri del workspace. */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, joined_at, profiles(full_name, email, avatar_url)')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true })

  if (!data) return []

  return data.map((m) => {
    const profile = m.profiles as unknown as { full_name: string; email: string; avatar_url: string | null } | null
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role as 'super_admin' | 'member',
      joinedAt: m.joined_at,
      profile: {
        fullName: profile?.full_name ?? '',
        email: profile?.email ?? '',
        avatarUrl: profile?.avatar_url ?? null,
      },
    }
  })
}
