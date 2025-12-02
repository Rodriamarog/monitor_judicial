'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function DashboardMain({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isMachotes = pathname?.startsWith('/dashboard/machotes')
    const isProyectos = pathname?.startsWith('/dashboard/proyectos')
    const needsScroll = isMachotes || isProyectos

    return (
        <main className={cn("flex-1", needsScroll ? "overflow-y-auto" : "overflow-hidden")}>
            <div className={cn(
                "min-h-full p-8 pt-16 md:pt-8",
                !needsScroll && "h-full overflow-hidden"
            )}>
                {children}
            </div>
        </main>
    )
}
