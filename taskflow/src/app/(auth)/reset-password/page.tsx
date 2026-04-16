import type { Metadata } from 'next'
import { RequestResetForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Reimposta password — TaskFlow',
}

export default function ResetPasswordPage() {
  return <RequestResetForm />
}
