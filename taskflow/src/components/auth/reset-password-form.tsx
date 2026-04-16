'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  requestResetAction,
  updatePasswordAction,
  type ResetPasswordRequestState,
  type ResetPasswordUpdateState,
} from '@/app/(auth)/reset-password/actions'

// --- Richiesta reset ---

const requestInitialState: ResetPasswordRequestState = { error: null }

export function RequestResetForm() {
  const [state, action, isPending] = useActionState(requestResetAction, requestInitialState)

  if (state.emailSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email inviata</CardTitle>
          <CardDescription>
            Abbiamo inviato un link per reimpostare la password. Controlla la tua casella email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Torna al login
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reimposta password</CardTitle>
        <CardDescription>
          Inserisci la tua email e ti invieremo un link per reimpostare la password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@esempio.com"
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Invio in corso...' : 'Invia link di reset'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Torna al login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

// --- Nuova password (dopo click sul link email) ---

const updateInitialState: ResetPasswordUpdateState = { error: null }

export function UpdatePasswordForm() {
  const router = useRouter()
  const [state, action, isPending] = useActionState(updatePasswordAction, updateInitialState)

  useEffect(() => {
    if (state.success) {
      router.push('/login?message=password_updated')
    }
  }, [state.success, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuova password</CardTitle>
        <CardDescription>Scegli una nuova password per il tuo account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Nuova password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 8 caratteri"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Aggiornamento...' : 'Aggiorna password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
