'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const KanbanBoard = dynamic(() => import('@/components/kanban-board'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
  ssr: false,
})

export default function ProyectosPage() {
  return (
    <div className="h-full flex flex-col">
      <KanbanBoard />
    </div>
  )
}
