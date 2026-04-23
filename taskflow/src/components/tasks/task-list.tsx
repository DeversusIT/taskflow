'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown, Trash2, CheckSquare, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { TaskPanel } from '@/components/tasks/task-panel'
import {
  createTaskAction,
  updateTaskAction,
  bulkUpdateStatusAction,
  bulkDeleteTasksAction,
} from '@/app/(dashboard)/projects/[projectId]/actions'
import type { NewTaskData } from '@/app/(dashboard)/projects/[projectId]/actions'
import type { Task } from '@/lib/queries/tasks'
import type { Phase } from '@/lib/queries/projects'
import type { WorkspaceMember } from '@/lib/queries/workspace'
import { cn } from '@/lib/utils'

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function formatDate(d: string | null) {
  if (!d) return null
  const date = new Date(d + 'T00:00:00Z')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = date < today
  const formatted = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  return { formatted, isOverdue }
}

// ─── Quick-add row ────────────────────────────────────────────────────────────
function QuickAddTask({
  projectId,
  phases,
  onCreated,
}: {
  projectId: string
  phases: Phase[]
  onCreated: (task: NewTaskData) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const phaseRef = useRef<HTMLSelectElement>(null)
  const priorityRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50)
  }, [open])

  function handleSubmit() {
    const title = titleRef.current?.value?.trim()
    if (!title) return
    setError(null)

    const formData = new FormData()
    formData.set('title', title)
    formData.set('priority', priorityRef.current?.value ?? 'medium')
    if (phaseRef.current?.value) formData.set('phase_id', phaseRef.current.value)

    startTransition(async () => {
      const result = await createTaskAction(projectId, { error: null }, formData)
      if (result.error) {
        setError(result.error)
      } else if (result.newTask) {
        onCreated(result.newTask)
        router.refresh()
        setOpen(false)
        if (titleRef.current) titleRef.current.value = ''
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Aggiungi task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
      <Input
        ref={titleRef}
        placeholder="Titolo task…"
        className="flex-1 border-0 p-0 shadow-none focus-visible:ring-0 text-sm"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {phases.length > 0 && (
        <select ref={phaseRef} className="rounded border border-input bg-transparent px-2 py-1 text-xs">
          <option value="">Nessuna fase</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}
      <select ref={priorityRef} defaultValue="medium" className="rounded border border-input bg-transparent px-2 py-1 text-xs">
        <option value="low">Bassa</option>
        <option value="medium">Media</option>
        <option value="high">Alta</option>
        <option value="urgent">Urgente</option>
      </select>
      <Button size="sm" disabled={isPending} onClick={handleSubmit}>
        {isPending ? '…' : 'Aggiungi'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
type Filters = {
  status: string
  priority: string
  phase_id: string
}

function FilterBar({
  filters,
  phases,
  onChange,
}: {
  filters: Filters
  phases: Phase[]
  onChange: (f: Filters) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={filters.status}
        onValueChange={(v) => v && onChange({ ...filters, status: v })}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="Stato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti gli stati</SelectItem>
          <SelectItem value="open">Aperta</SelectItem>
          <SelectItem value="in_progress">In corso</SelectItem>
          <SelectItem value="on_hold">Sospesa</SelectItem>
          <SelectItem value="completed">Conclusa</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) => v && onChange({ ...filters, priority: v })}
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
        <Select
          value={filters.phase_id}
          onValueChange={(v) => v && onChange({ ...filters, phase_id: v })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le fasi</SelectItem>
            <SelectItem value="none">Senza fase</SelectItem>
            {phases.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(filters.status !== 'all' || filters.priority !== 'all' || filters.phase_id !== 'all') && (
        <button
          onClick={() => onChange({ status: 'all', priority: 'all', phase_id: 'all' })}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Azzera filtri
        </button>
      )}
    </div>
  )
}

// ─── Main TaskList ────────────────────────────────────────────────────────────
type Props = {
  initialTasks: Task[]
  projectId: string
  phases: Phase[]
  members: WorkspaceMember[]
}

export function TaskList({ initialTasks, projectId, phases, members }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({ status: 'all', priority: 'all', phase_id: 'all' })
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTasks((prev) => {
      // Merge: keep locally-added tasks not yet returned by server, update existing ones
      const serverIds = new Set(initialTasks.map((t) => t.id))
      const localOnly = prev.filter((t) => !serverIds.has(t.id))
      return [...initialTasks, ...localOnly]
    })
  }, [initialTasks])

  // Filtering
  const filtered = tasks.filter((t) => {
    if (filters.status !== 'all' && t.status !== filters.status) return false
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false
    if (filters.phase_id === 'none' && t.phase_id !== null) return false
    if (filters.phase_id !== 'all' && filters.phase_id !== 'none' && t.phase_id !== filters.phase_id) return false
    return true
  })

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((t) => t.id)))
    }
  }

  function handleInlineStatusChange(taskId: string, status: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: status as Task['status'] } : t))
    if (openTask?.id === taskId) setOpenTask((prev) => prev ? { ...prev, status: status as Task['status'] } : prev)
    startTransition(async () => {
      await updateTaskAction(taskId, projectId, { status })
    })
  }

  function handleBulkStatus(status: Task['status']) {
    const ids = Array.from(selected)
    setTasks((prev) => prev.map((t) => selected.has(t.id) ? { ...t, status } : t))
    setSelected(new Set())
    startTransition(async () => {
      await bulkUpdateStatusAction(ids, status, projectId)
      router.refresh()
    })
  }

  function handleBulkDelete() {
    if (!confirm(`Eliminare ${selected.size} task?`)) return
    const ids = Array.from(selected)
    setTasks((prev) => prev.filter((t) => !selected.has(t.id)))
    setSelected(new Set())
    startTransition(async () => {
      await bulkDeleteTasksAction(ids, projectId)
      router.refresh()
    })
  }

  const phaseMap = Object.fromEntries(phases.map((p) => [p.id, p]))

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterBar filters={filters} phases={phases} onChange={setFilters} />
        <span className="text-xs text-muted-foreground">
          {filtered.length} task{filtered.length !== tasks.length && ` di ${tasks.length}`}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-accent/50 px-3 py-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selected.size} selezionati</span>
          <div className="ml-2 flex items-center gap-1">
            {(['open', 'in_progress', 'on_hold', 'completed'] satisfies Task['status'][]).map((s) => (
              <button
                key={s}
                onClick={() => handleBulkStatus(s)}
                className="rounded px-2 py-0.5 text-xs hover:bg-accent"
              >
                → {s === 'open' ? 'Aperta' : s === 'in_progress' ? 'In corso' : s === 'on_hold' ? 'Sospesa' : 'Conclusa'}
              </button>
            ))}
          </div>
          <button onClick={handleBulkDelete} className="ml-auto text-destructive hover:text-destructive/80">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
          <Checkbox
            checked={filtered.length > 0 && selected.size === filtered.length}
            onCheckedChange={toggleSelectAll}
            className="h-3.5 w-3.5"
          />
          <span>Titolo</span>
          <span>Stato</span>
          <span>Priorità</span>
          <span>Fase</span>
          <span>Scadenza</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nessun task{Object.values(filters).some((v) => v !== 'all') ? ' con questi filtri' : '. Aggiungine uno!'}.
          </div>
        ) : (
          filtered.map((task) => {
            const dateInfo = formatDate(task.due_date)
            const phase = task.phase_id ? phaseMap[task.phase_id] : null
            return (
              <div
                key={task.id}
                className={cn(
                  'grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b px-3 py-2.5 text-sm last:border-b-0 hover:bg-accent/30 transition-colors cursor-pointer',
                  selected.has(task.id) && 'bg-accent/50',
                  task.status === 'completed' && 'opacity-60',
                )}
                onClick={() => setOpenTask(task)}
              >
                <Checkbox
                  checked={selected.has(task.id)}
                  onCheckedChange={() => toggleSelect(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5"
                />

                {/* Title + assignees */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('truncate', task.status === 'completed' && 'line-through')}>{task.title}</span>
                  {task.subtask_count > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground flex-shrink-0">
                      <ListChecks className="h-3 w-3" />
                      {task.subtask_count}
                    </span>
                  )}
                  {task.assignees.length > 0 && (
                    <div className="flex -space-x-1.5 flex-shrink-0">
                      {task.assignees.slice(0, 3).map((a) => (
                        <Avatar key={a.assignmentId} className="h-5 w-5 border border-background">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(a.fullName, a.email)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status inline */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status}
                    onValueChange={(v) => v && handleInlineStatusChange(task.id, v)}
                  >
                    <SelectTrigger size="sm" className="h-6 border-0 bg-transparent px-1 shadow-none hover:bg-accent">
                      <StatusBadge status={task.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aperta</SelectItem>
                      <SelectItem value="in_progress">In corso</SelectItem>
                      <SelectItem value="on_hold">Sospesa</SelectItem>
                      <SelectItem value="completed">Conclusa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <PriorityBadge priority={task.priority} />

                {/* Phase */}
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {phase ? (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: phase.color }} />
                      {phase.name}
                    </span>
                  ) : '—'}
                </span>

                {/* Due date */}
                <span className={cn('text-xs whitespace-nowrap', dateInfo?.isOverdue && 'text-destructive font-medium')}>
                  {dateInfo?.formatted ?? '—'}
                </span>
              </div>
            )
          })
        )}

        {/* Quick add */}
        <div className="border-t px-3 py-1">
          <QuickAddTask
            projectId={projectId}
            phases={phases}
            onCreated={(newTask) => {
              setTasks((prev) => [...prev, { ...newTask, assignees: [], subtask_count: 0 }])
              setSelected(new Set())
            }}
          />
        </div>
      </div>

      {/* Task panel */}
      {openTask && (
        <TaskPanel
          task={openTask}
          projectId={projectId}
          phases={phases}
          members={members}
          onClose={() => setOpenTask(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
            setOpenTask(updated)
          }}
          onTaskDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id))
          }}
        />
      )}
    </div>
  )
}
