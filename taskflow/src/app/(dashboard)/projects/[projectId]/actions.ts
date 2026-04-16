'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CreateTaskSchema, UpdateTaskSchema } from '@/lib/validations/task'

export type TaskActionState = { error: string | null; taskId?: string }

export async function createTaskAction(
  projectId: string,
  prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const raw = {
    title: formData.get('title'),
    description: formData.get('description') || null,
    status: formData.get('status') || 'open',
    priority: formData.get('priority') || 'medium',
    phase_id: formData.get('phase_id') || null,
    due_date: formData.get('due_date') || null,
    start_date: formData.get('start_date') || null,
    estimated_hours: formData.get('estimated_hours') || null,
  }

  const result = CreateTaskSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const serviceClient = createServiceClient()

  const { count } = await serviceClient
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('parent_task_id', null)

  const { data: task, error } = await serviceClient
    .from('tasks')
    .insert({
      ...result.data,
      project_id: projectId,
      created_by: user.id,
      order_index: count ?? 0,
    })
    .select('id')
    .single()

  if (error || !task) {
    return { error: error?.message ?? 'Errore creazione task' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, taskId: task.id }
}

export async function updateTaskAction(
  taskId: string,
  projectId: string,
  updates: Partial<{
    title: string
    description: string | null
    status: string
    priority: string
    phase_id: string | null
    due_date: string | null
    start_date: string | null
    estimated_hours: number | null
  }>,
): Promise<{ error: string | null }> {
  const result = UpdateTaskSchema.safeParse(updates)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('tasks')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

export async function deleteTaskAction(taskId: string, projectId: string): Promise<void> {
  const serviceClient = createServiceClient()
  await serviceClient.from('tasks').delete().eq('id', taskId)
  revalidatePath(`/projects/${projectId}`)
}

export async function assignTaskAction(
  taskId: string,
  userId: string,
  projectId: string,
): Promise<void> {
  const serviceClient = createServiceClient()
  await serviceClient
    .from('task_assignments')
    .upsert({ task_id: taskId, user_id: userId }, { onConflict: 'task_id,user_id' })
  revalidatePath(`/projects/${projectId}`)
}

export async function unassignTaskAction(
  assignmentId: string,
  projectId: string,
): Promise<void> {
  const serviceClient = createServiceClient()
  await serviceClient.from('task_assignments').delete().eq('id', assignmentId)
  revalidatePath(`/projects/${projectId}`)
}

export async function bulkUpdateStatusAction(
  taskIds: string[],
  status: 'open' | 'in_progress' | 'on_hold' | 'completed',
  projectId: string,
): Promise<void> {
  const serviceClient = createServiceClient()
  await serviceClient
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', taskIds)
  revalidatePath(`/projects/${projectId}`)
}

export async function bulkDeleteTasksAction(taskIds: string[], projectId: string): Promise<void> {
  const serviceClient = createServiceClient()
  await serviceClient.from('tasks').delete().in('id', taskIds)
  revalidatePath(`/projects/${projectId}`)
}
