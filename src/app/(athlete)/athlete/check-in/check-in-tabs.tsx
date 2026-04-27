'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CheckInForm } from './check-in-form'
import { WeeklyCheckInForm } from './weekly-check-in-form'
import type { CheckIn, WeeklyCheckIn, ProgressPhotoWithUrl } from '@/types'

interface CheckInTabsProps {
  today: string
  weekStart: string
  existingDaily: CheckIn | null
  existingWeekly: WeeklyCheckIn | null
  adherenceAuto: number | null
  existingPhotos: ProgressPhotoWithUrl[]
}

export function CheckInTabs({
  today,
  weekStart,
  existingDaily,
  existingWeekly,
  adherenceAuto,
  existingPhotos,
}: CheckInTabsProps) {
  return (
    <Tabs defaultValue="daily">
      <TabsList className="mb-6">
        <TabsTrigger value="daily" className="gap-2">
          Quotidien
          {existingDaily && (
            <span className="flex size-2 rounded-full bg-primary" aria-hidden />
          )}
        </TabsTrigger>
        <TabsTrigger value="weekly" className="gap-2">
          Hebdomadaire
          {existingWeekly && (
            <span className="flex size-2 rounded-full bg-primary" aria-hidden />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="daily">
        <CheckInForm today={today} existing={existingDaily} />
      </TabsContent>

      <TabsContent value="weekly">
        <WeeklyCheckInForm
          weekStart={weekStart}
          existing={existingWeekly}
          adherenceAuto={adherenceAuto}
          existingPhotos={existingPhotos}
        />
      </TabsContent>
    </Tabs>
  )
}
