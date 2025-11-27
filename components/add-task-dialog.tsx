"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import type { Task } from "@/components/kanban-board"
import { labelColors } from "@/components/task-card"

interface AddTaskDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (task: Omit<Task, "id" | "column_id">) => void
}

const labelOptions = [
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

export default function AddTaskDialog({ open, onClose, onAdd }: AddTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [dueDate, setDueDate] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const supabase = createClient()
    let calendarEventId: string | null = null

    try {
      // If due date is provided, create calendar event
      if (dueDate) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const startTimeString = `${dueDate}T09:00:00`
          const endTimeString = `${dueDate}T10:00:00`

          // Add first label to description for color coding
          const firstLabel = selectedLabels.length > 0 ? selectedLabels[0] : null
          const eventDescription = firstLabel
            ? `[KANBAN_LABEL:${firstLabel}]\n${description.trim()}`
            : `[KANBAN]\n${description.trim()}`

          const { data: newEvent } = await supabase
            .from('calendar_events')
            .insert({
              user_id: user.id,
              title: title.trim(),
              description: eventDescription,
              start_time: startTimeString,
              end_time: endTimeString,
              sync_status: 'pending'
            })
            .select()
            .single()

          if (newEvent) {
            calendarEventId = newEvent.id

            // Async sync to Google
            fetch('/api/calendar/sync-to-google', { method: 'POST' })
          }
        }
      }

      // Format date as "Nov 27" if provided
      let formattedDate: string | undefined = undefined
      if (dueDate) {
        const [year, month, day] = dueDate.split('-')
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        formattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
      }

      onAdd({
        title: title.trim(),
        description: description.trim(),
        labels: selectedLabels,
        dueDate: formattedDate,
        due_date: dueDate || null,
        calendar_event_id: calendarEventId,
        comments: [],
      })

      // Reset form
      setTitle("")
      setDescription("")
      setSelectedLabels([])
      setDueDate("")
    } catch (error) {
      console.error('Error creating task with calendar event:', error)
      // Still create task even if calendar creation fails
      const formattedDate = dueDate
        ? `${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(dueDate.split('-')[1]) - 1]} ${parseInt(dueDate.split('-')[2])}`
        : undefined

      onAdd({
        title: title.trim(),
        description: description.trim(),
        labels: selectedLabels,
        dueDate: formattedDate,
        due_date: dueDate || null,
        comments: [],
      })

      // Reset form
      setTitle("")
      setDescription("")
      setSelectedLabels([])
      setDueDate("")
    }
  }

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Crear Nueva Tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Título de la tarea..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción de la tarea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Fecha de Vencimiento</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {labelOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    selectedLabels.includes(label)
                      ? labelColors[label] || "bg-primary/20 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border hover:border-muted-foreground/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Crear Tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
