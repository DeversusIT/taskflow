'use server'

import { createClient } from '@/lib/supabase/server'
import { ResetPasswordRequestSchema, ResetPasswordUpdateSchema } from '@/lib/validations/auth'

export type ResetPasswordRequestState = { error: string | null; emailSent?: boolean }
export type ResetPasswordUpdateState = { error: string | null; success?: boolean }

export async function requestResetAction(
  prevState: ResetPasswordRequestState,
  formData: FormData,
): Promise<ResetPasswordRequestState> {
  const raw = { email: formData.get('email') }

  const result = ResetPasswordRequestSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Email non valida' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password/update`,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null, emailSent: true }
}

export async function updatePasswordAction(
  prevState: ResetPasswordUpdateState,
  formData: FormData,
): Promise<ResetPasswordUpdateState> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const result = ResetPasswordUpdateSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: result.data.password })

  if (error) {
    return { error: error.message }
  }

  return { error: null, success: true }
}
