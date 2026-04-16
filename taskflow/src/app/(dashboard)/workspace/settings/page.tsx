import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspace } from '@/lib/queries/workspace'
import { WorkspaceSettingsForm } from '@/components/workspace/workspace-settings-form'
import { PermissionGate } from '@/components/shared/permission-gate'

export const metadata: Metadata = { title: 'Impostazioni Workspace — TaskFlow' }

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const workspace = await getUserWorkspace(user!.id)
  if (!workspace) return null

  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspace.workspaceId)
    .single()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni Workspace</h1>
        <p className="text-muted-foreground">Gestisci le impostazioni generali del workspace.</p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Informazioni generali</h2>
        <PermissionGate
          workspaceId={workspace.workspaceId}
          allowedRoles={['super_admin']}
          fallback={
            <p className="text-sm text-muted-foreground">
              Solo i Super Admin possono modificare le impostazioni del workspace.
            </p>
          }
        >
          <WorkspaceSettingsForm currentName={ws?.name ?? ''} />
        </PermissionGate>
      </div>
    </div>
  )
}
