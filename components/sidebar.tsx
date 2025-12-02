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
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 transition-colors rounded-none relative cursor-pointer',
                  isActive && 'bg-primary/10 border-l-4 border-l-primary text-foreground hover:bg-primary/15 font-semibold',
                  !isActive && 'hover:bg-primary/5',
                  isCollapsed && 'justify-center'
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
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
