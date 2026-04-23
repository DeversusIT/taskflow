'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  getSubtasksAction,
  createSubtaskAction,
  updateSubtaskAction,
  deleteSubtaskAction,
} from '@/app/(dashboard)/projects/[projectId]/subtask-actions'
import type { Subtask } from '@/lib/queries/tasks'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aperta' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'on_hold', label: 'Sospesa' },
  { value: 'completed', label: 'Conclusa' },
]

type Props = {
  parentTaskId: string
  projectId: string
}

export function SubtaskSection({ parentTaskId, projectId }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [, startTransition] = useTransition()
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    getSubtasksAction(parentTaskId, projectId).then(({ data, error }) => {
      if (error) toast.error(error)
      else setSubtasks(data)
      setLoading(false)
    })
  }, [parentTaskId, projectId])

  useEffect(() => {
    if (showAdd) addInputRef.current?.focus()
  }, [showAdd])

  const completedCount = subtasks.filter((s) => s.status === 'completed').length

  async function refetch() {
    const { data } = await getSubtasksAction(parentTaskId, projectId)
    setSubtasks(data)
  }

  function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    setShowAdd(false)
    startTransition(async () => {
      const { error } = await createSubtaskAction(parentTaskId, projectId, title)
      if (error) { toast.error(error); return }
      await refetch()
    })
  }

  function handleStatusChange(subtaskId: string, status: string) {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, status: status as Subtask['status'] } : s)),
    )
    startTransition(async () => {
      const { error } = await updateSubtaskAction(subtaskId, projectId, { status: status as 'open' | 'in_progress' | 'on_hold' | 'completed' })
      if (error) toast.error(error)
    })
  }

  function handleDelete(subtaskId: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId))
    startTransition(async () => {
      const { error } = await deleteSubtaskAction(subtaskId, projectId)
      if (error) { toast.error(error); await refetch() }
    })
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Subtask{subtasks.length > 0 ? ` ${completedCount}/${subtasks.length}` : ''}
        </p>
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Caricamento…</p>}

      {!loading && subtasks.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground italic">Nessun subtask.</p>
      )}

      <div className="space-y-1">
        {subtasks.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <CheckCircle2
              className={cn(
                'h-4 w-4 shrink-0',
                s.status === 'completed' ? 'text-green-500' : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'flex-1 text-sm truncate',
                s.status === 'completed' && 'line-through text-muted-foreground',
              )}
            >
              {s.title}
            </span>
            <Select value={s.status} onValueChange={(v) => v && handleStatusChange(s.id, v)}>
              <SelectTrigger className="h-6 w-28 text-xs border-0 shadow-none px-1 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(s.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="flex items-center gap-2">
          <Input
            ref={addInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titolo subtask…"
            className="h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setShowAdd(false); setNewTitle('') }
            }}
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newTitle.trim()}>
            Aggiungi
          </Button>
        </div>
      )}
    </div>
  )
}
