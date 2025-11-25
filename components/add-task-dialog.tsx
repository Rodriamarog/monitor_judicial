"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Task, Priority } from "@/components/kanban-board"

interface AddTaskDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (task: Omit<Task, "id">) => void
}

const teamMembers = [
  { name: "Alex Chen", initials: "AC" },
  { name: "Sarah Miller", initials: "SM" },
  { name: "Jordan Lee", initials: "JL" },
  { name: "Emma Wilson", initials: "EW" },
]

const labelOptions = [
  "Documentation",
  "Design",
  "Backend",
  "Frontend",
  "Performance",
  "Research",
  "UI/UX",
  "Security",
  "Bug",
  "DevOps",
  "Database",
]

export default function AddTaskDialog({ open, onClose, onAdd }: AddTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [assignee, setAssignee] = useState(teamMembers[0].name)
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [storyPoints, setStoryPoints] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const member = teamMembers.find((m) => m.name === assignee) || teamMembers[0]

    onAdd({
      title,
      description,
      priority,
      assignee: {
        name: member.name,
        avatar: "",
        initials: member.initials,
      },
      labels: selectedLabels,
      storyPoints: storyPoints ? Number.parseInt(storyPoints) : undefined,
    })

    // Reset form
    setTitle("")
    setDescription("")
    setPriority("medium")
    setAssignee(teamMembers[0].name)
    setSelectedLabels([])
    setStoryPoints("")
  }

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Story Points</Label>
              <Input
                type="number"
                placeholder="0"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.name} value={member.name}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-2">
              {labelOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedLabels.includes(label)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:border-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
