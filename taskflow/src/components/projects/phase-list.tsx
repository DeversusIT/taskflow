'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createPhaseAction,
  deletePhaseAction,
  updatePhaseAction,
  reorderPhasesAction,
} from '@/app/(dashboard)/projects/[projectId]/settings/actions'
import type { Phase } from '@/lib/queries/projects'

const PHASE_COLORS = [
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

// ─── Single sortable phase item ─────────────────────────────────────────────
function PhaseItem({
  phase,
  projectId,
  onDelete,
}: {
  phase: Phase
  projectId: string
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editColor, setEditColor] = useState(phase.color)
  const [, startTransition] = useTransition()

  const boundUpdate = updatePhaseAction.bind(null, phase.id, projectId)
  const [state, formAction, isPending] = useActionState(boundUpdate, { error: null })

  useEffect(() => {
    if (state.success) setEditing(false)
  }, [state.success])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phase.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} className="rounded-md border bg-background p-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="color" value={editColor} />
          <div className="flex gap-2">
            <Input name="name" defaultValue={phase.name} required className="flex-1" />
            <Button type="submit" size="sm" disabled={isPending}>
              <Check className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1.5">
            {PHASE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setEditColor(c)}
                className="h-5 w-5 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: editColor === c ? 'white' : 'transparent',
                  boxShadow: editColor === c ? `0 0 0 2px ${c}` : 'none',
                }}
              />
            ))}
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        </form>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="h-3 w-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: phase.color }}
      />
      <span className="flex-1 text-sm font-medium">{phase.name}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground"
        title="Modifica"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => {
          startTransition(async () => {
            await deletePhaseAction(phase.id, projectId)
            onDelete(phase.id)
          })
        }}
        className="text-muted-foreground hover:text-destructive"
        title="Elimina"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Add phase form ──────────────────────────────────────────────────────────
function AddPhaseForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(PHASE_COLORS[0])

  const boundCreate = createPhaseAction.bind(null, projectId)
  const [state, formAction, isPending] = useActionState(boundCreate, { error: null })

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      setSelectedColor(PHASE_COLORS[0])
    }
  }, [state.success])

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi fase
      </Button>
    )
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="color" value={selectedColor} />
        <div className="space-y-1">
          <Label htmlFor="phase-name">Nome fase *</Label>
          <Input id="phase-name" name="name" placeholder="Es. Analisi, Sviluppo, Test…" required />
        </div>
        <div className="flex gap-1.5">
          {PHASE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className="h-5 w-5 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: selectedColor === c ? 'white' : 'transparent',
                boxShadow: selectedColor === c ? `0 0 0 2px ${c}` : 'none',
              }}
            />
          ))}
        </div>
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Salvo…' : 'Salva'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Main phase list ─────────────────────────────────────────────────────────
export function PhaseList({ initialPhases, projectId }: { initialPhases: Phase[]; projectId: string }) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases)
  const [, startTransition] = useTransition()

  // Sync when server re-renders with new phases (e.g., after create/delete)
  useEffect(() => {
    setPhases(initialPhases)
  }, [initialPhases])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = phases.findIndex((p) => p.id === active.id)
    const newIndex = phases.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(phases, oldIndex, newIndex).map((p, i) => ({
      ...p,
      order_index: i,
    }))

    setPhases(reordered)

    startTransition(async () => {
      await reorderPhasesAction(
        reordered.map(({ id, order_index }) => ({ id, order_index })),
        projectId,
      )
    })
  }

  function handleDelete(deletedId: string) {
    setPhases((prev) => prev.filter((p) => p.id !== deletedId))
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={phases.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {phases.map((phase) => (
            <PhaseItem key={phase.id} phase={phase} projectId={projectId} onDelete={handleDelete} />
          ))}
        </SortableContext>
      </DndContext>

      {phases.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nessuna fase ancora. Aggiungine una per iniziare.
        </p>
      )}

      <AddPhaseForm projectId={projectId} />
    </div>
  )
}
