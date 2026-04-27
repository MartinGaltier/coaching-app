import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChartContainerProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function ChartContainer({
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
}: ChartContainerProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-medium leading-tight">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn('min-h-48', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

export type { ChartContainerProps }
