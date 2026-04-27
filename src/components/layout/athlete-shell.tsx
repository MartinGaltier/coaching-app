'use client'

import { LayoutDashboard, Dumbbell, Calendar, TrendingUp, ClipboardCheck, UserRound } from 'lucide-react'
import { AppShell } from './app-shell'
import type { TopbarUser } from './topbar'
import type { NavItem } from './sidebar'

const navItems: NavItem[] = [
  { label: 'Dashboard',   href: '/athlete/dashboard', icon: LayoutDashboard },
  { label: 'Programme',   href: '/athlete/program',   icon: Calendar },
  { label: 'Séances',     href: '/athlete/workouts',  icon: Dumbbell },
  { label: 'Progression', href: '/athlete/progress',  icon: TrendingUp },
  { label: 'Check-in',    href: '/athlete/check-in',  icon: ClipboardCheck },
  { label: 'Profil',      href: '/athlete/profile',   icon: UserRound },
]

interface AthleteShellProps {
  user: TopbarUser
  children: React.ReactNode
}

export function AthleteShell({ user, children }: AthleteShellProps) {
  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  )
}
