'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ListChecks, X, CheckCircle } from 'lucide-react'
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

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function formatDate(d: string | null) {
  if (!d) return null
  const date = new Date(d + 'T00:00:00Z')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = diff < 0
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  let label: string
  if (diff === 0) label = 'Oggi'
  else if (diff === 1) label = 'Domani'
  else if (diff === -1) label = 'Ieri'
  else label = `${date.getDate()} ${months[date.getMonth()]}`
  return { label, isOverdue }
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
  const titleRef = useRef<HTMLInputElement>(null)
  const phaseRef = useRef<HTMLSelectElement>(null)
  const priorityRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 30)
  }, [open])

  function handleSubmit() {
    const title = titleRef.current?.value?.trim()
    if (!title) return

    const formData = new FormData()
    formData.set('title', title)
    formData.set('priority', priorityRef.current?.value ?? 'medium')
    if (phaseRef.current?.value) formData.set('phase_id', phaseRef.current.value)

    startTransition(async () => {
      const result = await createTaskAction(projectId, { error: null }, formData)
      if (!result.error && result.newTask) {
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--tf-muted)',
          textAlign: 'left',
          transition: 'all 140ms var(--tf-ease)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--tf-hover)'
          e.currentTarget.style.color = 'var(--tf-ink)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--tf-muted)'
        }}
      >
        <Plus style={{ width: 14, height: 14 }} strokeWidth={2.2} />
        Aggiungi task
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: 'var(--tf-hover)',
        borderTop: '1px solid var(--tf-line)',
      }}
    >
      <input
        ref={titleRef}
        placeholder="Titolo task…"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') setOpen(false)
        }}
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 4px',
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      />
      {phases.length > 0 && (
        <select
          ref={phaseRef}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--tf-line)',
            background: 'var(--tf-panel)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: 'inherit',
          }}
        >
          <option value="">Nessuna fase</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}
      <select
        ref={priorityRef}
        defaultValue="medium"
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--tf-line)',
          background: 'var(--tf-panel)',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      >
        <option value="low">Bassa</option>
        <option value="medium">Media</option>
        <option value="high">Alta</option>
        <option value="urgent">Urgente</option>
      </select>
      <button
        onClick={handleSubmit}
        disabled={isPending}
        style={{
          flex: 1,
          height: 28,
          padding: '0 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          background: 'var(--tf-ink)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          maxWidth: 100,
        }}
      >
        {isPending ? '…' : 'Aggiungi'}
      </button>
      <button
        onClick={() => setOpen(false)}
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
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
type Filters = { status: string; priority: string; phase_id: string }

const STATUS_LABELS: Record<string, string> = {
  all: 'Tutti gli stati',
  open: 'Aperta',
  in_progress: 'In corso',
  on_hold: 'Sospesa',
  completed: 'Conclusa',
}
const STATUS_COLORS: Record<string, string> = {
  open: '#2E5BFF', in_progress: '#7C3AED', on_hold: '#9A9A9A', completed: '#00C26E',
}
const PRIORITY_LABELS: Record<string, string> = {
  all: 'Tutte le priorità', low: 'Bassa', medium: 'Media', high: 'Alta', urgent: 'Urgente',
}

function FilterBar({ filters, phases, onChange }: { filters: Filters; phases: Phase[]; onChange: (f: Filters) => void }) {
  const hasActive = filters.status !== 'all' || filters.priority !== 'all' || filters.phase_id !== 'all'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Select value={filters.status} onValueChange={(v) => v && onChange({ ...filters, status: v })}>
        <SelectTrigger size="sm">
          <SelectValue>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {filters.status !== 'all' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[filters.status] }} />
              )}
              <span style={{ fontWeight: 700 }}>{STATUS_LABELS[filters.status]}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => v && onChange({ ...filters, priority: v })}>
        <SelectTrigger size="sm">
          <SelectValue>
            <span style={{ fontWeight: 700 }}>{PRIORITY_LABELS[filters.priority]}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {phases.length > 0 && (
        <Select value={filters.phase_id} onValueChange={(v) => v && onChange({ ...filters, phase_id: v })}>
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

      {hasActive && (
        <button
          onClick={() => onChange({ status: 'all', priority: 'all', phase_id: 'all' })}
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--tf-muted)', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Azzera filtri
        </button>
      )}
    </div>
  )
}

// ─── Main TaskList ────────────────────────────────────────────────────────────
type Props = { initialTasks: Task[]; projectId: string; phases: Phase[]; members: WorkspaceMember[] }

const GRID = '28px 1fr 130px 100px 120px 90px'
const HEADER_COLS = ['Titolo', 'Stato', 'Priorità', 'Fase', 'Scadenza']

