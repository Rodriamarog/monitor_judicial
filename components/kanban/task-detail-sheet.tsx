'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Trash2,
} from 'lucide-react'
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

interface TaskDetailSheetProps {
  task: Task
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
}

const TASK_COLORS = [
  { label: 'Sin color', value: null },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Amarillo', value: '#eab308' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Morado', value: '#a855f7' },
  { label: 'Rosa', value: '#ec4899' },
]

export function TaskDetailSheet({
  task,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailSheetProps) {
  const [title, setTitle] = useState(task.title)
  const [color, setColor] = useState(task.color)
  const [dueDate, setDueDate] = useState(
    task.due_date ? task.due_date.split('T')[0] : ''
  )

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
    content: task.description || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none p-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1',
      },
    },
  })

  const handleSave = () => {
    if (editor) {
      const html = editor.getHTML()
      onUpdate(task.id, { description: html })
    }
    onClose()
  }

  useEffect(() => {
    if (editor && task.description !== editor.getHTML()) {
      editor.commands.setContent(task.description || '')
    }
  }, [task.description, editor])

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() })
    } else if (!title.trim()) {
      setTitle(task.title)
    }
  }

  const handleColorChange = (newColor: string | null) => {
    setColor(newColor)
    onUpdate(task.id, { color: newColor })
  }

  const handleDueDateChange = (date: string) => {
    setDueDate(date)
    onUpdate(task.id, { due_date: date ? new Date(date).toISOString() : null })
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalles de la Tarea</SheetTitle>
          <SheetDescription>
            Edita la información de tu tarea
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder="Título de la tarea"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value || 'none'}
                  onClick={() => handleColorChange(colorOption.value)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    color === colorOption.value
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-muted hover:border-muted-foreground'
                  )}
                  style={{
                    backgroundColor: colorOption.value || '#f3f4f6',
                  }}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date">Fecha de Vencimiento</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
            />
          </div>

          {/* Description / Rich Text Editor */}
          <div className="space-y-2">
            <Label>Descripción</Label>

            {/* Editor Toolbar */}
            {editor && (
              <div className="border rounded-md p-2 bg-muted/30 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(
                    'h-8 w-8 p-0',
                    editor.isActive('bold') && 'bg-muted'
                  )}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(
                    'h-8 w-8 p-0',
                    editor.isActive('italic') && 'bg-muted'
                  )}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                  className={cn(
                    'h-8 w-8 p-0',
                    editor.isActive('bulletList') && 'bg-muted'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                  className={cn(
                    'h-8 w-8 p-0',
                    editor.isActive('orderedList') && 'bg-muted'
                  )}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Editor Content */}
            <div className="border rounded-md min-h-[200px] bg-background">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t flex gap-2">
            <Button
              onClick={handleSave}
              className="flex-1"
            >
              Guardar
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(task.id)}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Tarea
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
