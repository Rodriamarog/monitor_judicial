"use client"

import { Clock } from "lucide-react"
import type { Task } from "@/components/kanban-board"

interface TaskCardProps {
  task: Task
  isDragging: boolean
  onClick?: () => void
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

export default function TaskCard({ task, isDragging, onClick }: TaskCardProps) {
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
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>

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
