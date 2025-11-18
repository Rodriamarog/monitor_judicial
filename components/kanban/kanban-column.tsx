'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './task-card'
import { DropIndicator } from './drop-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  created_at: string
  updated_at: string
}

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  onUpdateColumn: (columnId: string, title: string) => void
  onDeleteColumn: (columnId: string) => void
  onAddTask: (columnId: string) => void
  onTaskClick: (task: Task) => void
}

export function KanbanColumn({
  column,
  tasks,
  onUpdateColumn,
  onDeleteColumn,
  onAddTask,
  onTaskClick,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(column.title)

  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const handleSaveTitle = () => {
    if (title.trim()) {
      onUpdateColumn(column.id, title.trim())
    } else {
      setTitle(column.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setTitle(column.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-shrink-0 w-[280px] bg-muted/20 rounded-lg p-3 border border-border/50"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-semibold text-sm truncate">{column.title}</h3>
            <span className="text-xs text-muted-foreground">
              {tasks.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteColumn(column.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Task Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAddTask(column.id)}
        className="mt-2 justify-start text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar Tarea
      </Button>
    </div>
  )
}
