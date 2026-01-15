'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Scale,
  FileText,
  Bell,
  Settings,
  Calendar,
  Kanban,
  ChevronLeft,
  ChevronRight,
  Menu,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { SubscriptionButton } from '@/components/subscription-button'
import { SignOutButton } from '@/components/sign-out-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface SidebarProps {
  email: string
  tier: string
  hasStripeCustomer: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Mis Casos', icon: FileText },
  { href: '/dashboard/alerts', label: 'Alertas', icon: Bell },
  { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar },
  { href: '/dashboard/proyectos', label: 'Proyectos', icon: Kanban },
  { href: '/dashboard/machotes', label: 'Machotes', icon: FileText },
  { href: '/dashboard/tesis', label: 'Buscador de Tesis', icon: BookOpen },
  { href: '/dashboard/ai-assistant', label: 'Asistente Legal IA', icon: Sparkles, disabled: true, badge: 'Próximamente' },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ email, tier, hasStripeCustomer }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale className="h-6 w-6 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-lg">Monitor Judicial</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item: any) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault()
                  return
                }
                setIsMobileOpen(false)
              }}
            >
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 transition-colors',
                  isActive && 'bg-muted text-foreground hover:bg-muted',
                  !isActive && 'hover:bg-accent/50',
                  item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                  isCollapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-500">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* User Profile & Actions */}
      <div className="border-t p-4 space-y-3">
        {!isCollapsed && (
          <div className="text-sm px-2">
            <p className="font-medium truncate">{email}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Plan: {tier}
            </p>
          </div>
        )}

        <div className={cn('flex gap-2', isCollapsed && 'flex-col')}>
          <ThemeToggle />
          <SignOutButton isCollapsed={isCollapsed} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-muted/30 transition-all duration-300 relative',
          isCollapsed ? 'w-16' : 'w-56'
        )}
      >
        <SidebarContent />

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </aside>
    </>
  )
}
