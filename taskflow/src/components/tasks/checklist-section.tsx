'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  getChecklistsAction,
  createChecklistAction,
  deleteChecklistAction,
  addChecklistItemAction,
  toggleChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistItemsAction,
} from '@/app/(dashboard)/projects/[projectId]/checklist-actions'
import type { Checklist, ChecklistItem } from '@/lib/queries/tasks'

type SortableItemProps = {
  item: ChecklistItem
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

function SortableItem({ item, onToggle, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md px-1 py-1 group hover:bg-accent/30"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 touch-none"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <Checkbox
        id={item.id}
        checked={item.completed}
        onCheckedChange={(checked) => onToggle(item.id, !!checked)}
      />
      <label
        htmlFor={item.id}
        className={`flex-1 text-sm cursor-pointer transition-all ${item.completed ? 'line-through text-muted-foreground' : ''}`}
      >
        {item.title}
      </label>
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

type Props = {
  taskId: string
  projectId: string
}

export function ChecklistSection({ taskId, projectId }: Props) {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [showNewChecklist, setShowNewChecklist] = useState(false)
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})
  const [showAddItem, setShowAddItem] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const newChecklistRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  useEffect(() => {
    setLoading(true)
    getChecklistsAction(taskId, projectId).then(({ data, error }) => {
      if (error) toast.error(error)
      else setChecklists(data)
      setLoading(false)
    })
  }, [taskId, projectId])

  useEffect(() => {
    if (showNewChecklist) newChecklistRef.current?.focus()
  }, [showNewChecklist])

  async function refetch() {
    const { data } = await getChecklistsAction(taskId, projectId)
    setChecklists(data)
  }

  function handleAddChecklist() {
    const title = newChecklistTitle.trim()
    if (!title) return
    setNewChecklistTitle('')
    setShowNewChecklist(false)
    startTransition(async () => {
      const { error } = await createChecklistAction(taskId, projectId, title)
      if (error) toast.error(error)
      else await refetch()
    })
  }

  function handleDeleteChecklist(checklistId: string) {
    setChecklists((prev) => prev.filter((c) => c.id !== checklistId))
    startTransition(async () => {
      const { error } = await deleteChecklistAction(checklistId, projectId)
      if (error) { toast.error(error); await refetch() }
    })
  }

  function handleToggleItem(checklistId: string, itemId: string, completed: boolean) {
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, completed } : i)) }
          : c,
      ),
    )
    startTransition(async () => {
      const { error } = await toggleChecklistItemAction(itemId, checklistId, projectId, completed)
      if (error) toast.error(error)
    })
  }

  function handleDeleteItem(checklistId: string, itemId: string) {
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
      ),
    )
    startTransition(async () => {
      const { error } = await deleteChecklistItemAction(itemId, projectId)
      if (error) { toast.error(error); await refetch() }
    })
  }

  function handleAddItem(checklistId: string) {
    const title = (newItemTitles[checklistId] ?? '').trim()
    if (!title) return
    setNewItemTitles((prev) => ({ ...prev, [checklistId]: '' }))
    setShowAddItem((prev) => ({ ...prev, [checklistId]: false }))
    startTransition(async () => {
      const { error } = await addChecklistItemAction(checklistId, projectId, title)
      if (error) toast.error(error)
      else await refetch()
    })
  }

  function handleDragEnd(checklistId: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const checklist = checklists.find((c) => c.id === checklistId)
    if (!checklist) return
    const oldIndex = checklist.items.findIndex((i) => i.id === active.id)
    const newIndex = checklist.items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(checklist.items, oldIndex, newIndex)
    setChecklists((prev) =>
      prev.map((c) => (c.id === checklistId ? { ...c, items: reordered } : c)),
    )
    startTransition(async () => {
      const { error } = await reorderChecklistItemsAction(
        checklistId,
        projectId,
        reordered.map((i) => i.id),
      )
      if (error) toast.error(error)
    })
  }

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Checklist</p>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={() => setShowNewChecklist((v) => !v)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Caricamento…</p>}

      {showNewChecklist && (
        <div className="flex items-center gap-2">
          <Input
            ref={newChecklistRef}
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            placeholder="Nome checklist…"
            className="h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChecklist()
              if (e.key === 'Escape') { setShowNewChecklist(false); setNewChecklistTitle('') }
            }}
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddChecklist}
            disabled={!newChecklistTitle.trim()}
          >
            Crea
          </Button>
        </div>
      )}

      {checklists.map((checklist) => {
        const total = checklist.items.length
        const completed = checklist.items.filter((i) => i.completed).length
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0

        return (
          <div key={checklist.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-medium">{checklist.title}</span>
              <span className="text-xs text-muted-foreground">{completed}/{total}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteChecklist(checklist.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {total > 0 && <Progress value={progress} className="h-1.5" />}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(checklist.id, e)}
            >
              <SortableContext
                items={checklist.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {checklist.items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onToggle={(id, checked) => handleToggleItem(checklist.id, id, checked)}
                    onDelete={(id) => handleDeleteItem(checklist.id, id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div>
              {showAddItem[checklist.id] ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={newItemTitles[checklist.id] ?? ''}
                    onChange={(e) =>
                      setNewItemTitles((prev) => ({ ...prev, [checklist.id]: e.target.value }))
                    }
                    placeholder="Aggiungi elemento…"
                    className="h-7 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddItem(checklist.id)
                      if (e.key === 'Escape')
                        setShowAddItem((prev) => ({ ...prev, [checklist.id]: false }))
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAddItem(checklist.id)}
                    disabled={!(newItemTitles[checklist.id] ?? '').trim()}
                  >
                    Aggiungi
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setShowAddItem((prev) => ({ ...prev, [checklist.id]: true }))}
                >
                  <Plus className="h-3 w-3 mr-1" /> Aggiungi elemento
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
