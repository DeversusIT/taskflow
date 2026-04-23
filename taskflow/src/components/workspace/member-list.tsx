'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoleBadge } from '@/components/shared/role-badge'
import { removeMemberAction, updateMemberRoleAction } from '@/app/(dashboard)/workspace/members/actions'
import type { WorkspaceMember } from '@/lib/queries/workspace'
import { useWorkspace } from '@/lib/context/workspace-context'

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function MemberRow({
  member,
  workspaceId,
  isSuperAdmin,
  isCurrentUser,
}: {
  member: WorkspaceMember
  workspaceId: string
  isSuperAdmin: boolean
  isCurrentUser: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      await removeMemberAction(member.id, workspaceId)
    })
  }

  function handleRoleChange(role: string | null) {
    if (!role) return
    const formData = new FormData()
    formData.set('role', role)
    startTransition(async () => {
      await updateMemberRoleAction(member.id, workspaceId, { error: null }, formData)
    })
  }

  const cols = isSuperAdmin ? '1fr 1fr 140px 40px' : '1fr 1fr 140px'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: cols,
        gap: 12,
        padding: '12px 20px',
        borderBottom: '1px solid var(--tf-line)',
        alignItems: 'center',
      }}
    >
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(member.profile.fullName, member.profile.email)}
          </AvatarFallback>
        </Avatar>
        <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.profile.fullName || member.profile.email}
          {isCurrentUser && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--tf-muted)', fontWeight: 500 }}>(tu)</span>
          )}
        </span>
      </div>

      {/* Email */}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tf-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {member.profile.email}
      </span>

      {/* Role */}
      <div>
        {isSuperAdmin && !isCurrentUser ? (
          <Select defaultValue={member.role} onValueChange={handleRoleChange} disabled={isPending}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </div>

      {/* Delete */}
      {isSuperAdmin && (
        <div>
          {!isCurrentUser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={isPending}
              className="text-destructive hover:text-destructive h-7 w-7"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function MemberList({
  members,
  currentUserId,
}: {
  members: WorkspaceMember[]
  currentUserId: string
}) {
  const { workspaceId, userRole } = useWorkspace()
  const isSuperAdmin = userRole === 'super_admin'

  return (
    <div
      style={{
        background: 'var(--tf-panel)',
        border: '1px solid var(--tf-line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isSuperAdmin ? '1fr 1fr 140px 40px' : '1fr 1fr 140px',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--tf-line)',
          background: 'var(--tf-bg)',
        }}
      >
        <div className="uppercase-xs" style={{ fontSize: 10 }}>Nome</div>
        <div className="uppercase-xs" style={{ fontSize: 10 }}>Email</div>
        <div className="uppercase-xs" style={{ fontSize: 10 }}>Ruolo</div>
        {isSuperAdmin && <div />}
      </div>

      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          workspaceId={workspaceId}
          isSuperAdmin={isSuperAdmin}
          isCurrentUser={member.userId === currentUserId}
        />
      ))}
    </div>
  )
}
