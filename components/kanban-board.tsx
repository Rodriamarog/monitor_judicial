"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Plus, MoreHorizontal, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import TaskCard from "@/components/task-card"
import AddTaskDialog from "@/components/add-task-dialog"
import EditTaskDialog from "@/components/edit-task-dialog"

// Database task interface
export interface Task {
  id: string
  column_id: string
  title: string
  description: string
  labels: string[]
  dueDate?: string // Display format: "Nov 27"
  due_date?: string | null // Database format: "YYYY-MM-DD"
  calendar_event_id?: string | null
  position?: number
  color?: string
  comments?: Comment[]
  created_at?: string
  updated_at?: string
}

export interface Comment {
  id: string
  text: string
  author: string
  createdAt: string
}

export interface Column {
  id: string
  title: string
  color: string
  tasks: Task[]
  position?: number
  user_id?: string
}

export default function KanbanBoard() {
  const router = useRouter()
  const supabase = createClient()

  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [addTaskColumn, setAddTaskColumn] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnTitle, setEditingColumnTitle] = useState("")

  // Load kanban data from database
  useEffect(() => {
    async function loadKanbanData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setUserId(user.id)

        const { data: columns, error } = await supabase
          .from('kanban_columns')
          .select(`
            *,
            kanban_tasks (*)
          `)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('position')

        if (error) {
          console.error('Error loading kanban data:', error)
          return
        }

        // Transform to UI format
        const transformedColumns: Column[] = (columns || []).map((col: any) => ({
          id: col.id,
          title: col.title,
          color: col.color,
          position: col.position,
          user_id: col.user_id,
          tasks: (col.kanban_tasks || [])
            .filter((t: any) => !t.deleted_at)
            .sort((a: any, b: any) => a.position - b.position)
            .map((t: any) => ({
              id: t.id,
              column_id: t.column_id,
              title: t.title,
              description: t.description || '',
              labels: Array.isArray(t.labels) ? t.labels : [], // Load labels from DB
              dueDate: t.due_date ? formatDisplayDate(t.due_date) : undefined,
              due_date: t.due_date,
              calendar_event_id: t.calendar_event_id,
              position: t.position,
              color: t.color,
              comments: [], // Comments not in DB schema yet - keep as UI-only
            }))
        }))

        setColumns(transformedColumns)
      } catch (err) {
        console.error('Error in loadKanbanData:', err)
      } finally {
        setLoading(false)
      }
    }

    loadKanbanData()
  }, [router, supabase])

  // Helper to format date for display
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
  }

  // Save entire state to database (batch operation)
  const saveKanbanData = async () => {
    if (!hasChanges || !userId) return

    try {
      // Batch upsert columns
      const columnsToSave = columns.map((col, idx) => ({
        id: col.id,
        user_id: userId,
        title: col.title,
        color: col.color,
        position: idx,
        deleted_at: null,
      }))

      const { error: colError } = await supabase
        .from('kanban_columns')
        .upsert(columnsToSave)

      if (colError) {
        console.error('Error saving columns:', colError)
        return
      }

      // Batch upsert all tasks
      const allTasks = columns.flatMap((col) =>
        col.tasks.map((task, taskIdx) => ({
          id: task.id,
          column_id: col.id,
          user_id: userId,
          title: task.title,
          description: task.description,
          position: taskIdx,
          color: task.color || 'bg-slate-500',
          due_date: task.due_date || null,
          calendar_event_id: task.calendar_event_id || null,
          labels: task.labels || [], // Save labels to DB
          deleted_at: null,
        }))
      )

      const { error: taskError } = await supabase
        .from('kanban_tasks')
        .upsert(allTasks)

      if (taskError) {
        console.error('Error saving tasks:', taskError)
        return
      }

      setHasChanges(false)
      console.log('✅ Kanban data saved successfully')
    } catch (err) {
      console.error('Error in saveKanbanData:', err)
    }
  }

  // Save on unmount
  useEffect(() => {
    return () => {
      if (hasChanges) saveKanbanData()
    }
  }, [hasChanges, columns])

  // Save on navigation/visibility change
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        saveKanbanData()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasChanges) {
        saveKanbanData()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [hasChanges, columns])

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    setColumns((prevColumns) => {
      const sourceColumn = prevColumns.find((col) => col.id === source.droppableId)
      const destColumn = prevColumns.find((col) => col.id === destination.droppableId)

      if (!sourceColumn || !destColumn) return prevColumns

      const sourceTask = sourceColumn.tasks[source.index]
      if (!sourceTask) return prevColumns

      // Update task's column_id when moving between columns
      const updatedTask = {
        ...sourceTask,
        column_id: destination.droppableId,
      }

      // Same column reordering
      if (source.droppableId === destination.droppableId) {
        return prevColumns.map((column) => {
          if (column.id !== source.droppableId) return column

          const newTasks = [...column.tasks]
          newTasks.splice(source.index, 1)
          newTasks.splice(destination.index, 0, updatedTask)
          return { ...column, tasks: newTasks }
        })
      }

      // Moving between columns
      return prevColumns.map((column) => {
        if (column.id === source.droppableId) {
          return {
            ...column,
            tasks: column.tasks.filter((_, index) => index !== source.index),
          }
        }
        if (column.id === destination.droppableId) {
          const newTasks = [...column.tasks]
          newTasks.splice(destination.index, 0, updatedTask)
          return { ...column, tasks: newTasks }
        }
        return column
      })
    })

    // Mark as changed
    setHasChanges(true)
  }

  const handleAddTask = (columnId: string, task: Omit<Task, "id" | "column_id">) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      column_id: columnId,
      position: columns.find(col => col.id === columnId)?.tasks.length || 0,
    }

    setColumns((prev) =>
      prev.map((column) => (column.id === columnId ? { ...column, tasks: [...column.tasks, newTask] } : column)),
    )
    setAddTaskColumn(null)
    setHasChanges(true)
  }

  const handleUpdateTask = (updatedTask: Task) => {
    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      })),
    )
    setEditingTask(null)
    setHasChanges(true)
  }

  const handleDeleteTask = (taskId: string) => {
    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      })),
    )
    setEditingTask(null)
    setHasChanges(true)
  }

  const handleAddColumn = () => {
    if (columns.length >= 4) {
      alert("Máximo 4 columnas permitidas")
      return
    }

    const newColumn: Column = {
      id: crypto.randomUUID(),
      title: `Nueva Columna`,
      color: "bg-slate-500",
      tasks: [],
      position: columns.length,
      user_id: userId || undefined,
    }

    setColumns([...columns, newColumn])
    setHasChanges(true)
  }

  const handleDeleteColumn = (columnId: string) => {
    if (columns.length <= 1) {
      alert("Debe haber al menos una columna")
      return
    }

    if (columns.find((c) => c.id === columnId)?.tasks.length! > 0) {
      if (!confirm("Esta columna tiene tareas. ¿Eliminar columna y todas sus tareas?")) {
        return
      }
    }

    setColumns((prev) => prev.filter((col) => col.id !== columnId))
    setHasChanges(true)
  }

  const handleColumnDoubleClick = (column: Column) => {
    setEditingColumnId(column.id)
    setEditingColumnTitle(column.title)
  }

  const handleSaveColumnTitle = () => {
    if (!editingColumnTitle.trim()) return

    setColumns((prev) =>
      prev.map((col) => (col.id === editingColumnId ? { ...col, title: editingColumnTitle.trim() } : col)),
    )
    setEditingColumnId(null)
    setEditingColumnTitle("")
    setHasChanges(true)
  }

  const handleColumnTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveColumnTitle()
    } else if (e.key === "Escape") {
      setEditingColumnId(null)
      setEditingColumnTitle("")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 pt-0 pb-12">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full relative">
            {columns.map((column) => (
              <div key={column.id} className="flex flex-col w-80 min-w-80 bg-secondary/50 rounded-lg">
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`h-2 w-2 rounded-full ${column.color}`} />
                    {editingColumnId === column.id ? (
                      <Input
                        value={editingColumnTitle}
                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                        onBlur={handleSaveColumnTitle}
                        onKeyDown={handleColumnTitleKeyDown}
                        className="h-7 text-sm font-medium"
                        autoFocus
                      />
                    ) : (
                      <>
                        <h2
                          className="font-medium text-foreground cursor-pointer"
                          onDoubleClick={() => handleColumnDoubleClick(column)}
                        >
                          {column.title}
                        </h2>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {column.tasks.length}
                        </span>
                      </>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleColumnDoubleClick(column)}>
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteColumn(column.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Tasks */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 overflow-y-auto transition-colors ${
                        snapshot.isDraggingOver ? "bg-muted/50" : ""
                      }`}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <TaskCard
                                task={task}
                                isDragging={snapshot.isDragging}
                                onClick={() => setEditingTask(task)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add Task Button */}
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => setAddTaskColumn(column.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar tarea
                  </Button>
                </div>
              </div>
            ))}

            {/* Add Column Button */}
            {columns.length < 4 && (
              <Button
                onClick={handleAddColumn}
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 rounded-full"
                style={{ left: `${columns.length * 336}px` }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DragDropContext>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={addTaskColumn !== null}
        onClose={() => setAddTaskColumn(null)}
        onAdd={(task) => addTaskColumn && handleAddTask(addTaskColumn, task)}
      />

      {/* Edit Task Dialog */}
      <EditTaskDialog
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  )
}
