'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Calendar, Clock, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { updateTaskAction, deleteTaskAction, assignTaskAction, unassignTaskAction } from '@/app/(dashboard)/projects/[projectId]/actions'
import type { Task, TaskAssignee } from '@/lib/queries/tasks'
import type { Phase } from '@/lib/queries/projects'
import type { WorkspaceMember } from '@/lib/queries/workspace'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aperta' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'on_hold', label: 'Sospesa' },
  { value: 'completed', label: 'Conclusa' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

type Props = {
  task: Task | null
  projectId: string
  phases: Phase[]
  members: WorkspaceMember[]
  onClose: () => void
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskPanel({ task, projectId, phases, members, onClose, onTaskUpdated, onTaskDeleted }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localTask, setLocalTask] = useState<Task | null>(task)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalTask(task)
    if (task && titleRef.current) {
      titleRef.current.focus()
    }
  }, [task?.id])

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
    onTaskDeleted(task!.id)
    onClose()
    startTransition(async () => {
      await deleteTaskAction(task!.id, projectId)
      router.refresh()
    })
  }

  function handleAssignToggle(member: WorkspaceMember) {
    const existing = localTask!.assignees.find((a) => a.userId === member.userId)
    if (existing) {
      const updated = { ...localTask!, assignees: localTask!.assignees.filter((a) => a.userId !== member.userId) }
      setLocalTask(updated)
      onTaskUpdated(updated)
      startTransition(async () => {
        await unassignTaskAction(existing.assignmentId, projectId)
        router.refresh()
      })
    } else {
      // Optimistic: add with empty assignmentId (will be replaced on revalidation)
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <span className="text-xs text-muted-foreground">
            Creato il {new Date(localTask.created_at).toLocaleDateString('it-IT')}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title */}
          <Input
            ref={titleRef}
            defaultValue={localTask.title}
            className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
            onBlur={(e) => {
              if (e.target.value !== task.title && e.target.value.trim()) {
                handleFieldChange('title', e.target.value.trim())
              }
            }}
          />

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Descrizione</Label>
            <Textarea
              defaultValue={localTask.description ?? ''}
              rows={4}
              placeholder="Aggiungi una descrizione…"
              className="resize-none text-sm"
              onBlur={(e) => {
                const val = e.target.value || null
                if (val !== task.description) {
                  handleFieldChange('description', val)
                }
              }}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Stato</Label>
              <Select value={localTask.status} onValueChange={(v) => v && handleFieldChange('status', v)}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Priorità</Label>
              <Select value={localTask.priority} onValueChange={(v) => v && handleFieldChange('priority', v)}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phase */}
          {phases.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Fase</Label>
              <Select
                value={localTask.phase_id ?? 'none'}
                onValueChange={(v) => v && handleFieldChange('phase_id', v === 'none' ? null : v)}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuna fase —</SelectItem>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Scadenza</Label>
              <Input
                type="date"
                defaultValue={localTask.due_date ?? ''}
                className="text-sm"
                onBlur={(e) => {
                  const val = e.target.value || null
                  if (val !== task.due_date) handleFieldChange('due_date', val)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Ore stimate</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                defaultValue={localTask.estimated_hours ?? ''}
                className="text-sm"
                onBlur={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null
                  if (val !== task.estimated_hours) handleFieldChange('estimated_hours', val)
                }}
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Assegnato a</Label>
            <div className="space-y-1">
              {members.map((member) => {
                const assigned = localTask.assignees.some((a) => a.userId === member.userId)
                return (
                  <button
                    key={member.userId}
                    onClick={() => handleAssignToggle(member)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      assigned ? 'bg-accent' : 'hover:bg-accent/50',
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.profile.fullName, member.profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left">{member.profile.fullName || member.profile.email}</span>
                    {assigned && <span className="text-xs text-primary font-medium">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Placeholders for Phase 8 & 9 */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Subtask</p>
            <p className="text-xs text-muted-foreground italic">Disponibile nella prossima fase.</p>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Commenti</p>
            <p className="text-xs text-muted-foreground italic">Disponibile nella prossima fase.</p>
          </div>
        </div>
      </div>
    </>
  )
}
