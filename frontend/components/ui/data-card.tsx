'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface DataCardProps {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  unit?: string
  variant?: 'default' | 'accent' | 'danger' | 'success'
  className?: string
}

const variantStyles = {
  default: 'border-border bg-background/40',
  accent: 'border-primary/50 bg-primary/10',
  danger: 'border-destructive bg-destructive/20',
  success: 'border-green-700 bg-green-900/30',
}

export function DataCard({ label, value, icon, unit, variant = 'default', className }: DataCardProps) {
  return (
    <div className={cn('rounded-lg border px-4 py-3 backdrop-blur-sm', variantStyles[variant], className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-lg font-semibold text-foreground">{value}</p>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
        </div>
        {icon && <div className="shrink-0 text-foreground">{icon}</div>}
      </div>
    </div>
  )
}

export default DataCard
