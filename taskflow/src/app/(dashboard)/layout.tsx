import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserWorkspace, createFirstWorkspace } from '@/lib/queries/workspace'
import { getWorkspaceProjects } from '@/lib/queries/projects'
import { WorkspaceProvider } from '@/lib/context/workspace-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let workspace = await getUserWorkspace(user.id)

  if (!workspace) {
    const pendingWorkspaceId = user.user_metadata?.pending_workspace_id as string | undefined
    const pendingRole = ((user.user_metadata?.pending_role as string | undefined) ?? 'member') as
      | 'super_admin'
      | 'member'

    if (pendingWorkspaceId) {
      const serviceClient = createServiceClient()
      await serviceClient.from('workspace_members').insert({
        workspace_id: pendingWorkspaceId,
        user_id: user.id,
        role: pendingRole,
      })
      await supabase.auth.updateUser({
        data: { pending_workspace_id: null, pending_role: null },
      })
      workspace = await getUserWorkspace(user.id)
    }

    if (!workspace) {
      const profile = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

      const name = profile.data?.full_name || user.email?.split('@')[0] || 'Il mio workspace'
      try {
        await createFirstWorkspace(user.id, name)
      } catch (e) {
        console.error('[layout] createFirstWorkspace error:', e)
      }
      workspace = await getUserWorkspace(user.id)
    }
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Errore nel caricamento del workspace.</p>
      </div>
    )
  }

  const [{ data: profile }, projects] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getWorkspaceProjects(workspace.workspaceId),
  ])

  return (
    <WorkspaceProvider value={{ workspaceId: workspace.workspaceId, workspaceName: workspace.workspaceName, workspaceSlug: workspace.workspaceSlug, userRole: workspace.role }}>
      <div className="flex h-full">
        <Sidebar projects={projects} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header userEmail={user.email ?? ''} userName={profile?.full_name ?? ''} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
