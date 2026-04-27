import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoachShell } from '@/components/layout/coach-shell'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'coach') redirect('/athlete/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <CoachShell
      user={{
        name: profile?.full_name ?? '',
        email: user.email ?? '',
        avatarUrl: profile?.avatar_url ?? null,
      }}
    >
      {children}
    </CoachShell>
  )
}
