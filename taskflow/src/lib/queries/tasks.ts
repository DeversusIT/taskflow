import { createClient } from '@/lib/supabase/server'

export type TaskAssignee = {
  assignmentId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
}

export type Task = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'on_hold' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  phase_id: string | null
  due_date: string | null
  start_date: string | null
  estimated_hours: number | null
  order_index: number
  created_by: string
  created_at: string
  updated_at: string
  assignees: TaskAssignee[]
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tasks')
    .select(
      'id, title, description, status, priority, phase_id, due_date, start_date, estimated_hours, order_index, created_by, created_at, updated_at, task_assignments(id, user_id, profiles(full_name, email, avatar_url))',
    )
    .eq('project_id', projectId)
    .is('parent_task_id', null) // solo task radice, non subtask
    .order('order_index', { ascending: true })

  if (!data) return []

  return data.map((t) => {
    const rawAssignees = t.task_assignments as unknown as Array<{
      id: string
      user_id: string
      profiles: { full_name: string; email: string; avatar_url: string | null } | null
    }>

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as Task['status'],
      priority: t.priority as Task['priority'],
      phase_id: t.phase_id,
      due_date: t.due_date,
      start_date: t.start_date,
      estimated_hours: t.estimated_hours,
      order_index: t.order_index,
      created_by: t.created_by,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assignees: (rawAssignees ?? []).map((a) => ({
        assignmentId: a.id,
        userId: a.user_id,
        fullName: a.profiles?.full_name ?? '',
        email: a.profiles?.email ?? '',
        avatarUrl: a.profiles?.avatar_url ?? null,
      })),
    }
  })
}
