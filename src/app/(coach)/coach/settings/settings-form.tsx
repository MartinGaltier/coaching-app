'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateCoachProfile } from './actions'

interface SettingsFormProps {
  fullName: string | null
  email: string
}

export function SettingsForm({ fullName, email }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(fullName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '?'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateCoachProfile(name)
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mon profil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{name || 'Aucun nom'}</p>
              <p className="text-xs text-muted-foreground capitalize">Coach</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full-name">Nom complet</Label>
            <Input
              id="full-name"
              value={name}
              onChange={e => { setName(e.target.value); setSuccess(false) }}
              placeholder="Prénom Nom"
              disabled={isPending}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input value={email} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié ici.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">Profil mis à jour ✓</p>}
      </div>
    </form>
  )
}
