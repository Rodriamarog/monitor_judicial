'use client'

import { useState, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Subtask {
  id: string
  parent_task_id: string
  title: string
  is_completed: boolean
  position: number
  created_at: string
}

interface SubtasksSectionProps {
  parentTaskId: string
  userId: string
  columnId: string
  onSubtasksChange?: () => void
}

export function SubtasksSection({ parentTaskId, userId, columnId, onSubtasksChange }: SubtasksSectionProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('')
  const supabase = createClient()

  // Load subtasks on mount
  useEffect(() => {
    loadSubtasks()
  }, [parentTaskId])

  const loadSubtasks = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_tasks')
        .select('id, title, is_completed, position, created_at, parent_task_id')
        .eq('parent_task_id', parentTaskId)
        .is('deleted_at', null)
        .order('position', { ascending: true })

      if (error) {
        console.error('Error loading subtasks:', error)
        return
      }

      setSubtasks(data || [])
    } catch (err) {
      console.error('Error in loadSubtasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return

    try {
      const { data: newSubtask, error } = await supabase
        .from('kanban_tasks')
        .insert({
          column_id: columnId,
          parent_task_id: parentTaskId,
          user_id: userId,
          title: newSubtaskTitle.trim(),
          description: '',
          is_completed: false,
          position: subtasks.length,
          labels: []
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding subtask:', error)
        return
      }

      if (newSubtask) {
        setSubtasks([...subtasks, newSubtask as Subtask])
        setNewSubtaskTitle('')
        // Keep input visible after adding a subtask
        // Notify parent to reload subtasks
        onSubtasksChange?.()
      }
    } catch (err) {
      console.error('Error in handleAddSubtask:', err)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, currentValue: boolean) => {
    // Optimistic update
    setSubtasks(
      subtasks.map((st) =>
        st.id === subtaskId ? { ...st, is_completed: !currentValue } : st
      )
    )

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ is_completed: !currentValue })
        .eq('id', subtaskId)

      if (error) {
        console.error('Error toggling subtask:', error)
        // Revert optimistic update
        setSubtasks(
          subtasks.map((st) =>
            st.id === subtaskId ? { ...st, is_completed: currentValue } : st
          )
        )
      } else {
        // Notify parent to reload subtasks
        onSubtasksChange?.()
      }
    } catch (err) {
      console.error('Error in handleToggleSubtask:', err)
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    // Optimistic update
    setSubtasks(subtasks.filter((st) => st.id !== subtaskId))

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .delete()
        .eq('id', subtaskId)

      if (error) {
        console.error('Error deleting subtask:', error)
        // Reload subtasks on error
        loadSubtasks()
      } else {
        // Notify parent to reload subtasks
        onSubtasksChange?.()
      }
    } catch (err) {
      console.error('Error in handleDeleteSubtask:', err)
    }
  }

  const handleStartEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id)
    setEditingSubtaskTitle(subtask.title)
  }

  const handleSaveEditSubtask = async () => {
    if (!editingSubtaskId || !editingSubtaskTitle.trim()) return

    // Optimistic update
    setSubtasks(
      subtasks.map((st) =>
        st.id === editingSubtaskId ? { ...st, title: editingSubtaskTitle.trim() } : st
      )
    )

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ title: editingSubtaskTitle.trim() })
        .eq('id', editingSubtaskId)

      if (error) {
        console.error('Error updating subtask:', error)
        // Reload on error
        loadSubtasks()
      } else {
        // Notify parent to reload subtasks
        onSubtasksChange?.()
      }
    } catch (err) {
      console.error('Error in handleSaveEditSubtask:', err)
    } finally {
      setEditingSubtaskId(null)
      setEditingSubtaskTitle('')
    }
  }

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null)
    setEditingSubtaskTitle('')
  }

  const handleCancelAddSubtask = () => {
    setNewSubtaskTitle('')
    setIsAddingSubtask(false)
  }

  const completedCount = subtasks.filter((st) => st.is_completed).length
  const totalCount = subtasks.length

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase">
          Subtareas
        </h3>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase">
          Subtareas
        </h3>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount} de {totalCount} completadas
          </span>
        )}
      </div>

      {/* Empty State - Show placeholder button when no subtasks and not adding */}
      {subtasks.length === 0 && !isAddingSubtask ? (
        <button
          onClick={() => {
            setIsAddingSubtask(true)
          }}
          className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          Agregar subtarea...
        </button>
      ) : (
        <>
          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* Subtask List */}
          {subtasks.length > 0 && (
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <div key={subtask.id}>
                  {editingSubtaskId === subtask.id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 -mx-2">
                        <Checkbox
                          checked={subtask.is_completed}
                          onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
                        />
                        <Input
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleSaveEditSubtask()
                            } else if (e.key === 'Escape') {
                              handleCancelEditSubtask()
                            }
                          }}
                          className="text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-transparent"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2 ml-8">
                        <Button
                          size="sm"
                          onClick={handleSaveEditSubtask}
                          disabled={!editingSubtaskTitle.trim()}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditSubtask}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center gap-2 group hover:bg-muted/50 p-2 -mx-2 rounded-md transition-colors">
                      <Checkbox
                        checked={subtask.is_completed}
                        onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
                      />
                      <button
                        onClick={() => handleStartEditSubtask(subtask)}
                        className={cn(
                          'flex-1 text-sm text-left',
                          subtask.is_completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {subtask.title}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Subtask Section */}
          {isAddingSubtask ? (
            <div className="space-y-2">
              <Input
                placeholder="Agregar subtarea..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubtask()
                  } else if (e.key === 'Escape') {
                    handleCancelAddSubtask()
                  }
                }}
                className="text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-transparent"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                >
                  Agregar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAddSubtask}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : subtasks.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingSubtask(true)}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar subtarea
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
