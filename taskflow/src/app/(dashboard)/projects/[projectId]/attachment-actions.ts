'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTaskAttachments } from '@/lib/queries/comments'
import type { Attachment } from '@/lib/queries/comments'

const MAX_SIZE = 10 * 1024 * 1024

export async function getAttachmentsAction(
  taskId: string,
  projectId: string,
): Promise<{ data: Attachment[]; error: string | null }> {
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

  const attachments = await getTaskAttachments(taskId)
  return { data: attachments, error: null }
}

export async function uploadAttachmentAction(
  taskId: string,
  projectId: string,
  formData: FormData,
): Promise<{ error: string | null; attachment?: Attachment }> {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'Nessun file' }
  if (file.size > MAX_SIZE) return { error: 'File troppo grande (max 10MB)' }

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
  if (!['admin', 'editor'].includes(membership.role)) return { error: 'Permessi insufficienti' }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  const storagePath = `${taskId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`

  const service = createServiceClient()
  const bytes = await file.arrayBuffer()

  const { error: storageError } = await service.storage
    .from('attachments')
    .upload(storagePath, bytes, { contentType: file.type || 'application/octet-stream' })

  if (storageError) return { error: storageError.message }

  const { data, error: dbError } = await service
    .from('attachments')
    .insert({
      task_id: taskId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
      storage_path: storagePath,
    })
    .select(`id, task_id, uploaded_by, file_name, file_type, file_size, storage_path, created_at, uploader:profiles!uploaded_by(full_name, email)`)
    .single()

  if (dbError || !data) {
    await service.storage.from('attachments').remove([storagePath])
    return { error: dbError?.message ?? 'Errore salvataggio allegato' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, attachment: data as unknown as Attachment }
}

export async function deleteAttachmentAction(
  attachmentId: string,
  storagePath: string,
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

  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)

  if (dbError) return { error: dbError.message }

  const service = createServiceClient()
  await service.storage.from('attachments').remove([storagePath])

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

export async function getSignedUrlAction(
  storagePath: string,
  projectId: string,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'Non autenticato' }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { url: null, error: 'Accesso negato' }

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from('attachments')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return { url: null, error: error?.message ?? 'Errore URL' }
  return { url: data.signedUrl, error: null }
}
