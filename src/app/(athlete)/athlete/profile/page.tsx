import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from './profile-form'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = data as Profile

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mon profil"
        description="Gère tes informations personnelles."
      />
      <ProfileForm
        fullName={profile.full_name}
        email={user!.email ?? ''}
        role={profile.role}
      />
    </div>
  )
}
