'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { UpdateWorkspaceSchema } from '@/lib/validations/workspace'

export type UpdateWorkspaceState = { error: string | null; success?: boolean }

export async function updateWorkspaceAction(
  workspaceId: string,
  prevState: UpdateWorkspaceState,
  formData: FormData,
): Promise<UpdateWorkspaceState> {
  const raw = { name: formData.get('name') }

  const result = UpdateWorkspaceSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('workspaces')
    .update({ name: result.data.name })
    .eq('id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/workspace/settings')
  return { error: null, success: true }
}
