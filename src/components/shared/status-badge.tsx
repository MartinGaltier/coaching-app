import { cn } from '@/lib/utils'

type StatusVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'

interface StatusBadgeProps {
  variant?: StatusVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<StatusVariant, string> = {
  default:
    'bg-primary text-primary-foreground',
  success:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  destructive:
    'bg-destructive/10 text-destructive dark:bg-destructive/20',
  outline:
    'border border-border text-foreground bg-transparent',
  info:
    'bg-blue-500/10 text-blue-700 dark:text-blue-400',
}

export function StatusBadge({ variant = 'default', children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export type { StatusVariant }