export function TaskList({ initialTasks, projectId, phases, members }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({ status: 'all', priority: 'all', phase_id: 'all' })
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTasks((prev) => {
      const serverIds = new Set(initialTasks.map((t) => t.id))
      const localOnly = prev.filter((t) => !serverIds.has(t.id))
      return [...initialTasks, ...localOnly]
    })
  }, [initialTasks])

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
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)))
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
  const BULK_STATUSES: { id: Task['status']; label: string }[] = [
    { id: 'open', label: 'Aperta' },
    { id: 'in_progress', label: 'In corso' },
    { id: 'on_hold', label: 'Sospesa' },
    { id: 'completed', label: 'Conclusa' },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <FilterBar filters={filters} phases={phases} onChange={setFilters} />
        <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--tf-muted)' }}>
          {filtered.length} task{filtered.length !== tasks.length && ` di ${tasks.length}`}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 10,
            background: 'var(--tf-ink)',
            color: '#fff',
            animation: 'fade-in 180ms var(--tf-ease)',
          }}
        >
          <CheckCircle style={{ width: 15, height: 15, color: '#D6FF3D' }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.size} selezionati</span>
          <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          {BULK_STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleBulkStatus(s.id)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              → {s.label}
            </button>
          ))}
          <button
            onClick={handleBulkDelete}
            style={{ marginLeft: 'auto', color: '#FF2E7E', padding: 6 }}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ color: '#fff', padding: 6 }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          border: '1px solid var(--tf-line)',
          borderRadius: 12,
          background: 'var(--tf-panel)',
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            gap: 12,
            padding: '10px 18px',
            borderBottom: '1px solid var(--tf-line)',
            background: 'var(--tf-bg)',
          }}
        >
          <div>
            <Checkbox
              checked={filtered.length > 0 && selected.size === filtered.length}
              onCheckedChange={toggleSelectAll}
              className="h-3.5 w-3.5"
            />
          </div>
          {HEADER_COLS.map((h) => (
            <div key={h} className="uppercase-xs" style={{ fontSize: 10 }}>{h}</div>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--tf-muted)', fontSize: 13, fontWeight: 600 }}>
            Nessun task{Object.values(filters).some((v) => v !== 'all') ? ' con questi filtri' : '. Aggiungine uno!'}.
          </div>
        ) : (
          filtered.map((task) => {
            const dateInfo = formatDate(task.due_date)
            const phase = task.phase_id ? phaseMap[task.phase_id] : null
            const isCompleted = task.status === 'completed'
            const isSelected = selected.has(task.id)
            return (
              <div
                key={task.id}
                onClick={() => setOpenTask(task)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 18px',
                  borderBottom: '1px solid var(--tf-line)',
                  background: isSelected ? 'var(--tf-selected)' : 'transparent',
                  transition: 'background 120ms var(--tf-ease)',
                  cursor: 'pointer',
                  opacity: isCompleted ? 0.55 : 1,
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--tf-hover)' }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Checkbox */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(task.id)}
                    className="h-3.5 w-3.5"
                  />
                </div>

                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {task.title}
                  </span>
                  {task.subtask_count > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--tf-muted)', flexShrink: 0 }}>
                      <ListChecks style={{ width: 12, height: 12 }} />
                      {task.subtask_count}
                    </span>
                  )}
                  {task.assignees.length > 0 && (
                    <div style={{ display: 'flex' }}>
                      {task.assignees.slice(0, 3).map((a) => (
                        <Avatar key={a.assignmentId} className="h-5 w-5 -ml-1.5 first:ml-0 border border-background">
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
                    <SelectTrigger size="sm" className="h-auto border-0 bg-transparent px-0 shadow-none">
                      <StatusBadge status={task.status} size="sm" />
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
                <PriorityBadge priority={task.priority} size="sm" />

                {/* Phase */}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tf-muted)', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  {phase ? (
                    <>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phase.name}</span>
                    </>
                  ) : <span style={{ color: 'var(--tf-muted-2)' }}>—</span>}
                </span>

                {/* Due date */}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: dateInfo?.isOverdue ? 'var(--tf-red)' : 'var(--tf-ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dateInfo ? dateInfo.label : <span style={{ color: 'var(--tf-muted-2)', fontWeight: 500 }}>—</span>}
                </span>
              </div>
            )
          })
        )}

        {/* Quick add */}
        <QuickAddTask
          projectId={projectId}
          phases={phases}
          onCreated={(newTask) => {
            setTasks((prev) => [...prev, { ...newTask, assignees: [], subtask_count: 0 }])
            setSelected(new Set())
          }}
        />
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
