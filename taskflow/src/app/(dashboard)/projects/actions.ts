'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CreateProjectSchema } from '@/lib/validations/project'

export type CreateProjectState = { error: string | null; projectId?: string }

export async function createProjectAction(
  workspaceId: string,
  prevState: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') || null,
    color: formData.get('color') || '#6366f1',
    start_date: formData.get('start_date') || null,
    due_date: formData.get('due_date') || null,
  }

  const result = CreateProjectSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  // Use service client for writes to bypass RLS chain issues
  const serviceClient = createServiceClient()

  const { count } = await serviceClient
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  const { data: project, error } = await serviceClient
    .from('projects')
    .insert({
      ...result.data,
      workspace_id: workspaceId,
      created_by: user.id,
      priority: count ?? 0,
    })
    .select('id')
    .single()

  if (error || !project) {
    return { error: error?.message ?? 'Errore creazione progetto' }
  }

  await serviceClient.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'admin',
    added_by: user.id,
  })

  revalidatePath('/', 'layout')
  return { error: null, projectId: project.id }
}
