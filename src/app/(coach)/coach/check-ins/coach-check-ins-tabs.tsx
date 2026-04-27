'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CheckInsClient } from './check-ins-client'
import { WeeklyCheckInsClient } from './weekly-check-ins-client'
import type { CheckInWithAthlete, WeeklyCheckInWithAthlete } from '@/types'

interface CoachCheckInsTabsProps {
  checkIns: CheckInWithAthlete[]
  weeklyCheckIns: WeeklyCheckInWithAthlete[]
  athleteNames: { id: string; full_name: string | null }[]
  photoSlots: Record<string, React.ReactNode>
}

export function CoachCheckInsTabs({
  checkIns,
  weeklyCheckIns,
  athleteNames,
  photoSlots,
}: CoachCheckInsTabsProps) {
  const pendingWeekly = weeklyCheckIns.filter(w => !w.coach_feedback).length

  return (
    <Tabs defaultValue="daily">
      <TabsList className="mb-6">
        <TabsTrigger value="daily">Quotidiens</TabsTrigger>
        <TabsTrigger value="weekly" className="gap-2">
          Hebdomadaires
          {pendingWeekly > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              {pendingWeekly}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="daily">
        <CheckInsClient checkIns={checkIns} athleteNames={athleteNames} />
      </TabsContent>

      <TabsContent value="weekly">
        <WeeklyCheckInsClient weeklyCheckIns={weeklyCheckIns} athleteNames={athleteNames} photoSlots={photoSlots} />
      </TabsContent>
    </Tabs>
  )
}
