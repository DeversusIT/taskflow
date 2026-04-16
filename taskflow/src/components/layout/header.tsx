'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  userEmail: string
  userName: string
}

function getInitials(name: string, email: string): string {
  if (name.trim()) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (email[0] ?? '?').toUpperCase()
}

export function Header({ userEmail, userName }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-end border-b bg-background px-6">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent outline-none">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(userName, userEmail)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:block">
            {userName || userEmail}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{userName || 'Utente'}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            Profilo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
