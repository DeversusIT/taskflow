'use client'

import { useActionState } from 'react'
import { useWorkspace } from '@/lib/context/workspace-context'
import { inviteMemberAction, type InviteState } from '@/app/(dashboard)/workspace/members/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const initialState: InviteState = { error: null }

export function InviteForm() {
  const { workspaceId } = useWorkspace()
  const boundAction = inviteMemberAction.bind(null, workspaceId)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          Invito inviato con successo.
        </p>
      )}
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="collega@esempio.com"
            required
          />
        </div>
        <div className="w-40 space-y-2">
          <Label htmlFor="role">Ruolo</Label>
          <Select name="role" defaultValue="member">
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Invio...' : 'Invia invito'}
      </Button>
    </form>
  )
}
