'use client'

import { useState, useEffect, useMemo, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ListChecks, X } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { TaskPanel } from '@/components/tasks/task-panel'
import {
  createTaskAction,
  updateTaskAction,
} from '@/app/(dashboard)/projects/[projectId]/actions'
import type { Task } from '@/lib/queries/tasks'
import type { Phase } from '@/lib/queries/projects'
import type { WorkspaceMember } from '@/lib/queries/workspace'

type Status = Task['status']

type ColumnDef = {
  id: Status
  label: string
  color: string
}

const COLUMNS: ColumnDef[] = [
  { id: 'open',        label: 'Aperta',   color: '#2E5BFF' },
  { id: 'in_progress', label: 'In corso', color: '#7C3AED' },
  { id: 'on_hold',     label: 'Sospesa',  color: '#9A9A9A' },
  { id: 'completed',   label: 'Conclusa', color: '#00C26E' },
]

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.id))

function initials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function isLate(due: string | null, status: Status): boolean {
  if (!due || status === 'completed') return false
  const d = new Date(due + 'T00:00:00Z')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function formatDue(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null
  const date = new Date(due + 'T00:00:00Z')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const overdue = diff < 0
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  let label: string
  if (diff === 0) label = 'Oggi'
  else if (diff === 1) label = 'Domani'
  else if (diff === -1) label = 'Ieri'
  else label = `${date.getDate()} ${months[date.getMonth()]}`
  return { label, overdue }
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
  const due = formatDue(task.due_date)
  const late = isLate(task.due_date, task.status)
  const isCompleted = task.status === 'completed'

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--tf-panel)',
        border: late ? `3px solid var(--tf-red)` : '1px solid var(--tf-line)',
        borderRadius: 10,
        padding: 12,
        cursor: 'grab',
        boxShadow: 'var(--tf-shadow-1)',
      }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = late ? 'var(--tf-red)' : '#BDB9AE'
        el.style.transform = `${style.transform ?? ''} translateY(-1px)`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = late ? 'var(--tf-red)' : 'var(--tf-line)'
        el.style.transform = style.transform ?? ''
      }}
    >
      <p
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          lineHeight: 1.35,
          marginBottom: 10,
          margin: '0 0 10px',
          textDecoration: isCompleted ? 'line-through' : 'none',
          color: isCompleted ? 'var(--tf-muted)' : 'var(--tf-ink)',
        }}
      >
        {task.title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <PriorityBadge priority={task.priority} size="sm" />
          {phase && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--tf-muted)', overflow: 'hidden' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phase.name}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {due && (
            <span style={{ fontSize: 11, fontWeight: 700, color: due.overdue ? 'var(--tf-red)' : 'var(--tf-muted)', whiteSpace: 'nowrap' }}>
              {due.label}
            </span>
          )}
          {task.subtask_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--tf-muted)' }}>
              <ListChecks style={{ width: 12, height: 12 }} />
              {task.subtask_count}
            </span>
          )}
          {task.assignees.length > 0 && (
            <div style={{ display: 'flex' }}>
              {task.assignees.slice(0, 3).map((a, i) => (
                <Avatar key={a.assignmentId} className="h-5 w-5 border border-background" style={{ marginLeft: i === 0 ? 0 : -6 }}>
                  <AvatarFallback className="text-[10px]">{initials(a.fullName, a.email)}</AvatarFallback>
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
  onQuickAdd: (status: Status, title: string) => Promise<void>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 30)
  }, [adding])

  async function submit() {
    const v = value.trim()
    if (!v || saving) return
    setSaving(true)
    await onQuickAdd(column.id, v)
    setSaving(false)
    setValue('')
    setAdding(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: isOver ? '#EFEBE1' : 'var(--tf-bg)',
        border: '1px solid var(--tf-line)',
        borderTop: `3px solid ${column.color}`,
        borderRadius: 12,
        minHeight: 520,
        transition: 'background 140ms var(--tf-ease)',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid var(--tf-line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em' }}>{column.label}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 22,
              height: 20,
              padding: '0 7px',
              borderRadius: 999,
              background: 'var(--tf-panel)',
              border: '1px solid var(--tf-line)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--tf-muted)',
            }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            color: 'var(--tf-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)'; e.currentTarget.style.color = 'var(--tf-ink)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tf-muted)' }}
        >
          <Plus style={{ width: 14, height: 14 }} strokeWidth={2.2} />
        </button>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, flex: 1, overflowY: 'auto' }}>
          {tasks.map((t) => (
            <KanbanCard key={t.id} task={t} phases={phases} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && !adding && (
            <p style={{ padding: '24px 8px', textAlign: 'center', fontSize: 12, color: 'var(--tf-muted-2)', fontWeight: 600 }}>
              Nessun task
            </p>
          )}
          {adding && (
            <div
              style={{
                background: 'var(--tf-panel)',
                border: '1px solid var(--tf-ink)',
                borderRadius: 10,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void submit() }
                  if (e.key === 'Escape' && !saving) { setAdding(false); setValue('') }
                }}
                placeholder="Titolo…"
                style={{
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: 4,
                  fontFamily: 'inherit',
                  color: 'inherit',
                  background: 'transparent',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={submit}
                  disabled={!value.trim() || saving}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'var(--tf-ink)',
                    color: '#fff',
                    border: 'none',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? '…' : 'Aggiungi'}
                </button>
                <button
                  disabled={saving}
                  onClick={() => { setAdding(false); setValue('') }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: '1px solid var(--tf-line)',
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--tf-muted)',
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Filters ────────────────────────────────────────────────────────────────
const PRIORITY_LABELS: Record<string, string> = {
  all: 'Tutte le priorità', low: 'Bassa', medium: 'Media', high: 'Alta', urgent: 'Urgente',
}

// ─── Main Board ─────────────────────────────────────────────────────────────
type Props = { initialTasks: Task[]; projectId: string; phases: Phase[]; members: WorkspaceMember[]; currentUserId: string }

export function KanbanBoard({ initialTasks, projectId, phases, members, currentUserId }: Props) {
  const router = useRouter()
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
      const merged = prev.filter((t) => serverIds.has(t.id)).map((t) => serverMap.get(t.id) ?? t)
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
    const map: Record<Status, Task[]> = { open: [], in_progress: [], on_hold: [], completed: [] }
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
    setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t)))
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
        const { error } = await updateTaskAction(activeId, projectId, { status: current.status })
        if (error) {
          setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: original.status } : t)))
          toast.error('Errore aggiornamento stato task')
        }
      })
    }
  }

  async function handleQuickAdd(status: Status, title: string) {
    const formData = new FormData()
    formData.set('title', title)
    formData.set('status', status)
    formData.set('priority', 'medium')
    const res = await createTaskAction(projectId, { error: null }, formData)
    if (res.error) { toast.error(res.error); return }
    if (res.newTask) {
      setTasks((prev) => [...prev, { ...res.newTask!, assignees: [], subtask_count: 0 }])
      router.refresh()
    }
  }

  const hasFilters = priorityFilter !== 'all' || phaseFilter !== 'all'

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
          <SelectTrigger size="sm">
            <SelectValue>
              <span style={{ fontWeight: 700 }}>{PRIORITY_LABELS[priorityFilter]}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
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
              {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setPriorityFilter('all'); setPhaseFilter('all') }}
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--tf-muted)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Azzera filtri
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--tf-muted)' }}>
          {filtered.length} task{filtered.length !== tasks.length && ` di ${tasks.length}`}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
            <div
              style={{
                background: 'var(--tf-panel)',
                border: '1px solid var(--tf-line)',
                borderRadius: 10,
                padding: 12,
                boxShadow: 'var(--tf-shadow-pop)',
                opacity: 0.95,
                cursor: 'grabbing',
              }}
            >
              <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{activeTask.title}</p>
              <PriorityBadge priority={activeTask.priority} size="sm" />
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
          currentUserId={currentUserId}
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
