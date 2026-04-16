'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterSchema } from '@/lib/validations/auth'

export type RegisterState = { error: string | null; emailSent?: boolean }

export async function registerAction(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = RegisterSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { full_name: result.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Se l'utente è già confermato (email confirmation disabilitata), redirect diretto
  if (data.session) {
    redirect('/')
  }

  // Email di conferma inviata
  return { error: null, emailSent: true }
}
