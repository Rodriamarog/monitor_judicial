"use client"

import { useState, useEffect } from "react"
import { Trash2, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Task, Comment } from "@/components/kanban-board"
import { labelColors } from "@/components/task-card"

interface EditTaskDialogProps {
  task: Task | null
  onClose: () => void
  onSave: (task: Task) => void
  onDelete: (taskId: string) => void
}

const availableLabels = [
  "Civil",
  "Laboral",
  "Mercantil",
  "Penal",
  "Familiar",
  "Fiscal",
  "Administrativo",
  "Propiedad Intelectual",
  "Audiencia",
  "Notarial",
  "Negociación",
  "Apelación",
  "Urgente",
]

export default function EditTaskDialog({ task, onClose, onSave, onDelete }: EditTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [labels, setLabels] = useState<string[]>([])
  const [dueDate, setDueDate] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setLabels(task.labels)
      setComments(task.comments || [])

      // Convert "nov 21" back to "YYYY-MM-DD" for the date input
      if (task.dueDate) {
        const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
        const parts = task.dueDate.toLowerCase().split(' ')
        if (parts.length === 2) {
          const monthIndex = monthNames.indexOf(parts[0])
          if (monthIndex !== -1) {
            const day = parts[1].padStart(2, '0')
            const month = (monthIndex + 1).toString().padStart(2, '0')
            const year = new Date().getFullYear()
            setDueDate(`${year}-${month}-${day}`)
          } else {
            setDueDate("")
          }
        } else {
          setDueDate("")
        }
      } else {
        setDueDate("")
      }
    }
  }, [task])

  const handleSave = () => {
    if (!task || !title.trim()) return

    // Format date as "Nov 27" if provided - no timezone conversion
    let formattedDate: string | undefined = undefined
    if (dueDate) {
      // dueDate is "YYYY-MM-DD", split it directly
      const [year, month, day] = dueDate.split('-')
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      formattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
    }

    onSave({
      ...task,
      title: title.trim(),
      description: description.trim(),
      labels,
      dueDate: formattedDate,
      comments,
    })
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      text: newComment.trim(),
      author: "Usuario", // In production, get from auth
      createdAt: new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
    }

    setComments([...comments, comment])
    setNewComment("")
  }

  const toggleLabel = (label: string) => {
    setLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
  }

  const deleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  if (!task) return null

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la tarea"
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="edit-due-date">Fecha de Vencimiento</Label>
            <Input
              id="edit-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {availableLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => toggleLabel(label)}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    labels.includes(label)
                      ? labelColors[label] || "bg-primary/20 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border hover:border-muted-foreground/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2 border-t pt-4">
            <Label>Comentarios</Label>

            {/* Comments List */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay comentarios aún</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/50 rounded p-2 space-y-1 group relative">
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                    <div className="flex items-center justify-between pr-6">
                      <span className="text-xs font-medium text-foreground">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                    </div>
                    <p className="text-sm text-foreground">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                rows={2}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                size="icon"
                disabled={!newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="destructive" size="icon" onClick={() => task && onDelete(task.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
