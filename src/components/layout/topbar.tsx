'use client'

import { useTransition } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/(auth)/actions'

export interface TopbarUser {
  name: string
  email: string
  avatarUrl?: string | null
}

interface TopbarProps {
  onMobileMenuOpen: () => void
  user: TopbarUser
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email
  return source
    .split(/[\s@]/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Topbar({ onMobileMenuOpen, user }: TopbarProps) {
  const [isPending, startTransition] = useTransition()
  const initials = getInitials(user.name, user.email)
  const displayName = user.name || user.email

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      {/* Left — mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onMobileMenuOpen}
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-4" />
      </Button>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right — user dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 items-center gap-2 rounded-lg px-2"
          >
            <Avatar size="sm">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
              {displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="px-2 py-1.5">
            <p className="text-sm font-medium text-foreground leading-tight">
              {user.name || '—'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isPending}
            onClick={() => startTransition(() => logout())}
          >
            <LogOut />
            {isPending ? 'Déconnexion…' : 'Se déconnecter'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
