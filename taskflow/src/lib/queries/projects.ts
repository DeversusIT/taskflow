import { createClient } from '@/lib/supabase/server'

export type ProjectSummary = {
  id: string
  name: string
  color: string
  status: 'active' | 'archived' | 'completed'
  priority: number
}

export type ProjectDetail = ProjectSummary & {
  description: string | null
  start_date: string | null
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Phase = {
  id: string
  name: string
  description: string | null
  color: string
  status: 'pending' | 'in_progress' | 'completed'
  order_index: number
  start_date: string | null
  due_date: string | null
  project_id: string
}

/** Restituisce tutti i progetti attivi/completati del workspace (non archiviati separatamente). */
export async function getWorkspaceProjects(workspaceId: string): Promise<ProjectSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, color, status, priority')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('priority', { ascending: true })

  return (data ?? []) as ProjectSummary[]
}

/** Restituisce i dettagli di un singolo progetto. */
export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, color, status, priority, description, start_date, due_date, created_by, created_at, updated_at')
    .eq('id', projectId)
    .maybeSingle()

  return data as ProjectDetail | null
}

/** Restituisce le fasi di un progetto ordinate per order_index. */
export async function getProjectPhases(projectId: string): Promise<Phase[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('phases')
    .select('id, name, description, color, status, order_index, start_date, due_date, project_id')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })

  return (data ?? []) as Phase[]
}
