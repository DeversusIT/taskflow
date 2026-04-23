'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { updateTaskAction, deleteTaskAction, assignTaskAction, unassignTaskAction } from '@/app/(dashboard)/projects/[projectId]/actions'
import { SubtaskSection } from '@/components/tasks/subtask-section'
import { ChecklistSection } from '@/components/tasks/checklist-section'
import { CommentList } from '@/components/comments/comment-list'
import { AttachmentList } from '@/components/attachments/attachment-list'
import { StatusBadge } from '@/components/shared/status-badge'
import { PriorityBadge } from '@/components/shared/priority-badge'
import type { Task, TaskAssignee } from '@/lib/queries/tasks'
import type { Phase } from '@/lib/queries/projects'
import type { WorkspaceMember } from '@/lib/queries/workspace'

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

type Props = {
  task: Task | null
  projectId: string
  phases: Phase[]
  members: WorkspaceMember[]
  currentUserId: string
  onClose: () => void
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskPanel({ task, projectId, phases, members, currentUserId, onClose, onTaskUpdated, onTaskDeleted }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localTask, setLocalTask] = useState<Task | null>(task)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalTask(task)
  }, [task])

  if (!task || !localTask) return null

  function handleFieldChange(field: keyof Task, value: unknown) {
    if (!localTask) return
    const updated = { ...localTask, [field]: value }
    setLocalTask(updated)
    onTaskUpdated(updated)
    startTransition(async () => {
      await updateTaskAction(task!.id, projectId, { [field]: value })
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('Eliminare questo task?')) return
    const taskId = task!.id
    onClose()
    startTransition(async () => {
      const { error } = await deleteTaskAction(taskId, projectId)
      if (error) {
        toast.error('Errore eliminazione task')
        return
      }
      onTaskDeleted(taskId)
    })
  }

  function handleAssignToggle(member: WorkspaceMember) {
    const existing = localTask!.assignees.find((a) => a.userId === member.userId)
    if (existing) {
      if (existing.assignmentId === 'pending') return
      const updated = { ...localTask!, assignees: localTask!.assignees.filter((a) => a.userId !== member.userId) }
      setLocalTask(updated)
      onTaskUpdated(updated)
      startTransition(async () => {
        await unassignTaskAction(existing.assignmentId, projectId)
        router.refresh()
      })
    } else {
      const newAssignee: TaskAssignee = {
        assignmentId: 'pending',
        userId: member.userId,
        fullName: member.profile.fullName,
        email: member.profile.email,
        avatarUrl: member.profile.avatarUrl,
      }
      const updated = { ...localTask!, assignees: [...localTask!.assignees, newAssignee] }
      setLocalTask(updated)
      onTaskUpdated(updated)
      startTransition(async () => {
        await assignTaskAction(task!.id, member.userId, projectId)
        router.refresh()
      })
    }
  }

  const phaseOptions = [
    { id: 'none', label: '— Nessuna fase —', color: undefined as string | undefined },
    ...phases.map((p) => ({ id: p.id, label: p.name, color: p.color })),
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,10,10,0.3)',
          zIndex: 900,
          animation: 'fade-in 180ms var(--tf-ease)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 520,
          background: 'var(--tf-panel)',
          borderLeft: '1px solid var(--tf-line)',
          zIndex: 910,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slide-in-right 260ms var(--tf-ease)',
          boxShadow: '-20px 0 60px -20px rgba(10,10,10,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 20px',
            borderBottom: '1px solid var(--tf-line)',
          }}
        >
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button
              onClick={handleDelete}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid var(--tf-line)',
                background: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--tf-red)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid var(--tf-line)',
                background: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--tf-muted)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)'; e.currentTarget.style.color = 'var(--tf-ink)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tf-muted)' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Title */}
          <input
            ref={titleRef}
            value={localTask.title}
            onChange={(e) => setLocalTask((prev) => prev ? { ...prev, title: e.target.value } : null)}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== task.title) {
                handleFieldChange('title', e.target.value.trim())
              }
            }}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              padding: 0,
              marginBottom: 18,
              fontFamily: 'inherit',
              color: 'inherit',
            }}
          />

          {/* Field grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: '12px 16px',
              alignItems: 'center',
              marginBottom: 22,
            }}
          >
            {/* Status */}
            <div className="uppercase-xs">Stato</div>
            <div>
              <Select value={localTask.status} onValueChange={(v) => v && handleFieldChange('status', v)}>
                <SelectTrigger size="sm" className="h-auto border-0 bg-transparent px-0 shadow-none w-auto">
                  <StatusBadge status={localTask.status} size="sm" />
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
            <div className="uppercase-xs">Priorità</div>
            <div>
              <Select value={localTask.priority} onValueChange={(v) => v && handleFieldChange('priority', v)}>
                <SelectTrigger size="sm" className="h-auto border-0 bg-transparent px-0 shadow-none w-auto">
                  <PriorityBadge priority={localTask.priority} size="sm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phase */}
            {phases.length > 0 && (
              <>
                <div className="uppercase-xs">Fase</div>
                <div>
                  <Select
                    value={localTask.phase_id ?? 'none'}
                    onValueChange={(v) => v && handleFieldChange('phase_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger size="sm" className="border bg-transparent">
                      <SelectValue>
                        {phaseOptions.find((p) => p.id === (localTask.phase_id ?? 'none')) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {localTask.phase_id && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: phaseOptions.find((p) => p.id === localTask.phase_id)?.color,
                                }}
                              />
                            )}
                            <span style={{ fontWeight: 600, fontSize: 12 }}>
                              {phaseOptions.find((p) => p.id === (localTask.phase_id ?? 'none'))?.label}
                            </span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {phaseOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {p.color && (
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                            )}
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Due date */}
            <div className="uppercase-xs">Scadenza</div>
            <div>
              <input
                type="date"
                value={localTask.due_date ?? ''}
                onChange={(e) => setLocalTask((prev) => prev ? { ...prev, due_date: e.target.value || null } : null)}
                onBlur={(e) => {
                  const val = e.target.value || null
                  if (val !== task.due_date) handleFieldChange('due_date', val)
                }}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--tf-line)',
                  borderRadius: 8,
                  background: 'var(--tf-panel)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'inherit',
                }}
              />
            </div>

            {/* Ore stimate */}
            <div className="uppercase-xs">Ore stimate</div>
            <div>
              <input
                type="number"
                min="0"
                step="0.5"
                value={localTask.estimated_hours ?? ''}
                onChange={(e) => setLocalTask((prev) => prev ? { ...prev, estimated_hours: e.target.value ? parseFloat(e.target.value) : null } : null)}
                onBlur={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null
                  if (val !== task.estimated_hours) handleFieldChange('estimated_hours', val)
                }}
                style={{
                  width: 80,
                  padding: '6px 10px',
                  border: '1px solid var(--tf-line)',
                  borderRadius: 8,
                  background: 'var(--tf-panel)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'inherit',
                }}
              />
            </div>

            {/* Assignees */}
            <div className="uppercase-xs" style={{ alignSelf: 'start', paddingTop: 6 }}>Assegnatari</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {members.map((member) => {
                const assignee = localTask.assignees.find((a) => a.userId === member.userId)
                const assigned = !!assignee
                const isPending = assignee?.assignmentId === 'pending'
                const firstName = member.profile.fullName?.split(' ')[0] ?? member.profile.email
                return (
                  <button
                    key={member.userId}
                    onClick={() => handleAssignToggle(member)}
                    disabled={isPending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 10px 3px 3px',
                      borderRadius: 999,
                      background: assigned ? 'var(--tf-ink)' : 'var(--tf-panel)',
                      color: assigned ? '#fff' : 'var(--tf-ink)',
                      border: `1px solid ${assigned ? 'var(--tf-ink)' : 'var(--tf-line)'}`,
                      fontSize: 11.5,
                      fontWeight: 700,
                      transition: 'all 140ms var(--tf-ease)',
                      opacity: isPending ? 0.6 : 1,
                      cursor: isPending ? 'wait' : 'pointer',
                    }}
                  >
                    <Avatar className="h-[18px] w-[18px]">
                      <AvatarFallback className="text-[9px]">
                        {getInitials(member.profile.fullName, member.profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    {firstName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="uppercase-xs" style={{ marginBottom: 8 }}>Descrizione</div>
          <textarea
            value={localTask.description ?? ''}
            placeholder="Aggiungi una descrizione…"
            onChange={(e) => setLocalTask((prev) => prev ? { ...prev, description: e.target.value || null } : null)}
            onBlur={(e) => {
              const val = e.target.value || null
              if (val !== task.description) handleFieldChange('description', val)
            }}
            rows={4}
            style={{
              width: '100%',
              resize: 'vertical',
              padding: 12,
              border: '1px solid var(--tf-line)',
              borderRadius: 10,
              background: 'var(--tf-bg)',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
              fontFamily: 'inherit',
              color: 'inherit',
              marginBottom: 22,
            }}
          />

          <SubtaskSection parentTaskId={localTask.id} projectId={projectId} />
          <ChecklistSection taskId={localTask.id} projectId={projectId} />

          <div style={{ borderTop: '1px solid var(--tf-line)', margin: '22px 0' }} />

          <AttachmentList
            taskId={localTask.id}
            projectId={projectId}
            currentUserId={currentUserId}
          />

          <div style={{ borderTop: '1px solid var(--tf-line)', margin: '22px 0' }} />

          <CommentList
            taskId={localTask.id}
            projectId={projectId}
            currentUserId={currentUserId}
            members={members}
          />
        </div>
      </div>
    </>
  )
}
