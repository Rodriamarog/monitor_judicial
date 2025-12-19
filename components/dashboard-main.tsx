'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function DashboardMain({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isMachotes = pathname?.startsWith('/dashboard/machotes')
    const isAIAssistant = pathname === '/dashboard/ai-assistant'

    return (
        <main className="flex-1 overflow-hidden">
            <div className={cn(
                "h-full",
                !isAIAssistant && "p-8 pt-16 md:pt-8",
                isMachotes ? "overflow-y-auto" : "overflow-hidden"
            )}>
                {children}
            </div>
        </main>
    )
}
