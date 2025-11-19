'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { KanbanColumn } from './kanban-column'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TaskDetailSheet } from './task-detail-sheet'

interface Column {
  id: string
  title: string
  position: number
  color: string
  created_at: string
  updated_at: string
}

interface Task {
  id: string
  column_id: string
  title: string
  description: string | null
  position: number
  color: string | null
  due_date: string | null
  calendar_event_id: string | null
  created_at: string
  updated_at: string
}

interface KanbanBoardProps {
  columns: Column[]
  tasks: Task[]
  onColumnsChange: (columns: Column[]) => void
  onTasksChange: (tasks: Task[]) => void
}

export function KanbanBoard({
  columns,
  tasks,
  onColumnsChange,
  onTasksChange,
}: KanbanBoardProps) {
  const supabase = createClient()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    const column = columns.find((c) => c.id === active.id)

    if (task) {
      setActiveTask(task)
    } else if (column) {
      setActiveColumn(column)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    const activeCol = columns.find((c) => c.id === active.id)

    // Handle task drag over
    if (activeTask) {
      // Check if dragging over a column
      const overColumn = columns.find((c) => c.id === over.id)
      if (overColumn && activeTask.column_id !== overColumn.id) {
        console.log('Moving task to column:', overColumn.id)
        // Move task to new column (optimistic update)
        const updatedTasks = tasks.map((t) =>
          t.id === activeTask.id ? { ...t, column_id: overColumn.id } : t
        )
        onTasksChange(updatedTasks)
      }

      // Check if dragging over another task
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask && activeTask.id !== overTask.id) {
        console.log('Reordering task over:', overTask.id)
        // Reorder within column
        const activeIndex = tasks.findIndex((t) => t.id === activeTask.id)
        const overIndex = tasks.findIndex((t) => t.id === overTask.id)

        if (tasks[activeIndex].column_id !== tasks[overIndex].column_id) {
          console.log('Task moved to different column via task drag')
          tasks[activeIndex].column_id = tasks[overIndex].column_id
        }

        const reorderedTasks = arrayMove(tasks, activeIndex, overIndex).map(
          (task, index) => ({
            ...task,
            position: index,
            column_id:
              task.id === activeTask.id ? overTask.column_id : task.column_id,
          })
        )

        onTasksChange(reorderedTasks)
      }
    }

    // Handle column drag over
    if (activeCol) {
      const overCol = columns.find((c) => c.id === over.id)
      if (overCol && activeCol.id !== overCol.id) {
        const activeIndex = columns.findIndex((c) => c.id === activeCol.id)
        const overIndex = columns.findIndex((c) => c.id === overCol.id)

        const reorderedColumns = arrayMove(columns, activeIndex, overIndex).map(
          (col, index) => ({
            ...col,
            position: index,
          })
        )

        onColumnsChange(reorderedColumns)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    setActiveColumn(null)

    const { active, over } = event
    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    const activeCol = columns.find((c) => c.id === active.id)

    // Persist task changes to database
    if (activeTask) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
          .from('kanban_tasks')
          .update({
            column_id: activeTask.column_id,
            position: activeTask.position,
          })
          .eq('id', activeTask.id)
      } catch (error) {
        console.error('Error updating task:', error)
      }
    }

    // Persist column changes to database
    if (activeCol) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Update all column positions
        for (const column of columns) {
          await supabase
            .from('kanban_columns')
            .update({ position: column.position })
            .eq('id', column.id)
        }
      } catch (error) {
        console.error('Error updating column positions:', error)
      }
    }
  }

  const handleAddColumn = async () => {
    if (columns.length >= 5) {
      alert('Máximo 5 columnas permitidas')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newPosition = columns.length

      const { data, error } = await supabase
        .from('kanban_columns')
        .insert({
          user_id: user.id,
          title: `Columna ${newPosition + 1}`,
          position: newPosition,
          color: '#6b7280',
        })
        .select()
        .single()

      if (error) throw error

      onColumnsChange([...columns, data])
    } catch (error) {
      console.error('Error adding column:', error)
    }
  }

  const handleUpdateColumn = async (columnId: string, title: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('kanban_columns')
        .update({ title })
        .eq('id', columnId)

      if (error) throw error

      onColumnsChange(
        columns.map((c) => (c.id === columnId ? { ...c, title } : c))
      )
    } catch (error) {
      console.error('Error updating column:', error)
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (columns.length <= 1) {
      alert('Debe haber al menos una columna')
      return
    }

    if (!confirm('¿Eliminar esta columna y todas sus tareas?')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete all tasks in the column first
      const { error: tasksError } = await supabase
        .from('kanban_tasks')
        .delete()
        .eq('column_id', columnId)

      if (tasksError) {
        console.error('Error deleting tasks:', tasksError)
        alert('Error al eliminar las tareas de la columna')
        return
      }

      // Then delete the column
      const { error: columnError } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId)

      if (columnError) {
        console.error('Error deleting column:', columnError)
        alert('Error al eliminar la columna')
        return
      }

      onColumnsChange(columns.filter((c) => c.id !== columnId))
      onTasksChange(tasks.filter((t) => t.column_id !== columnId))
    } catch (error) {
      console.error('Error deleting column:', error)
      alert('Error inesperado al eliminar la columna')
    }
  }

  const handleAddTask = async (columnId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const columnTasks = tasks.filter((t) => t.column_id === columnId)
      const newPosition = columnTasks.length

      const { data, error } = await supabase
        .from('kanban_tasks')
        .insert({
          user_id: user.id,
          column_id: columnId,
          title: 'Nueva Tarea',
          description: '',
          position: newPosition,
        })
        .select()
        .single()

      if (error) throw error

      onTasksChange([...tasks, data])
      setSelectedTask(data)
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<Task>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('kanban_tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error

      onTasksChange(
        tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      )
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find the task to get calendar_event_id
      const taskToDelete = tasks.find((t) => t.id === taskId)

      // Delete associated calendar event if it exists
      if (taskToDelete?.calendar_event_id) {
        // Get the calendar event details before deleting
        const { data: calendarEvent } = await supabase
          .from('calendar_events')
          .select('google_event_id')
          .eq('id', taskToDelete.calendar_event_id)
          .single()

        // Delete from Google Calendar first if it was already synced
        if (calendarEvent?.google_event_id) {
          try {
            await fetch('/api/calendar/delete-from-google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ google_event_id: calendarEvent.google_event_id }),
            })
          } catch (syncError) {
            console.error('Error deleting from Google Calendar:', syncError)
          }
        }

        // Delete from database
        await supabase
          .from('calendar_events')
          .delete()
          .eq('id', taskToDelete.calendar_event_id)
      }

      // Delete the task
      const { error } = await supabase
        .from('kanban_tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Error deleting task:', error)
        alert('Error al eliminar la tarea')
        return
      }

      onTasksChange(tasks.filter((t) => t.id !== taskId))
      setSelectedTask(null)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 relative">
          <SortableContext items={columns.map((c) => c.id)}>
            {columns.map((column, index) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasks.filter((t) => t.column_id === column.id)}
                onUpdateColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
                onAddTask={handleAddTask}
                onTaskClick={setSelectedTask}
                isFirstColumn={index === 0}
              />
            ))}
          </SortableContext>

          {columns.length < 5 && columns.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddColumn}
              className="absolute top-3 right-3 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              style={{ left: `${columns.length * 296}px` }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
          {activeColumn && (
            <div className="flex flex-col flex-shrink-0 w-[280px] bg-muted/20 rounded-lg p-3 opacity-50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{activeColumn.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {tasks.filter((t) => t.column_id === activeColumn.id).length}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </>
  )
}
