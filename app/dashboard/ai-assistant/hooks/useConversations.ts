import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

type Conversation = {
  id: string
  title: string | null
  updated_at: string
}

export function useConversations() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as Conversation[]
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  })
}

export function useDeleteConversation() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Delete messages first (foreign key constraint)
      await supabase.from('messages').delete().eq('conversation_id', conversationId)

      // Delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate conversations cache to refetch
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
