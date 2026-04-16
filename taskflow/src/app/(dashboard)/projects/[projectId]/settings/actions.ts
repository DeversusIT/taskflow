'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  UpdateProjectSchema,
  CreatePhaseSchema,
  UpdatePhaseSchema,
} from '@/lib/validations/project'

export type ProjectActionState = { error: string | null; success?: boolean }

export async function updateProjectAction(
  projectId: string,
  prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') || null,
    color: formData.get('color'),
    start_date: formData.get('start_date') || null,
    due_date: formData.get('due_date') || null,
  }

  const result = UpdateProjectSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/settings`)
  revalidatePath('/', 'layout')
  return { error: null, success: true }
}

export async function archiveProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projects')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', projectId)

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function deleteProjectAction(projectId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('projects').delete().eq('id', projectId)

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function createPhaseAction(
  projectId: string,
  prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') || null,
    color: formData.get('color') || '#6366f1',
  }

  const result = CreatePhaseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()

  const { count } = await supabase
    .from('phases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { error } = await supabase.from('phases').insert({
    ...result.data,
    project_id: projectId,
    order_index: count ?? 0,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/settings`)
  return { error: null, success: true }
}

export async function updatePhaseAction(
  phaseId: string,
  projectId: string,
  prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') || null,
    color: formData.get('color') || undefined,
  }

  const result = UpdatePhaseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('phases').update(result.data).eq('id', phaseId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/settings`)
  return { error: null, success: true }
}

export async function deletePhaseAction(phaseId: string, projectId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('phases').delete().eq('id', phaseId)
  revalidatePath(`/projects/${projectId}/settings`)
}

export async function reorderPhasesAction(
  phases: { id: string; order_index: number }[],
  projectId: string,
): Promise<void> {
  const supabase = await createClient()
  await Promise.all(
    phases.map(({ id, order_index }) =>
      supabase.from('phases').update({ order_index }).eq('id', id).eq('project_id', projectId),
    ),
  )
  revalidatePath(`/projects/${projectId}/settings`)
}
