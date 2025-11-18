'use client'

import { cn } from '@/lib/utils'

interface DropIndicatorProps {
  className?: string
}

export function DropIndicator({ className }: DropIndicatorProps) {
  return (
    <div
      className={cn(
        'h-0.5 bg-primary rounded-full my-1 transition-all',
        className
      )}
    />
  )
}
