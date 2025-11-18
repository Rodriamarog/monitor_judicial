'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { KanbanBoard } from '@/components/kanban/kanban-board'

interface KanbanColumn {
  id: string
  title: string
  position: number
  color: string
  created_at: string
  updated_at: string
}

interface KanbanTask {
  id: string
  column_id: string
  title: string
  description: string | null
  position: number
  color: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export default function ProyectosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Initialize default columns if none exist
      await supabase.rpc('initialize_default_kanban_columns', {
        p_user_id: user.id,
      })

      // Fetch columns
      const { data: columnsData } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('position')

      setColumns(columnsData || [])

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('position')

      setTasks(tasksData || [])
      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground">
            Organiza tus tareas y proyectos
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        columns={columns}
        tasks={tasks}
        onColumnsChange={setColumns}
        onTasksChange={setTasks}
      />
    </div>
  )
}
