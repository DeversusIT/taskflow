'use client'

import { useWorkspace } from '@/lib/context/workspace-context'

export type WorkspaceRole = 'super_admin' | 'member'

export function useUserRole() {
  const { userRole } = useWorkspace()

  return {
    role: userRole,
    isSuperAdmin: userRole === 'super_admin',
    isMember: userRole === 'member',
    can: (action: 'manage_workspace' | 'invite_members' | 'manage_members') => {
      switch (action) {
        case 'manage_workspace':
        case 'invite_members':
        case 'manage_members':
          return userRole === 'super_admin'
        default:
          return false
      }
    },
  }
}
