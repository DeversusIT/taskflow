'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loginAction, type LoginState } from '@/app/(auth)/login/actions'

const initialState: LoginState = { error: null }

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, initialState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accedi</CardTitle>
        <CardDescription>Inserisci le tue credenziali per continuare</CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <div className="text-right">
              <Link
                href="/reset-password"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Password dimenticata?
              </Link>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Accesso in corso...' : 'Accedi'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Non hai un account?{' '}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Registrati
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
