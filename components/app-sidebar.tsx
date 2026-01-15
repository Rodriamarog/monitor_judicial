"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Scale,
  FileText,
  Bell,
  Settings,
  Calendar,
  Kanban,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Menu,
  HelpCircle,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignOutButton } from "@/components/sign-out-button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  disabled?: boolean
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface AppSidebarProps {
  email: string
  tier: string
  hasStripeCustomer: boolean
  unreadAlertsCount: number
}

const navigation: NavSection[] = [
  {
    title: "MONITOREO",
    items: [
      { href: '/dashboard', label: 'Mis Casos', icon: FileText },
      { href: '/dashboard/alerts', label: 'Alertas', icon: Bell },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      { href: '/dashboard/machotes', label: 'Machotes', icon: FileText },
      { href: '/dashboard/proyectos', label: 'Proyectos', icon: Kanban },
      { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar },
    ],
  },
  {
    title: "TESIS",
    items: [
      { href: '/dashboard/tesis', label: 'Buscador de Tesis', icon: BookOpen },
      { href: '/dashboard/ai-assistant', label: 'Asistente Legal IA', icon: Sparkles, disabled: true, badge: 'Proximamente' },
    ],
  },
  {
    title: "CONFIGURACIÓN",
    items: [
      { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
      { href: '/dashboard/help', label: 'Ayuda y Soporte', icon: HelpCircle },
    ],
  },
]

export function AppSidebar({ email, tier, hasStripeCustomer }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground">Monitor Judicial</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {!isCollapsed && (
              <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-muted">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.disabled ? "#" : item.href}
                      onClick={(e) => {
                        if (item.disabled) {
                          e.preventDefault()
                          return
                        }
                        setIsMobileOpen(false)
                      }}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground/70",
                        isCollapsed && "justify-center px-2",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                          isActive && "text-sidebar-primary-foreground",
                          item.disabled && "group-hover:scale-100"
                        )}
                      />
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
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-3 space-y-3">
        {!isCollapsed && (
          <div className="px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{email}</p>
            <p className="text-xs text-sidebar-muted capitalize">Plan: {tier}</p>
          </div>
        )}

        <div className={cn("flex gap-2", isCollapsed && "flex-col items-center")}>
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
          <SheetTrigger asChild suppressHydrationWarning>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex relative flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[280px]",
        )}
      >
        <SidebarContent />

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>
    </>
  )
}
