import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AthleteShell } from '@/components/layout/athlete-shell'

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'athlete') redirect('/coach/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <AthleteShell
      user={{
        name: profile?.full_name ?? '',
        email: user.email ?? '',
        avatarUrl: profile?.avatar_url ?? null,
      }}
    >
      {children}
    </AthleteShell>
  )
}
