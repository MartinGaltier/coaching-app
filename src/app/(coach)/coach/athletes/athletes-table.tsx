'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { AthleteWithAlerts, Alert } from '@/types'

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function alertVariant(severity: Alert['severity']) {
  return severity === 'critical' ? 'destructive' as const : 'warning' as const
}

const trendLabel: Record<NonNullable<AthleteWithAlerts['weight_trend']>, string> = {
  up: '↑ Hausse',
  down: '↓ Baisse',
  stable: '→ Stable',
}

interface AthletesTableProps {
  athletes: AthleteWithAlerts[]
}

export function AthletesTable({ athletes }: AthletesTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [alertsOnly, setAlertsOnly] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return athletes.filter(a => {
      if (q && !(a.full_name ?? '').toLowerCase().includes(q)) return false
      if (statusFilter === 'active' && !a.is_active) return false
      if (statusFilter === 'inactive' && a.is_active) return false
      if (alertsOnly && a.alerts.length === 0) return false
      return true
    })
  }, [athletes, search, statusFilter, alertsOnly])

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un athlète…"
            value={search}
            onChange={e => { setSearch(e.target.value) }}
            className="pl-8 h-8 text-sm w-56"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Inactifs'}
            </Button>
          ))}
        </div>

        <Button
          variant={alertsOnly ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setAlertsOnly(v => !v)}
        >
          Avec alertes
        </Button>

        <span className="text-xs text-muted-foreground">
          {filtered.length} athlète{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun athlète"
          description={search ? `Aucun résultat pour « ${search} »` : 'Aucun athlète ne correspond aux filtres.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Athlète</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Dernier check-in</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Poids</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Alertes</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((athlete, i) => (
                <tr
                  key={athlete.id}
                  className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-xs">{initials(athlete.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{athlete.full_name ?? 'Athlète'}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {athlete.last_check_in
                      ? new Date(athlete.last_check_in.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge variant={athlete.is_active ? 'success' : 'outline'}>
                      {athlete.is_active ? 'Actif' : 'Inactif'}
                    </StatusBadge>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {athlete.weight_trend ? trendLabel[athlete.weight_trend] : '—'}
                  </td>

                  <td className="px-4 py-3">
                    {athlete.alerts.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {athlete.alerts.map(a => (
                          <StatusBadge key={a.type} variant={alertVariant(a.severity)}>
                            {a.label}
                          </StatusBadge>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Link href={`/coach/athletes/${athlete.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        Voir <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
