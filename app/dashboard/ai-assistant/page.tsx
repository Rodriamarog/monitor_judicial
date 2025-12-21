'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  Plus,
  BookOpen,
  Filter,
  X,
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MarkdownMessage } from '@/components/chat/markdown-message'
import { LoadingDots } from '@/components/chat/loading-dots'
import { useMessageAnimation } from '@/hooks/use-message-animation'
import { TesisModal } from '@/components/chat/tesis-modal'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

interface Source {
  id_tesis: number
  rubro: string
  similarity: number
  final_score?: number
  tipo_tesis: string
  epoca?: string
  anio: number
}

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sources, setSources] = useState<Source[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sourcesAnimating, setSourcesAnimating] = useState(false)
  const [selectedTesisId, setSelectedTesisId] = useState<number | null>(null)
  const [tesisModalOpen, setTesisModalOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Use ref to store the latest conversation ID from headers (avoids stale closure)
  const latestConversationIdRef = useRef<string | null>(null)
  const prevSourcesLengthRef = useRef(0)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai-assistant/chat',
      async fetch(input, init) {
        const response = await fetch(input, init)

        // Extract conversation ID from headers
        const conversationId = response.headers.get('X-Conversation-Id')
        if (conversationId) {
          console.log('[DEBUG] Conversation ID from headers:', conversationId)
          latestConversationIdRef.current = conversationId

          if (!currentConversationId) {
            console.log('[DEBUG] Setting new conversation ID:', conversationId)
            setCurrentConversationId(conversationId)

            // Optimistically add new conversation to the list
            const newConversation = {
              id: conversationId,
              title: 'Nueva conversación',
              updated_at: new Date().toISOString(),
            }
            setConversations((prev) => [newConversation, ...prev])

            // Fetch the actual conversation details in the background to get the real title
            supabase
              .from('conversations')
              .select('id, title, updated_at')
              .eq('id', conversationId)
              .single()
              .then(({ data }) => {
                if (data) {
                  setConversations((prev) =>
                    prev.map((c) => (c.id === conversationId ? data : c))
                  )
                }
              })
          }
        }

        return response
      },
    }),
    onFinish: async ({ message }) => {
      console.log('[DEBUG] onFinish triggered')

      // Use the latest conversation ID from ref (not stale state)
      const conversationId = latestConversationIdRef.current || currentConversationId
      console.log('[DEBUG] Conversation ID to use:', conversationId)

      // Load sources from database for the latest assistant message
      if (conversationId) {
        console.log('[DEBUG] Fetching sources from Supabase for conversation:', conversationId)

        // Add a small delay to ensure the message was saved
        await new Promise(resolve => setTimeout(resolve, 500))

        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('sources')
          .eq('conversation_id', conversationId)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        console.log('[DEBUG] Supabase response:', { messagesData, error })

        if (messagesData?.sources) {
          console.log('[DEBUG] Setting sources:', messagesData.sources)
          setSources(messagesData.sources)
        } else {
          console.log('[DEBUG] No sources found in database')
        }

        // Update conversation timestamp and move to top of list
        setConversations((prev) => {
          const existingConv = prev.find((c) => c.id === conversationId)
          if (existingConv) {
            // Move to top with updated timestamp
            return [
              { ...existingConv, updated_at: new Date().toISOString() },
              ...prev.filter((c) => c.id !== conversationId),
            ]
          }
          return prev
        })
      } else {
        console.log('[DEBUG] No conversation ID available, cannot fetch sources')
      }
    },
  })

  const isLoading = status === 'submitted' // Hide loading indicator once streaming starts
  const animatingIndex = useMessageAnimation(messages.length)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Trigger animation when sources appear
  useEffect(() => {
    if (sources.length > 0 && prevSourcesLengthRef.current === 0) {
      setSourcesAnimating(true)
      const timer = setTimeout(() => {
        setSourcesAnimating(false)
      }, 400) // Match animation duration

      return () => clearTimeout(timer)
    }
    prevSourcesLengthRef.current = sources.length
  }, [sources])

  const loadConversations = async () => {
    setLoadingConversations(true)
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setConversations(data)
    }
    setLoadingConversations(false)
  }

  const loadConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId)

    // Load messages from this conversation
    const { data: messagesData } = await supabase
      .from('messages')
      .select('role, content, sources, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesData) {
      // Convert Supabase messages to AI SDK UIMessage format
      const formattedMessages = messagesData.map((msg: any) => ({
        id: crypto.randomUUID(),
        role: msg.role,
        parts: [
          {
            type: 'text',
            text: msg.content,
          },
        ],
      }))

      // Set messages in the chat
      setMessages(formattedMessages)

      // Get sources from last assistant message
      const lastAssistantMessage = messagesData
        .filter((m: any) => m.role === 'assistant')
        .reverse()[0]

      if (lastAssistantMessage?.sources) {
        setSources(lastAssistantMessage.sources)
      }
    }
  }

  const startNewConversation = () => {
    setCurrentConversationId(null)
    setSources([])
    setMessages([]) // Clear messages when starting new conversation
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    // Capture the input value
    const messageText = inputValue

    // Clear input IMMEDIATELY (before sending)
    setInputValue('')

    // Pass dynamic body parameters at request-level to avoid stale state
    await sendMessage(
      { text: messageText },
      {
        body: {
          conversationId: currentConversationId,
          filters: selectedMaterias.length > 0 ? { materias: selectedMaterias } : undefined,
        },
      }
    )
  }

  const materiaOptions = [
    'Administrativa',
    'Civil',
    'Común',
    'Penal',
    'Laboral',
    'Constitucional',
    'Electoral',
    'Fiscal (ADM)',
  ]

  // Display names for materias (cleaner UI)
  const materiaDisplayNames: Record<string, string> = {
    'Fiscal (ADM)': 'Fiscal',
  }

  const toggleMateria = (materia: string) => {
    setSelectedMaterias((prev) =>
      prev.includes(materia)
        ? prev.filter((m) => m !== materia)
        : [...prev, materia]
    )
  }

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the conversation click

    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación?')) {
      return
    }

    // Optimistic update: Remove from UI immediately
    setConversations((prev) => prev.filter((c) => c.id !== conversationId))

    // If the deleted conversation was the current one, clear it
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null)
      setSources([])
      setMessages([]) // Clear messages
    }

    // Delete from database in background
    try {
      // Delete messages first (due to foreign key constraint)
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)

      // Then delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) {
        console.error('Error deleting conversation:', error)
        // Optionally: reload conversations to revert the optimistic update
        loadConversations()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      // Optionally: reload conversations to revert the optimistic update
      loadConversations()
    }
  }

  const handleTesisClick = (tesisId: number) => {
    setSelectedTesisId(tesisId)
    setTesisModalOpen(true)
  }

  return (
    <div className="h-full p-6">
      <div className="flex gap-4 h-full">
        {/* Sidebar - Conversations */}
        <div className="w-80 flex flex-col gap-4 h-full overflow-hidden">
        {/* Conversations */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversaciones
              </CardTitle>
              <Button size="sm" onClick={startNewConversation} className="cursor-pointer">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loadingConversations ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No hay conversaciones
              </div>
            ) : (
              <div className="space-y-1 px-4 pt-0 pb-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      currentConversationId === conv.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <button
                      onClick={() => loadConversation(conv.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-medium text-sm truncate">
                        {conv.title}
                      </div>
                    </button>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-destructive/10 rounded"
                      aria-label="Eliminar conversación"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="w-4 h-4" />
                Filtrar por Materia
              </CardTitle>
              {selectedMaterias.length > 0 && (
                <Badge variant="default" className="text-xs">
                  {selectedMaterias.length} activa{selectedMaterias.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Refina los resultados seleccionando materias específicas
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {materiaOptions.map((materia) => (
              <div key={materia} className="flex items-center justify-between space-x-2">
                <Label htmlFor={`materia-${materia}`} className="text-sm font-normal cursor-pointer flex-1">
                  {materiaDisplayNames[materia] || materia}
                </Label>
                <Switch
                  id={`materia-${materia}`}
                  checked={selectedMaterias.includes(materia)}
                  onCheckedChange={() => toggleMateria(materia)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Card className="flex-1 flex flex-col h-full">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Asistente Legal de Tesis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Pregunta sobre jurisprudencia mexicana
                </p>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h3 className="text-lg font-semibold mb-2">
                  ¿En qué puedo ayudarte hoy?
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Pregunta sobre tesis jurisprudenciales, criterios de la SCJN,
                  o casos específicos de derecho mexicano.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-2xl">
                  {[
                    '¿Qué es el principio pro persona?',
                    'Jurisprudencia sobre amparo directo',
                    'Estándar probatorio en materia penal',
                    'Tesis sobre derechos laborales',
                  ].map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="text-left h-auto p-3 cursor-pointer"
                      onClick={() => setInputValue(example)}
                    >
                      <div className="text-sm">{example}</div>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } ${
                      animatingIndex === i
                        ? message.role === 'user'
                          ? 'animate-in fade-in slide-in-from-right-2 duration-500'
                          : 'animate-in fade-in slide-in-from-bottom-2 duration-500'
                        : ''
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div>
                        {message.parts?.map((part: any, idx: number) =>
                          part.type === 'text' ? (
                            <MarkdownMessage
                              key={idx}
                              content={part.text}
                              role={message.role as 'user' | 'assistant'}
                            />
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && <LoadingDots />}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu pregunta sobre tesis jurisprudenciales..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Sources Sidebar */}
      {sources.length > 0 && (
        <div className={`w-96 h-full overflow-hidden ${sourcesAnimating ? 'animate-in fade-in slide-in-from-right-4 duration-400' : ''}`}>
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Fuentes Consultadas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {sources.map((source, i) => (
                    <Card
                      key={i}
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleTesisClick(source.id_tesis)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {(source.similarity * 100).toFixed(0)}% relevancia
                          </Badge>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            ID: {source.id_tesis}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {source.rubro}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {source.tipo_tesis}
                          </Badge>
                          <span>{source.anio}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tesis Modal */}
      <TesisModal
        tesisId={selectedTesisId}
        open={tesisModalOpen}
        onOpenChange={setTesisModalOpen}
      />
      </div>
    </div>
  )
}
