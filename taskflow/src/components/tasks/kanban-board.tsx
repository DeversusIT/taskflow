'use client'

import { useState, useEffect, useMemo, useRef, useTransition } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskPanel } from '@/components/tasks/task-panel'
import {
  createTaskAction,
  updateTaskAction,
} from '@/app/(dashboard)/projects/[projectId]/actions'
import type { Task } from '@/lib/queries/tasks'
import type { Phase } from '@/lib/queries/projects'
import type { WorkspaceMember } from '@/lib/queries/workspace'
import { cn } from '@/lib/utils'

type Status = Task['status']
type ColumnDef = { id: Status; label: string; accent: string }

const COLUMNS: ColumnDef[] = [
  { id: 'open', label: 'Aperta', accent: 'border-t-blue-500' },
  { id: 'in_progress', label: 'In corso', accent: 'border-t-purple-500' },
  { id: 'on_hold', label: 'Sospesa', accent: 'border-t-gray-500' },
  { id: 'completed', label: 'Conclusa', accent: 'border-t-green-500' },
]

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.id))

function initials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function isLate(due: string | null, status: Status): boolean {
  if (!due || status === 'completed') return false
  const d = new Date(due + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function formatDue(due: string | null): string | null {
  if (!due) return null
  return new Date(due + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// ─── Card ───────────────────────────────────────────────────────────────────
function KanbanCard({
  task,
  phases,
  onOpen,
}: {
  task: Task
  phases: Phase[]
  onOpen: (t: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const phase = task.phase_id ? phases.find((p) => p.id === task.phase_id) : null
  const late = isLate(task.due_date, task.status)
  const due = formatDue(task.due_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      className={cn(
        'rounded-md border bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing transition-colors hover:bg-accent/40',
        late && 'border-l-4 border-l-destructive',
      )}
    >
      <p
        className={cn(
          'text-sm mb-2 font-medium break-words',
          task.status === 'completed' && 'line-through opacity-70',
        )}
      >
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <PriorityBadge priority={task.priority} />
          {phase && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: phase.color }}
              />
              <span className="truncate">{phase.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {due && (
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                late && 'text-destructive font-medium',
              )}
            >
              {due}
            </span>
          )}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.assignmentId} className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[10px]">
                    {initials(a.fullName, a.email)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Column ─────────────────────────────────────────────────────────────────
function KanbanColumn({
  column,
  tasks,
  phases,
  onOpen,
  onQuickAdd,
}: {
  column: ColumnDef
  tasks: Task[]
  phases: Phase[]
  onOpen: (t: Task) => void
  onQuickAdd: (status: Status, title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 50)
  }, [adding])

  function submit() {
    const v = value.trim()
    if (!v) return
    onQuickAdd(column.id, v)
    setValue('')
    setAdding(false)
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-t-2 bg-muted/20 min-h-[60vh] transition-colors',
        column.accent,
        isOver && 'bg-accent/30',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{column.label}</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
          {tasks.map((t) => (
            <KanbanCard key={t.id} task={t} phases={phases} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground text-center py-6">Nessun task</p>
          )}
        </div>
      </SortableContext>

      <div className="border-t p-2">
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            Aggiungi task
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') {
                  setAdding(false)
                  setValue('')
                }
              }}
              placeholder="Titolo…"
              className="h-7 text-xs"
            />
            <Button size="sm" onClick={submit} disabled={!value.trim()}>
              +
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false)
                setValue('')
              }}
            >
              ✕
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Board ─────────────────────────────────────────────────────────────
type Props = {
  initialTasks: Task[]
  projectId: string
  phases: Phase[]
  members: WorkspaceMember[]
}

export function KanbanBoard({ initialTasks, projectId, phases, members }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTasks((prev) => {
      const serverIds = new Set(initialTasks.map((t) => t.id))
      const localOnly = prev.filter((t) => !serverIds.has(t.id))
      const serverMap = new Map(initialTasks.map((t) => [t.id, t]))
      const merged = prev
        .filter((t) => serverIds.has(t.id))
        .map((t) => serverMap.get(t.id) ?? t)
      const newFromServer = initialTasks.filter((t) => !prev.some((p) => p.id === t.id))
      return [...merged, ...newFromServer, ...localOnly]
    })
  }, [initialTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (phaseFilter === 'none' && t.phase_id !== null) return false
      if (phaseFilter !== 'all' && phaseFilter !== 'none' && t.phase_id !== phaseFilter) return false
      return true
    })
  }, [tasks, priorityFilter, phaseFilter])

  const tasksByStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      open: [],
      in_progress: [],
      on_hold: [],
      completed: [],
    }
    for (const t of filtered) map[t.status].push(t)
    return map
  }, [filtered])

  function handleDragStart(e: DragStartEvent) {
    const t = tasks.find((x) => x.id === e.active.id)
    if (t) setActiveTask(t)
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeT = tasks.find((t) => t.id === activeId)
    if (!activeT) return

    const targetStatus: Status = COLUMN_IDS.has(overId)
      ? (overId as Status)
      : (tasks.find((t) => t.id === overId)?.status ?? activeT.status)

    if (activeT.status === targetStatus) return

    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t)),
    )
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active } = e
    setActiveTask(null)

    const activeId = String(active.id)
    const current = tasks.find((t) => t.id === activeId)
    const original = initialTasks.find((t) => t.id === activeId)
    if (!current || !original) return

    if (original.status !== current.status) {
      startTransition(async () => {
        await updateTaskAction(activeId, projectId, { status: current.status })
      })
    }
  }

  async function handleQuickAdd(status: Status, title: string) {
    const formData = new FormData()
    formData.set('title', title)
    formData.set('status', status)
    formData.set('priority', 'medium')
    const res = await createTaskAction(projectId, { error: null }, formData)
    if (res.newTask) {
      setTasks((prev) => [...prev, { ...res.newTask!, assignees: [] }])
    }
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={priorityFilter}
          onValueChange={(v) => v && setPriorityFilter(v)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Priorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le priorità</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Bassa</SelectItem>
          </SelectContent>
        </Select>

        {phases.length > 0 && (
          <Select value={phaseFilter} onValueChange={(v) => v && setPhaseFilter(v)}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le fasi</SelectItem>
              <SelectItem value="none">Senza fase</SelectItem>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(priorityFilter !== 'all' || phaseFilter !== 'all') && (
          <button
            onClick={() => {
              setPriorityFilter('all')
              setPhaseFilter('all')
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Azzera filtri
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} task
          {filtered.length !== tasks.length && ` di ${tasks.length}`}
        </span>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasksByStatus[col.id]}
              phases={phases}
              onOpen={setOpenTask}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rounded-md border bg-background p-3 shadow-lg opacity-95 cursor-grabbing">
              <p className="text-sm font-medium mb-2">{activeTask.title}</p>
              <PriorityBadge priority={activeTask.priority} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {openTask && (
        <TaskPanel
          task={openTask}
          projectId={projectId}
          phases={phases}
          members={members}
          onClose={() => setOpenTask(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setOpenTask(updated)
          }}
          onTaskDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id))
            setOpenTask(null)
          }}
        />
      )}
    </div>
  )
}
