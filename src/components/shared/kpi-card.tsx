import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardTrend {
  value: number
  direction: 'up' | 'down' | 'neutral'
  label?: string
}

interface KPICardProps {
  title: string
  value: string | number
  trend?: KPICardTrend
  icon?: React.ElementType
  className?: string
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  down: {
    icon: TrendingDown,
    className: 'text-destructive',
  },
  neutral: {
    icon: Minus,
    className: 'text-muted-foreground',
  },
}

export function KPICard({ title, value, trend, icon: Icon, className }: KPICardProps) {
  const TrendIcon = trend ? trendConfig[trend.direction].icon : null

  return (
    <Card className={cn('gap-3', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {Icon && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        {trend && TrendIcon && (
          <div className={cn('mt-1 flex items-center gap-1 text-xs', trendConfig[trend.direction].className)}>
            <TrendIcon className="size-3" />
            <span>
              {trend.value > 0 ? '+' : ''}
              {trend.value}%{trend.label ? ` ${trend.label}` : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { KPICardProps, KPICardTrend }
