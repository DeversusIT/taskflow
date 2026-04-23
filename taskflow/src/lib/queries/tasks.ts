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

  // Step 1: fetch tasks without join
  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, title, description, status, priority, phase_id, due_date, start_date, estimated_hours, order_index, created_by, created_at, updated_at',
    )
    .eq('project_id', projectId)
    .is('parent_task_id', null) // solo task radice, non subtask
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[getProjectTasks] query error:', error.message, error.code)
    return []
  }
  if (!data || data.length === 0) return []

  // Step 2: fetch assignees separately
  // NOTE: we use profiles!user_id to disambiguate because task_assignments
  // has TWO foreign keys to profiles (user_id and assigned_by).
  // Without the hint, PostgREST silently returns empty results.
  const taskIds = data.map((t) => t.id)
  const { data: assignments, error: assignError } = await supabase
    .from('task_assignments')
    .select('id, task_id, user_id, profiles!user_id(full_name, email, avatar_url)')
    .in('task_id', taskIds)

  if (assignError) {
    console.error('[getProjectTasks] assignments error:', assignError.message, assignError.code)
    // Return tasks without assignees rather than failing entirely
  }

  // Build a map of task_id -> assignments
  const assignMap = new Map<string, Array<{
    id: string
    user_id: string
    profiles: { full_name: string; email: string; avatar_url: string | null } | null
  }>>()
  for (const a of (assignments ?? []) as Array<{
    id: string
    task_id: string
    user_id: string
    profiles: { full_name: string; email: string; avatar_url: string | null } | null
  }>) {
    const list = assignMap.get(a.task_id) ?? []
    list.push(a)
    assignMap.set(a.task_id, list)
  }

  return data.map((t) => {
    const taskAssignees = assignMap.get(t.id) ?? []

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
      assignees: taskAssignees.map((a) => ({
        assignmentId: a.id,
        userId: a.user_id,
        fullName: a.profiles?.full_name ?? '',
        email: a.profiles?.email ?? '',
        avatarUrl: a.profiles?.avatar_url ?? null,
      })),
    }
  })
}
