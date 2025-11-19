'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  isFirstColumn: boolean
}

export function KanbanColumn({
  column,
  tasks,
  onUpdateColumn,
  onDeleteColumn,
  onAddTask,
  onTaskClick,
  isFirstColumn,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(column.title)
  const [isHovered, setIsHovered] = useState(false)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)

  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

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
      ref={(node) => {
        setNodeRef(node)
        setSortableNodeRef(node)
      }}
      style={style}
      className="flex flex-col flex-shrink-0 w-[280px] rounded-lg p-3 bg-muted/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between mb-3 group"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        {...attributes}
        {...listeners}
      >
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
            <h3
              className="font-semibold text-sm truncate cursor-pointer"
              onDoubleClick={() => setIsEditing(true)}
            >
              {column.title}
            </h3>
            <span className="text-xs text-muted-foreground">
              {tasks.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 transition-opacity ${isHeaderHovered ? 'opacity-100' : 'opacity-0'
                }`}
            >
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
      <div className="flex-1 overflow-y-auto min-h-[200px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}

            {/* Add Task Button - positioned right after tasks */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTask(column.id)}
              className={`w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 ${isFirstColumn || isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
