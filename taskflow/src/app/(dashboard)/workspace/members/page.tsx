import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspace, getWorkspaceMembers } from '@/lib/queries/workspace'
import { MemberList } from '@/components/workspace/member-list'
import { InviteForm } from '@/components/workspace/invite-form'
import { PermissionGate } from '@/components/shared/permission-gate'

export const metadata: Metadata = { title: 'Membri — TaskFlow' }

export default async function WorkspaceMembersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const workspace = await getUserWorkspace(user!.id)
  if (!workspace) return null

  const members = await getWorkspaceMembers(workspace.workspaceId)

  return (
    <div style={{ maxWidth: 780 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: 'var(--tf-ink)' }}>
        Membri
      </h1>
      <p style={{ color: 'var(--tf-muted)', fontSize: 14, fontWeight: 500, margin: '0 0 26px' }}>
        {members.length} {members.length === 1 ? 'persona' : 'persone'} nel workspace.
      </p>

      <PermissionGate workspaceId={workspace.workspaceId} allowedRoles={['super_admin']}>
        <div style={{ background: 'var(--tf-panel)', border: '1px solid var(--tf-line)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px', letterSpacing: '-0.02em' }}>Invita un membro</h2>
          <InviteForm />
        </div>
      </PermissionGate>

      <MemberList members={members} currentUserId={user!.id} />
    </div>
  )
}
