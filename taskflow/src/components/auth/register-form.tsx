'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { registerAction, type RegisterState } from '@/app/(auth)/register/actions'

const initialState: RegisterState = { error: null }

export function RegisterForm() {
  const [state, action, isPending] = useActionState(registerAction, initialState)

  if (state.emailSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Controlla la tua email</CardTitle>
          <CardDescription>
            Abbiamo inviato un link di conferma al tuo indirizzo email. Clicca sul link per
            completare la registrazione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Già confermato?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea account</CardTitle>
        <CardDescription>Registrati per iniziare a usare TaskFlow</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Mario Rossi"
              autoComplete="name"
              required
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 8 caratteri"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Registrazione in corso...' : 'Crea account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Hai già un account?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Accedi
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
