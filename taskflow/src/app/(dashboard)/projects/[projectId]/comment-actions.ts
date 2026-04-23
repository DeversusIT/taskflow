'use server'

import { createClient } from '@/lib/supabase/server'
import { getTaskComments } from '@/lib/queries/comments'
import type { Comment } from '@/lib/queries/comments'

export async function getCommentsAction(
  taskId: string,
  projectId: string,
): Promise<{ data: Comment[]; error: string | null }> {
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

  const comments = await getTaskComments(taskId)
  return { data: comments, error: null }
}

export async function createCommentAction(
  taskId: string,
  projectId: string,
  body: string,
  mentions: string[] = [],
): Promise<{ error: string | null; comment?: Comment }> {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Commento vuoto' }

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

  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: user.id, body: trimmed, mentions })
    .select(`id, task_id, user_id, body, mentions, edited_at, created_at, profile:profiles!user_id(full_name, email, avatar_url)`)
    .single()

  if (error || !data) return { error: error?.message ?? 'Errore creazione commento' }
  return { error: null, comment: data as unknown as Comment }
}

export async function updateCommentAction(
  commentId: string,
  body: string,
): Promise<{ error: string | null }> {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Commento vuoto' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const { error } = await supabase
    .from('comments')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteCommentAction(
  commentId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: error.message }
  return { error: null }
}
