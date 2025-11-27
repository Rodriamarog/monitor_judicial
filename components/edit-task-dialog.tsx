"use client"

import { useState, useEffect } from "react"
import { Trash2, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
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

  const handleSave = async () => {
    if (!task || !title.trim()) return

    const supabase = createClient()
    let calendarEventId = task.calendar_event_id

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // CASE 1: Due date added or changed
      if (dueDate && dueDate !== task.due_date) {
        const startTimeString = `${dueDate}T09:00:00`
        const endTimeString = `${dueDate}T10:00:00`

        if (task.calendar_event_id) {
          // UPDATE existing calendar event
          await supabase.from('calendar_events').update({
            title: `📋 ${title.trim()}`,
            description: description.trim(),
            start_time: startTimeString,
            end_time: endTimeString,
            sync_status: 'pending'
          }).eq('id', task.calendar_event_id)
        } else {
          // CREATE new calendar event
          const { data: newEvent } = await supabase
            .from('calendar_events')
            .insert({
              user_id: user.id,
              title: `📋 ${title.trim()}`,
              description: description.trim(),
              start_time: startTimeString,
              end_time: endTimeString,
              sync_status: 'pending'
            })
            .select()
            .single()

          if (newEvent) {
            calendarEventId = newEvent.id
          }
        }
      }

      // CASE 2: Due date removed
      else if (!dueDate && task.calendar_event_id) {
        const { data: event } = await supabase
          .from('calendar_events')
          .select('google_event_id')
          .eq('id', task.calendar_event_id)
          .single()

        // Delete from Google Calendar
        if (event?.google_event_id) {
          await fetch('/api/calendar/delete-from-google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_event_id: event.google_event_id })
          })
        }

        // Delete from local DB
        await supabase.from('calendar_events').delete().eq('id', task.calendar_event_id)
        calendarEventId = null
      }

      // Format date as "Nov 27" if provided
      let formattedDate: string | undefined = undefined
      if (dueDate) {
        const [year, month, day] = dueDate.split('-')
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        formattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
      }

      // Update task with calendar event ID
      onSave({
        ...task,
        title: title.trim(),
        description: description.trim(),
        labels,
        dueDate: formattedDate,
        due_date: dueDate || null,
        calendar_event_id: calendarEventId,
        comments,
      })

      // Async sync to Google (fire and forget)
      if (calendarEventId) {
        fetch('/api/calendar/sync-to-google', { method: 'POST' })
      }
    } catch (error) {
      console.error('Error saving task with calendar sync:', error)
      // Still save task even if calendar sync fails
      const formattedDate = dueDate
        ? `${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(dueDate.split('-')[1]) - 1]} ${parseInt(dueDate.split('-')[2])}`
        : undefined

      onSave({
        ...task,
        title: title.trim(),
        description: description.trim(),
        labels,
        dueDate: formattedDate,
        due_date: dueDate || null,
        comments,
      })
    }
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
