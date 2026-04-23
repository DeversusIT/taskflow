'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectAction } from '@/app/(dashboard)/projects/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

const PROJECT_COLORS = [
  '#2E5BFF',
  '#FF2E7E',
  '#A8D600',
  '#FFB800',
  '#7C3AED',
  '#00C26E',
  '#FF8A3D',
  '#FF3B30',
  '#0A0A0A',
  '#9A9A9A',
]

type Props = { workspaceId: string }

export function CreateProjectDialog({ workspaceId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])

  const boundAction = createProjectAction.bind(null, workspaceId)
  const [state, formAction, isPending] = useActionState(boundAction, { error: null })

  useEffect(() => {
    if (state.projectId) {
      setOpen(false)
      router.push(`/projects/${state.projectId}`)
    }
  }, [state.projectId, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--tf-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.background = 'var(--tf-hover)'
          e.currentTarget.style.color = 'var(--tf-ink)'
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--tf-muted)'
        }}
        title="Crea progetto"
      >
        <Plus style={{ width: 14, height: 14 }} strokeWidth={2.2} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo progetto</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="color" value={selectedColor} />

          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" placeholder="Es. Sito web, App mobile…" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Descrizione opzionale" />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Data inizio</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Scadenza</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creazione…' : 'Crea progetto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
