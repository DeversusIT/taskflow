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
    startTransition(() => removeMemberAction(member.id, workspaceId))
  }

  function handleRoleChange(role: string | null) {
    if (!role) return
    const formData = new FormData()
    formData.set('role', role)
    startTransition(async () => {
      await updateMemberRoleAction(member.id, workspaceId, { error: null }, formData)
    })
  }

  return (
    <div className="flex items-center gap-4 py-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">
          {getInitials(member.profile.fullName, member.profile.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {member.profile.fullName || member.profile.email}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-muted-foreground">(tu)</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.profile.email}</p>
      </div>
      {isSuperAdmin && !isCurrentUser ? (
        <Select defaultValue={member.role} onValueChange={handleRoleChange} disabled={isPending}>
          <SelectTrigger className="w-36">
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
      {isSuperAdmin && !isCurrentUser && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isPending}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
    <div className="divide-y">
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
