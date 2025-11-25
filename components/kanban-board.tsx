"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Plus, MoreHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import TaskCard from "@/components/task-card"
import AddTaskDialog from "@/components/add-task-dialog"
import EditTaskDialog from "@/components/edit-task-dialog"

export interface Task {
  id: string
  title: string
  description: string
  labels: string[]
  dueDate?: string
  comments?: Comment[]
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
}

const initialColumns: Column[] = [
  {
    id: "pendiente",
    title: "Pendiente",
    color: "bg-slate-500",
    tasks: [
      {
        id: "task-1",
        title: "Presentar demanda laboral",
        description: "Preparar y presentar demanda por despido injustificado ante el juzgado laboral",
        labels: ["Laboral", "Urgente"],
        dueDate: "28 Nov",
      },
      {
        id: "task-2",
        title: "Revisión de contrato mercantil",
        description: "Análisis de cláusulas y condiciones del contrato de compraventa",
        labels: ["Mercantil"],
      },
      {
        id: "task-3",
        title: "Audiencia preliminar",
        description: "Preparar alegatos y documentación para audiencia preliminar",
        labels: ["Civil", "Audiencia"],
        dueDate: "30 Nov",
      },
    ],
  },
  {
    id: "en-progreso",
    title: "En Progreso",
    color: "bg-blue-500",
    tasks: [
      {
        id: "task-4",
        title: "Recurso de apelación",
        description: "Redactar recurso de apelación contra sentencia de primera instancia",
        labels: ["Civil", "Apelación"],
      },
      {
        id: "task-5",
        title: "Negociación extrajudicial",
        description: "Mediación con la contraparte para llegar a un acuerdo",
        labels: ["Negociación"],
        dueDate: "25 Nov",
      },
    ],
  },
  {
    id: "revision",
    title: "En Revisión",
    color: "bg-amber-500",
    tasks: [
      {
        id: "task-6",
        title: "Escritura de constitución",
        description: "Revisión final de escritura para constitución de sociedad",
        labels: ["Mercantil", "Notarial"],
      },
    ],
  },
  {
    id: "completado",
    title: "Completado",
    color: "bg-emerald-500",
    tasks: [
      {
        id: "task-7",
        title: "Registro de marca",
        description: "Completado el registro de marca ante IMPI",
        labels: ["Propiedad Intelectual"],
      },
      {
        id: "task-8",
        title: "Contestación de demanda",
        description: "Presentada contestación de demanda en tiempo y forma",
        labels: ["Civil"],
      },
    ],
  },
]

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [addTaskColumn, setAddTaskColumn] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnTitle, setEditingColumnTitle] = useState("")

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

      // Same column reordering
      if (source.droppableId === destination.droppableId) {
        return prevColumns.map((column) => {
          if (column.id !== source.droppableId) return column

          const newTasks = [...column.tasks]
          newTasks.splice(source.index, 1)
          newTasks.splice(destination.index, 0, sourceTask)
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
          newTasks.splice(destination.index, 0, sourceTask)
          return { ...column, tasks: newTasks }
        }
        return column
      })
    })
  }

  const handleAddTask = (columnId: string, task: Omit<Task, "id">) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
    }

    setColumns((prev) =>
      prev.map((column) => (column.id === columnId ? { ...column, tasks: [...column.tasks, newTask] } : column)),
    )
    setAddTaskColumn(null)
  }

  const handleUpdateTask = (updatedTask: Task) => {
    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      })),
    )
    setEditingTask(null)
  }

  const handleDeleteTask = (taskId: string) => {
    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      })),
    )
    setEditingTask(null)
  }

  const handleAddColumn = () => {
    if (columns.length >= 4) {
      alert("Máximo 4 columnas permitidas")
      return
    }

    const newColumn: Column = {
      id: `column-${Date.now()}`,
      title: `Nueva Columna`,
      color: "bg-slate-500",
      tasks: [],
    }

    setColumns([...columns, newColumn])
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
  }

  const handleColumnTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveColumnTitle()
    } else if (e.key === "Escape") {
      setEditingColumnId(null)
      setEditingColumnTitle("")
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
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
