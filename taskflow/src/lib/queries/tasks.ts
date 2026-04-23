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
  subtask_count: number
  assignees: TaskAssignee[]
}

export type Subtask = {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'on_hold' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  assignees: TaskAssignee[]
}

export type ChecklistItem = {
  id: string
  checklist_id: string
  title: string
  completed: boolean
  order_index: number
}

export type Checklist = {
  id: string
  task_id: string
  title: string
  order_index: number
  items: ChecklistItem[]
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = await createClient()

  // Step 1: fetch root tasks
  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, title, description, status, priority, phase_id, due_date, start_date, estimated_hours, order_index, created_by, created_at, updated_at',
    )
    .eq('project_id', projectId)
    .is('parent_task_id', null)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[getProjectTasks] query error:', error.message, error.code)
    return []
  }
  if (!data || data.length === 0) return []

  const taskIds = data.map((t) => t.id)

  // Step 2: fetch assignees separately
  // NOTE: profiles!user_id disambiguates the two FK from task_assignments to profiles
  const { data: assignments, error: assignError } = await supabase
    .from('task_assignments')
    .select('id, task_id, user_id, profiles!user_id(full_name, email, avatar_url)')
    .in('task_id', taskIds)

  if (assignError) {
    console.error('[getProjectTasks] assignments error:', assignError.message, assignError.code)
  }

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

  // Step 3: fetch subtask counts
  const { data: subtaskRows } = await supabase
    .from('tasks')
    .select('parent_task_id')
    .in('parent_task_id', taskIds)

  const subtaskCountMap: Record<string, number> = {}
  for (const r of (subtaskRows ?? []) as Array<{ parent_task_id: string | null }>) {
    if (r.parent_task_id) {
      subtaskCountMap[r.parent_task_id] = (subtaskCountMap[r.parent_task_id] ?? 0) + 1
    }
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
      subtask_count: subtaskCountMap[t.id] ?? 0,
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

export async function getSubtasks(parentTaskId: string): Promise<Subtask[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date')
    .eq('parent_task_id', parentTaskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getSubtasks] error:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  const subtaskIds = data.map((t) => t.id)
  const { data: assignments } = await supabase
    .from('task_assignments')
    .select('id, task_id, user_id, profiles!user_id(full_name, email, avatar_url)')
    .in('task_id', subtaskIds)

  const assignMap = new Map<string, TaskAssignee[]>()
  for (const a of (assignments ?? []) as Array<{
    id: string
    task_id: string
    user_id: string
    profiles: { full_name: string; email: string; avatar_url: string | null } | null
  }>) {
    const list = assignMap.get(a.task_id) ?? []
    list.push({
      assignmentId: a.id,
      userId: a.user_id,
      fullName: a.profiles?.full_name ?? '',
      email: a.profiles?.email ?? '',
      avatarUrl: a.profiles?.avatar_url ?? null,
    })
    assignMap.set(a.task_id, list)
  }

  return data.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as Subtask['status'],
    priority: t.priority as Subtask['priority'],
    due_date: t.due_date,
    assignees: assignMap.get(t.id) ?? [],
  }))
}

export async function getTaskChecklists(taskId: string): Promise<Checklist[]> {
  const supabase = await createClient()

  const { data: checklists, error } = await supabase
    .from('checklists')
    .select('id, task_id, title, order_index')
    .eq('task_id', taskId)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[getTaskChecklists] error:', error.message)
    return []
  }
  if (!checklists || checklists.length === 0) return []

  const checklistIds = checklists.map((c) => c.id)
  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('id, checklist_id, title, completed, order_index')
    .in('checklist_id', checklistIds)
    .order('order_index', { ascending: true })

  if (itemsError) {
    console.error('[getTaskChecklists] items error:', itemsError.message)
  }

  const itemsMap = new Map<string, ChecklistItem[]>()
  for (const item of (items ?? []) as Array<{
    id: string
    checklist_id: string
    title: string
    completed: boolean
    order_index: number
  }>) {
    const list = itemsMap.get(item.checklist_id) ?? []
    list.push({
      id: item.id,
      checklist_id: item.checklist_id,
      title: item.title,
      completed: item.completed,
      order_index: item.order_index,
    })
    itemsMap.set(item.checklist_id, list)
  }

  return checklists.map((c) => ({
    id: c.id,
    task_id: c.task_id,
    title: c.title,
    order_index: c.order_index,
    items: itemsMap.get(c.id) ?? [],
  }))
}
