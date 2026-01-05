"use client"

import { Clock, Square, CheckSquare } from "lucide-react"
import type { Task } from "@/components/kanban-board"

interface Subtask {
  id: string
  title: string
  is_completed: boolean
}

interface TaskCardProps {
  task: Task
  isDragging: boolean
  onClick?: () => void
  subtasks?: Subtask[]
}

// Helper function to convert HTML to plain text while preserving structure
function stripHtml(html: string): string {
  if (!html) return ''

  const tmp = document.createElement('div')
  tmp.innerHTML = html

  // Convert lists to text with bullets/numbers
  const listItems = tmp.querySelectorAll('li')
  listItems.forEach((li, index) => {
    const parentList = li.parentElement
    if (parentList?.tagName === 'OL') {
      // Ordered list - add number
      li.textContent = `${index + 1}. ${li.textContent}`
    } else if (parentList?.tagName === 'UL') {
      // Unordered list - add bullet
      li.textContent = `• ${li.textContent}`
    }
  })

  // Replace block elements with line breaks
  const blockElements = tmp.querySelectorAll('p, div, li, br')
  blockElements.forEach(el => {
    if (el.tagName === 'BR') {
      el.replaceWith('\n')
    } else {
      const text = el.textContent
      el.replaceWith(text + '\n')
    }
  })

  return (tmp.textContent || tmp.innerText || '').trim()
}

// Label colors for legal practice areas
export const labelColors: Record<string, string> = {
  // Legal areas
  "Civil": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Laboral": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Mercantil": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Penal": "bg-red-500/20 text-red-400 border-red-500/30",
  "Familiar": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Fiscal": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Administrativo": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Propiedad Intelectual": "bg-rose-500/20 text-rose-400 border-rose-500/30",

  // Task types
  "Audiencia": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Notarial": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Negociación": "bg-green-500/20 text-green-400 border-green-500/30",
  "Apelación": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Urgente": "bg-red-500/20 text-red-400 border-red-500/30",
}

export default function TaskCard({ task, isDragging, onClick, subtasks }: TaskCardProps) {
  const hasDescription = task.description && task.description !== '<p></p>' && task.description.trim() !== ''

  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-lg p-3 cursor-pointer transition-all ${
        isDragging ? "shadow-xl ring-2 ring-primary/50" : "hover:border-muted-foreground/30 hover:bg-card/80"
      }`}
    >
      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {task.labels.map((label) => (
            <span
              key={label}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                labelColors[label] || "bg-muted text-muted-foreground border-muted"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2">{task.title}</h3>

      {/* Description */}
      {hasDescription && (
        <div
          className="text-xs text-muted-foreground mb-2 line-clamp-2 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-0 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-0 [&_li]:my-0 [&_strong]:font-bold [&_em]:italic [&_strong]:text-muted-foreground [&_em]:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: task.description }}
        />
      )}

      {/* Subtasks List */}
      {subtasks && subtasks.length > 0 && (
        <div className="space-y-1 mb-2 pt-2 border-t border-border/50">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-1.5 text-xs">
              {subtask.is_completed ? (
                <CheckSquare className="h-3 w-3 shrink-0 text-green-500" />
              ) : (
                <Square className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <span className={`line-clamp-1 ${
                subtask.is_completed
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{task.dueDate}</span>
        </div>
      )}
    </div>
  )
}
