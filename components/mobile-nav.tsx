'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu, FileText, Bell, Settings, Calendar, Kanban } from 'lucide-react'

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 mt-6">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Mis Casos
            </Button>
          </Link>
          <Link href="/dashboard/alerts" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Bell className="h-4 w-4" />
              Alertas
            </Button>
          </Link>
          <Link href="/dashboard/calendar" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Calendar className="h-4 w-4" />
              Calendario
            </Button>
          </Link>
          <Link href="/dashboard/proyectos" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Kanban className="h-4 w-4" />
              Proyectos
            </Button>
          </Link>
          <Link href="/dashboard/settings" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
