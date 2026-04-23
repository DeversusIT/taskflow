'use server'

import { createClient } from '@/lib/supabase/server'

export type Comment = {
  id: string
  task_id: string
  user_id: string
  body: string
  mentions: string[]
  edited_at: string | null
  created_at: string
  profile: {
    full_name: string
    email: string
    avatar_url: string | null
  }
}

export type Attachment = {
  id: string
  task_id: string
  uploaded_by: string
  file_name: string
  file_type: string | null
  file_size: number
  storage_path: string
  created_at: string
  uploader: {
    full_name: string
    email: string
  }
}

export async function getTaskComments(taskId: string): Promise<Comment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, task_id, user_id, body, mentions, edited_at, created_at,
      profile:profiles!user_id(full_name, email, avatar_url)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getTaskComments]', error)
    return []
  }
  return (data ?? []) as unknown as Comment[]
}

export async function getTaskAttachments(taskId: string): Promise<Attachment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attachments')
    .select(`
      id, task_id, uploaded_by, file_name, file_type, file_size, storage_path, created_at,
      uploader:profiles!uploaded_by(full_name, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getTaskAttachments]', error)
    return []
  }
  return (data ?? []) as unknown as Attachment[]
}
