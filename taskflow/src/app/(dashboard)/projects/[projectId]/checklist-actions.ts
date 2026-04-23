'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTaskChecklists } from '@/lib/queries/tasks'
import type { Checklist } from '@/lib/queries/tasks'

function revalidateProjectPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/kanban`)
}

export async function getChecklistsAction(
  taskId: string,
  projectId: string,
): Promise<{ data: Checklist[]; error: string | null }> {
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

  const checklists = await getTaskChecklists(taskId)
  return { data: checklists, error: null }
}

export async function createChecklistAction(
  taskId: string,
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
  const { count } = await serviceClient
    .from('checklists')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)

  const { error } = await serviceClient
    .from('checklists')
    .insert({ task_id: taskId, title: title.trim(), order_index: count ?? 0 })

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function deleteChecklistAction(
  checklistId: string,
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
    .from('checklists')
    .delete()
    .eq('id', checklistId)

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function addChecklistItemAction(
  checklistId: string,
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
  const { count } = await serviceClient
    .from('checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('checklist_id', checklistId)

  const { error } = await serviceClient
    .from('checklist_items')
    .insert({
      checklist_id: checklistId,
      title: title.trim(),
      completed: false,
      order_index: count ?? 0,
    })

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function toggleChecklistItemAction(
  itemId: string,
  checklistId: string,
  projectId: string,
  completed: boolean,
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
    .from('checklist_items')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user.id : null,
    })
    .eq('id', itemId)
    .eq('checklist_id', checklistId)

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function deleteChecklistItemAction(
  itemId: string,
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
    .from('checklist_items')
    .delete()
    .eq('id', itemId)

  if (error) return { error: error.message }

  revalidateProjectPaths(projectId)
  return { error: null }
}

export async function reorderChecklistItemsAction(
  checklistId: string,
  projectId: string,
  orderedItemIds: string[],
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
  await Promise.all(
    orderedItemIds.map((id, index) =>
      serviceClient
        .from('checklist_items')
        .update({ order_index: index })
        .eq('id', id)
        .eq('checklist_id', checklistId),
    ),
  )

  revalidateProjectPaths(projectId)
  return { error: null }
}
