'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

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
              <div
                className="text-xs text-muted-foreground mt-1 line-clamp-3 break-words prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-0"
                dangerouslySetInnerHTML={{
                  __html: task.description
                }}
              />
            )}
            {task.due_date && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(task.due_date).toLocaleDateString('es-MX', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
