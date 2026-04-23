'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSubtasks } from '@/lib/queries/tasks'
import type { Subtask } from '@/lib/queries/tasks'

function revalidateProjectPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/kanban`)
}

export async function getSubtasksAction(
  parentTaskId: string,
  projectId: string,
): Promise<{ data: Subtask[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Non autenticato' }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { data: [], error: 'Accesso negato' }

  const subtasks = await getSubtasks(parentTaskId)
  return { data: subtasks, error: null }
}

export async function createSubtaskAction(
  parentTaskId: string,
  projectId: string,
  title: string,
): Promise<{ error: string | null }> {
  if (!title.trim()) return { error: 'Titolo obbligatorio' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { error: 'Accesso negato' }

  const serviceClient = createServiceClient()

  const { data: parentTask } = await serviceClient
    .from('tasks')
    .select('id')
    .eq('id', parentTaskId)
    .eq('project_id', projectId)
    .single()
  if (!parentTask) return { error: 'Task padre non trovato' }

  const { error } = await serviceClient
    .from('tasks')
    .insert({
      title: title.trim(),
      status: 'open',
      priority: 'medium',
      project_id: projectId,
      parent_task_id: parentTaskId,
      created_by: user.id,
      order_index: 0,
    })

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function updateSubtaskAction(
  subtaskId: string,
  projectId: string,
  updates: { status?: 'open' | 'in_progress' | 'on_hold' | 'completed'; title?: string },
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { error: 'Accesso negato' }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', subtaskId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function deleteSubtaskAction(
  subtaskId: string,
  projectId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { error: 'Accesso negato' }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', subtaskId)

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}
