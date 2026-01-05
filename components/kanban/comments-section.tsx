'use client'

import { useState, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user_profiles?: {
    email: string
  }
}

interface CommentsSectionProps {
  taskId: string
  userId: string
}

export function CommentsSection({ taskId, userId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  // Load comments on mount
  useEffect(() => {
    loadComments()
  }, [taskId])

  const loadComments = async () => {
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('kanban_comments')
        .select('id, content, created_at, user_id')
        .eq('task_id', taskId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (commentsError) {
        console.error('Error loading comments:', commentsError)
        return
      }

      // Fetch user profiles for all unique user IDs
      const userIds = [...new Set((commentsData || []).map(c => c.user_id))]
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      // Map profiles to comments
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
      const commentsWithProfiles = (commentsData || []).map(comment => ({
        ...comment,
        user_profiles: profileMap.get(comment.user_id)
      }))

      setComments(commentsWithProfiles as Comment[])
    } catch (err) {
      console.error('Error in loadComments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return

    setSubmitting(true)

    try {
      const { data: newCommentData, error } = await supabase
        .from('kanban_comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          content: newComment.trim()
        })
        .select('id, content, created_at, user_id')
        .single()

      if (error) {
        console.error('Error adding comment:', error)
        return
      }

      if (newCommentData) {
        // Fetch the user profile for this comment
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', newCommentData.user_id)
          .single()

        const commentWithProfile = {
          ...newCommentData,
          user_profiles: profile
        }

        setComments([...comments, commentWithProfile as Comment])
        setNewComment('')
      }
    } catch (err) {
      console.error('Error in handleAddComment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    // Optimistic update
    setComments(comments.filter((c) => c.id !== commentId))

    try {
      const { error } = await supabase
        .from('kanban_comments')
        .delete()
        .eq('id', commentId)

      if (error) {
        console.error('Error deleting comment:', error)
        // Reload comments on error
        loadComments()
      }
    } catch (err) {
      console.error('Error in handleDeleteComment:', err)
      loadComments()
    }
  }

  const formatCommentTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: es
      })
    } catch {
      return 'hace un momento'
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase">
          Comentarios
        </h3>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase">
        Comentarios
      </h3>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className={`p-3 rounded-md ${
                index % 2 === 0 ? 'bg-muted/50' : 'bg-muted/20'
              } group hover:bg-muted transition-colors`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.user_profiles?.email || 'Usuario'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCommentTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
                {comment.user_id === userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No hay comentarios aún</p>
      )}

      {/* Add Comment Input */}
      <div className="space-y-2 -mx-0.5 px-0.5">
        <Textarea
          placeholder="Escribe un comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleAddComment()
            }
          }}
          className="min-h-[80px] resize-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-transparent"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Presiona Ctrl+Enter para enviar
          </span>
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={!newComment.trim() || submitting}
          >
            <Send className="h-4 w-4 mr-2" />
            Comentar
          </Button>
        </div>
      </div>
    </div>
  )
}
