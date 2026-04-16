'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginSchema } from '@/lib/validations/auth'

export type LoginState = { error: string | null }

export async function loginAction(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = LoginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return { error: 'Email o password non corretti' }
  }

  redirect('/')
}
