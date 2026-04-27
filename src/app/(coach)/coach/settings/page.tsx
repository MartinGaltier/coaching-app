import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Paramètres"
        description="Gérez votre profil coach."
      />
      <SettingsForm
        fullName={profile?.full_name ?? null}
        email={user!.email ?? ''}
      />
    </div>
  )
}
