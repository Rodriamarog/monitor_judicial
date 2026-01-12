'use client'

import { useState, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Trash2,
  Tag,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { SubtasksSection } from '@/components/kanban/subtasks-section'
import { CommentsSection } from '@/components/kanban/comments-section'
import type { Task } from '@/components/kanban-board'
import { labelColors } from '@/components/task-card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TaskEditModalProps {
  task: Task | null
  onClose: () => void
  onSave: (task: Task) => void
  onDelete: (taskId: string) => void
  onSubtasksChange?: () => void
}

const availableLabels = [
  'Civil',
  'Laboral',
  'Mercantil',
  'Penal',
  'Familiar',
  'Fiscal',
  'Administrativo',
  'Propiedad Intelectual',
  'Audiencia',
  'Notarial',
  'Negociación',
  'Apelación',
  'Urgente',
]

export default function TaskEditModal({ task, onClose, onSave, onDelete, onSubtasksChange }: TaskEditModalProps) {
  console.log('[TaskEditModal] Component render, task:', task?.id)

  const [title, setTitle] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const supabase = createClient()

  // Wrap onClose to track when it's called and save any pending changes
  const handleClose = async () => {
    console.log('[TaskEditModal] handleClose called')
    console.trace('[TaskEditModal] handleClose stack trace')

    // Save title if it changed (only to DB, don't call onSave which would reopen modal)
    if (task && title !== task.title) {
      await supabase
        .from('kanban_tasks')
        .update({ title })
        .eq('id', task.id)
      // Note: Parent will reload data on next modal open
    }

    onClose()
  }

  // Initialize fields when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setLabels(task.labels || [])

      // Start with description collapsed (will show read-only view if has content)
      setIsDescriptionOpen(false)

      // Convert display date back to YYYY-MM-DD for input
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
            setDueDate('')
          }
        } else {
          setDueDate('')
        }
      } else {
        setDueDate('')
      }
    }
  }, [task])

  // Load current user for assignee dropdown
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser({ id: user.id, email: user.email || 'Usuario' })
      }
    }
    loadUser()
  }, [])

  // Tiptap Editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: task?.description || '',
    editorProps: {
      attributes: {
        class:
          'prose-sm dark:prose-invert max-w-none min-h-[120px] focus:outline-none p-3 text-sm [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1',
      },
    },
  })

  // Update editor content when task changes
  useEffect(() => {
    if (editor && task) {
      console.log('[TaskEditModal] Setting editor content from task.description:', task.description)
      editor.commands.setContent(task.description || '')
    }
  }, [task?.id, editor])

  const handleTitleBlur = async (e?: React.FocusEvent<HTMLInputElement>) => {
    if (!task || title === task.title) return

    // If blurring because user clicked "Guardar" button, don't save
    // (the modal is closing anyway, no need to trigger a save that reopens it)
    if (e?.relatedTarget?.closest('button[data-save-button="true"]')) {
      return
    }

    await updateTaskField({ title })
  }

  const handleDescriptionSave = async () => {
    console.log('[TaskEditModal] handleDescriptionSave called')
    if (!task || !editor) return
    const description = editor.getHTML()
    console.log('[TaskEditModal] Description HTML:', description)

    // Save to database
    await updateTaskField({ description })

    // Collapse editor
    setIsDescriptionOpen(false)
    console.log('[TaskEditModal] handleDescriptionSave completed')
  }

  const handleDescriptionCancel = () => {
    if (!task || !editor) return

    // Revert to original content
    editor.commands.setContent(task.description || '')

    // Collapse editor
    setIsDescriptionOpen(false)
  }



  const handleLabelToggle = async (label: string) => {
    console.log('[TaskEditModal] handleLabelToggle called, label:', label)
    const newLabels = labels.includes(label)
      ? labels.filter((l) => l !== label)
      : [...labels, label]

    setLabels(newLabels)
    if (task) {
      await updateTaskField({ labels: newLabels })
    }
    console.log('[TaskEditModal] handleLabelToggle completed')
  }

  const handleDueDateChange = async (newDate: string) => {
    setDueDate(newDate)
    if (!task) return

    await handleCalendarSync(newDate)
    await updateTaskField({ due_date: newDate || null })
  }

  const handleCalendarSync = async (newDate: string) => {
    if (!task) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      let calendarEventId = task.calendar_event_id

      // CASE 1: Due date added or changed
      if (newDate && newDate !== task.due_date) {
        const startTimeString = `${newDate}T09:00:00`
        const endTimeString = `${newDate}T10:00:00`

        // Add first label to description for color coding
        const firstLabel = labels.length > 0 ? labels[0] : null
        const description = editor?.getHTML() || ''
        const eventDescription = firstLabel
          ? `[KANBAN_LABEL:${firstLabel}]\n${description}`
          : `[KANBAN]\n${description}`

        if (task.calendar_event_id) {
          // UPDATE existing calendar event
          await supabase.from('calendar_events').update({
            title,
            description: eventDescription,
            start_time: startTimeString,
            end_time: endTimeString,
          }).eq('id', task.calendar_event_id)
        } else {
          // CREATE new calendar event
          const { data: newEvent } = await supabase.from('calendar_events').insert({
            user_id: user.id,
            title,
            description: eventDescription,
            start_time: startTimeString,
            end_time: endTimeString,
            sync_status: 'pending',
          }).select().single()

          if (newEvent) {
            calendarEventId = newEvent.id
            await updateTaskField({ calendar_event_id: newEvent.id })
          }
        }

        // Async sync to Google Calendar
        fetch('/api/calendar/sync-to-google', { method: 'POST' }).catch(console.error)
      }
      // CASE 2: Due date removed
      else if (!newDate && task.calendar_event_id) {
        await supabase.from('calendar_events').delete().eq('id', task.calendar_event_id)
        await updateTaskField({ calendar_event_id: null })
      }
    } catch (err) {
      console.error('Error syncing calendar:', err)
    }
  }

  const updateTaskField = async (updates: Partial<Task>) => {
    console.log('[TaskEditModal] updateTaskField called with:', updates)
    if (!task) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update(updates)
        .eq('id', task.id)

      if (error) {
        console.error('Error updating task:', error)
        return
      }

      // Update local state
      console.log('[TaskEditModal] Calling onSave with updated task')
      onSave({ ...task, ...updates })
      console.log('[TaskEditModal] onSave completed')
    } catch (err) {
      console.error('Error in updateTaskField:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return

    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea? También se eliminarán sus subtareas.')) {
      return
    }

    onDelete(task.id)
    handleClose()
  }

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A'
    try {
      return format(new Date(timestamp), 'PPp', { locale: es })
    } catch {
      return timestamp
    }
  }

  if (!task) return null

  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        console.log('[TaskEditModal] onOpenChange triggered, open:', open)
        console.trace('[TaskEditModal] Stack trace for onOpenChange')
        if (!open) {
          handleClose()
        }
      }}
    >
      <DialogContent
        className="max-w-7xl h-[90vh] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          console.log('[TaskEditModal] onPointerDownOutside triggered', e.target)
        }}
        onInteractOutside={(e) => {
          console.log('[TaskEditModal] onInteractOutside triggered', e.target)
        }}
        onEscapeKeyDown={(e) => {
          console.log('[TaskEditModal] onEscapeKeyDown triggered')
        }}
      >
        {/* Custom Close Button */}
        <button
          onClick={(e) => {
            console.log('[TaskEditModal] Close button clicked')
            e.stopPropagation()
            handleClose()
          }}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-50 bg-background"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <DialogTitle className="sr-only">Editar Tarea</DialogTitle>
        </DialogHeader>

        {/* Editable Title - Jira Style */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => handleTitleBlur(e)}
          className="text-3xl font-bold border-none outline-none px-0 py-2 bg-transparent focus:outline-none focus:ring-0 w-full text-foreground placeholder:text-muted-foreground"
          placeholder="Título de la tarea"
        />

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
          {/* Main Content - Left Side (2/3) */}
          <div className="lg:col-span-8 space-y-4 overflow-y-auto pr-2 pl-2">
            {/* Description Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground uppercase">
                Descripción
              </Label>
              {isDescriptionOpen ? (
                <div className="space-y-2">
                  <div className="border rounded-md overflow-hidden">
                    {/* Tiptap Toolbar */}
                    <div className="border-b p-2 flex gap-1 bg-muted/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={editor?.isActive('bold') ? 'bg-muted' : ''}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={editor?.isActive('italic') ? 'bg-muted' : ''}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={editor?.isActive('bulletList') ? 'bg-muted' : ''}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        className={editor?.isActive('orderedList') ? 'bg-muted' : ''}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Tiptap Editor */}
                    <EditorContent
                      editor={editor}
                      className="bg-background"
                    />
                  </div>
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleDescriptionSave}
                      disabled={saving}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDescriptionCancel}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : task.description && task.description !== '<p></p>' && task.description.trim() !== '' ? (
                // Read-only view when has content
                <button
                  onClick={() => {
                    setIsDescriptionOpen(true)
                    setTimeout(() => editor?.commands.focus(), 100)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-md transition-colors prose prose-sm dark:prose-invert max-w-none text-sm [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                // Empty state placeholder
                <button
                  onClick={() => {
                    setIsDescriptionOpen(true)
                    setTimeout(() => editor?.commands.focus(), 100)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  Agregar una descripción...
                </button>
              )}
            </div>

            {/* Subtasks Section */}
            {currentUser && (
              <SubtasksSection
                parentTaskId={task.id}
                userId={currentUser.id}
                columnId={task.column_id}
                onSubtasksChange={onSubtasksChange}
              />
            )}

            {/* Comments Section */}
            {currentUser && (
              <CommentsSection
                taskId={task.id}
                userId={currentUser.id}
              />
            )}
          </div>

          {/* Details Sidebar - Right Side (1/3) */}
          <div className="lg:col-span-4 space-y-4 border-l pl-4 overflow-y-auto">


            {/* Labels */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground uppercase">
                Etiquetas
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {labels.length > 0 ? (
                        <span className="text-sm">
                          {labels.length} {labels.length === 1 ? 'etiqueta' : 'etiquetas'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Seleccionar etiquetas</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[280px]" align="start">
                  {availableLabels.map((label) => {
                    const labelColor = labelColors[label] || 'bg-primary/20 text-primary border-primary/30'
                    // Extract only the background color class
                    const bgColor = labelColor.split(' ').find(c => c.startsWith('bg-')) || 'bg-primary/20'
                    const isSelected = labels.includes(label)

                    return (
                      <DropdownMenuCheckboxItem
                        key={label}
                        checked={isSelected}
                        onCheckedChange={() => handleLabelToggle(label)}
                        onSelect={(e) => e.preventDefault()} // Prevent dropdown from closing
                        className={cn(
                          'cursor-pointer transition-all duration-200 text-foreground',
                          isSelected && bgColor,
                          !isSelected && 'hover:opacity-90'
                        )}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            const element = e.currentTarget as HTMLElement
                            element.classList.add(bgColor)
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            const element = e.currentTarget as HTMLElement
                            element.classList.remove(bgColor)
                          }
                        }}
                      >
                        <span className="flex items-center gap-2 w-full">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full shrink-0',
                              bgColor
                            )}
                          />
                          <span className="text-foreground">{label}</span>
                        </span>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Selected Labels Display */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {labels.map((label) => (
                    <div
                      key={label}
                      className={cn(
                        'px-2 py-1 text-xs rounded-full flex items-center gap-1',
                        labelColors[label] || 'bg-primary/20 text-primary'
                      )}
                    >
                      {label}
                      <button
                        onClick={() => handleLabelToggle(label)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-sm font-medium text-muted-foreground uppercase">
                Fecha de Vencimiento
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
            </div>

            {/* Timestamps */}
            <div className="space-y-2 pt-3 border-t">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Creado</p>
                <p className="text-sm">{formatTimestamp(task.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Actualizado</p>
                <p className="text-sm">{formatTimestamp(task.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Eliminar Tarea
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleClose}
            data-save-button="true"
          >
            Guardar
          </Button>
        </div>

        {/* Saving Indicator */}
        {saving && (
          <div className="absolute top-4 right-14 text-xs text-muted-foreground">
            Guardando...
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
