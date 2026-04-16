'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { InviteMemberSchema, UpdateMemberRoleSchema } from '@/lib/validations/workspace'

export type InviteState = { error: string | null; success?: boolean }
export type MemberActionState = { error: string | null }

export async function inviteMemberAction(
  workspaceId: string,
  prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const raw = {
    email: formData.get('email'),
    role: formData.get('role'),
  }

  const result = InviteMemberSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  // Verifica che l'utente corrente sia super_admin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'super_admin') {
    return { error: 'Non hai i permessi per invitare membri' }
  }

  // Invia invito via Supabase Admin
  const serviceClient = createServiceClient()
  const { error } = await serviceClient.auth.admin.inviteUserByEmail(result.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: {
      pending_workspace_id: workspaceId,
      pending_role: result.data.role,
    },
  })

  if (error) return { error: error.message }

  revalidatePath('/workspace/members')
  return { error: null, success: true }
}

export async function updateMemberRoleAction(
  memberId: string,
  workspaceId: string,
  prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const raw = { role: formData.get('role') }

  const result = UpdateMemberRoleSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Ruolo non valido' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: result.data.role })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/workspace/members')
  return { error: null }
}

export async function removeMemberAction(memberId: string, workspaceId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)

  revalidatePath('/workspace/members')
}
