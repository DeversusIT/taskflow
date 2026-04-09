export const TASK_STATUSES = ['open', 'in_progress', 'on_hold', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Aperta',
  in_progress: 'In corso',
  on_hold: 'Sospesa',
  completed: 'Conclusa',
}

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-slate-500 bg-slate-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-orange-600 bg-orange-100',
  urgent: 'text-red-600 bg-red-100',
}

export const PROJECT_STATUSES = ['active', 'archived', 'completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const WORKSPACE_ROLES = ['super_admin', 'member'] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const PROJECT_ROLES = ['admin', 'editor', 'viewer'] as const
export type ProjectRole = (typeof PROJECT_ROLES)[number]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

export const NOTIFICATION_TYPES = [
  'mention',
  'assignment',
  'reminder',
  'comment',
  'status_change',
  'dependency_unblocked',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
