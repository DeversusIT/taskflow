'use client'

import { useActionState, useState } from 'react'
import { useTransition } from 'react'
import { updateProjectAction, archiveProjectAction, deleteProjectAction } from '@/app/(dashboard)/projects/[projectId]/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import type { ProjectDetail } from '@/lib/queries/projects'

const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#64748b',
]

type Props = { project: ProjectDetail }

export function ProjectSettingsForm({ project }: Props) {
  const [selectedColor, setSelectedColor] = useState(project.color)
  const [, startTransition] = useTransition()

  const boundUpdate = updateProjectAction.bind(null, project.id)
  const [state, formAction, isPending] = useActionState(boundUpdate, { error: null })

  return (
    <div className="space-y-8">
      {/* General settings */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="color" value={selectedColor} />

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome progetto *</Label>
          <Input id="name" name="name" defaultValue={project.name} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descrizione</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={project.description ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Colore</Label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className="h-6 w-6 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? 'white' : 'transparent',
                  boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : 'none',
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Data inizio</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={project.start_date ?? ''}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Scadenza</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={project.due_date ?? ''}
            />
          </div>
        </div>

        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state.success && (
          <Alert>
            <AlertDescription>Modifiche salvate.</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
      </form>

      <Separator />

      {/* Danger zone */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-destructive">Zona pericolosa</h3>

        <div className="flex items-center justify-between rounded-md border border-destructive/30 p-4">
          <div>
            <p className="text-sm font-medium">Archivia progetto</p>
            <p className="text-xs text-muted-foreground">
              Il progetto sarà nascosto dalla lista ma recuperabile.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(async () => {
                await archiveProjectAction(project.id)
              })
            }}
          >
            Archivia
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-md border border-destructive/30 p-4">
          <div>
            <p className="text-sm font-medium">Elimina progetto</p>
            <p className="text-xs text-muted-foreground">
              Azione irreversibile. Tutti i task e le fasi verranno eliminati.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (!confirm('Sei sicuro? Questa azione è irreversibile.')) return
              startTransition(async () => {
                await deleteProjectAction(project.id)
              })
            }}
          >
            Elimina
          </Button>
        </div>
      </div>
    </div>
  )
}
