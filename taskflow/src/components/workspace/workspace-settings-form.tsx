'use client'

import { useActionState } from 'react'
import { useWorkspace } from '@/lib/context/workspace-context'
import { updateWorkspaceAction, type UpdateWorkspaceState } from '@/app/(dashboard)/workspace/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: UpdateWorkspaceState = { error: null }

export function WorkspaceSettingsForm({ currentName }: { currentName: string }) {
  const { workspaceId } = useWorkspace()
  const boundAction = updateWorkspaceAction.bind(null, workspaceId)
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
          Workspace aggiornato con successo.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Nome workspace</Label>
        <Input
          id="name"
          name="name"
          defaultValue={currentName}
          placeholder="Nome del workspace"
          required
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </form>
  )
}
