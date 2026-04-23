'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut, User } from 'lucide-react'
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
  title?: string
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

export function Header({ userEmail, userName, title }: HeaderProps) {
  const router = useRouter()
  const [q, setQ] = useState('')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = userName || userEmail
  const firstName = displayName.split(' ')[0]
  const initials = getInitials(userName, userEmail)

  return (
    <header
      style={{
        height: 60,
        borderBottom: '1px solid var(--tf-line)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
        background: 'var(--tf-panel)',
        flexShrink: 0,
      }}
    >
      {title && (
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tf-muted)', whiteSpace: 'nowrap' }}>
          {title}
        </div>
      )}

      <div style={{ flex: 1, maxWidth: 420, marginLeft: title ? undefined : 'auto', position: 'relative' }}>
        <Search
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--tf-muted)',
            width: 14,
            height: 14,
          }}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca task, progetti…"
          style={{
            width: '100%',
            height: 34,
            padding: '0 12px 0 34px',
            border: '1px solid var(--tf-line)',
            borderRadius: 8,
            background: 'var(--tf-bg)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            color: 'inherit',
            transition: 'border-color 140ms var(--tf-ease), background 140ms var(--tf-ease)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--tf-ink)'
            e.currentTarget.style.background = 'var(--tf-panel)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--tf-line)'
            e.currentTarget.style.background = 'var(--tf-bg)'
          }}
        />
      </div>

      {/* Bell */}
      <button
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1px solid var(--tf-line)',
          background: 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background 140ms var(--tf-ease)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <Bell style={{ width: 15, height: 15 }} />
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#FF2E7E',
            border: '1.5px solid var(--tf-panel)',
          }}
        />
      </button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px 4px 4px',
            borderRadius: 999,
            border: '1px solid var(--tf-line)',
            background: 'var(--tf-panel)',
            transition: 'border-color 140ms var(--tf-ease)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = '#BDB9AE' }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = 'var(--tf-line)' }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--tf-ink)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              pointerEvents: 'none',
            }}
          >
            {initials}
          </div>
          <span style={{ fontWeight: 700, fontSize: 12.5, pointerEvents: 'none' }}>{firstName}</span>
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
