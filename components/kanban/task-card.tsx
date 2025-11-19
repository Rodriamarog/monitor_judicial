'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

interface TaskCardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCurrentlyDragging = isDragging || isSortableDragging

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md hover:bg-muted/30 transition-all rounded-none',
          isSortableDragging && 'opacity-0'
        )}
        style={task.color ? { borderLeft: `4px solid ${task.color}` } : undefined}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight break-words">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                {task.description.replace(/<[^>]*>/g, '').substring(0, 100)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
