import type { Metadata } from 'next'
import { UpdatePasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Nuova password — TaskFlow',
}

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />
}
