import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspace, getWorkspaceMembers } from '@/lib/queries/workspace'
import { MemberList } from '@/components/workspace/member-list'
import { InviteForm } from '@/components/workspace/invite-form'
import { PermissionGate } from '@/components/shared/permission-gate'
import { Separator } from '@/components/ui/separator'

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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Membri del Workspace</h1>
        <p className="text-muted-foreground">
          {members.length} {members.length === 1 ? 'membro' : 'membri'}
        </p>
      </div>

      <PermissionGate workspaceId={workspace.workspaceId} allowedRoles={['super_admin']}>
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Invita un membro</h2>
          <InviteForm />
        </div>
      </PermissionGate>

      <div className="rounded-lg border">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold">Elenco membri</h2>
        </div>
        <Separator />
        <div className="px-6">
          <MemberList members={members} currentUserId={user!.id} />
        </div>
      </div>
    </div>
  )
}
