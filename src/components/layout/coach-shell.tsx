'use client'

import { LayoutDashboard, Users, ClipboardList, BookOpen, BarChart2, Settings } from 'lucide-react'
import { AppShell } from './app-shell'
import type { TopbarUser } from './topbar'
import type { NavItem } from './sidebar'

const navItems: NavItem[] = [
  { label: 'Dashboard',   href: '/coach/dashboard',  icon: LayoutDashboard },
  { label: 'Athlètes',    href: '/coach/athletes',   icon: Users },
  { label: 'Check-ins',   href: '/coach/check-ins',  icon: ClipboardList },
  { label: 'Programmes',  href: '/coach/programs',   icon: BookOpen },
  { label: 'Analytics',   href: '/coach/analytics',  icon: BarChart2 },
  { label: 'Paramètres',  href: '/coach/settings',   icon: Settings },
]

interface CoachShellProps {
  user: TopbarUser
  children: React.ReactNode
}

export function CoachShell({ user, children }: CoachShellProps) {
  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  )
}
