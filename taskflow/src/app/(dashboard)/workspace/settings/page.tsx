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
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: 'var(--tf-ink)' }}>
        Impostazioni workspace
      </h1>
      <p style={{ color: 'var(--tf-muted)', fontSize: 14, fontWeight: 500, margin: '0 0 26px' }}>
        Gestisci le impostazioni generali.
      </p>

      <div style={{ background: 'var(--tf-panel)', border: '1px solid var(--tf-line)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px', letterSpacing: '-0.02em' }}>Informazioni generali</h2>
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

