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
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

interface Source {
  id_tesis: number
  rubro: string
  similarity: number
  tipo_tesis: string
  anio: number
}

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sources, setSources] = useState<Source[]>([])
  const [inputValue, setInputValue] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai-assistant/chat',
    }),
    onResponse: (response) => {
      // Extract conversation ID from headers
      const conversationId = response.headers.get('X-Conversation-Id')
      if (conversationId && !currentConversationId) {
        setCurrentConversationId(conversationId)
        loadConversations()
      }

      // Extract sources count from headers
      const sourcesCount = response.headers.get('X-Sources-Count')
      if (sourcesCount) {
        console.log(`Found ${sourcesCount} relevant sources`)
      }
    },
    onFinish: async (message) => {
      // Load sources from database for the latest assistant message
      if (currentConversationId) {
        const { data: messagesData } = await supabase
          .from('messages')
          .select('sources')
          .eq('conversation_id', currentConversationId)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (messagesData?.sources) {
          setSources(messagesData.sources)
        }
      }
    },
  })

  const isLoading = status === 'in_progress'

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
      // Get sources from last assistant message
      const lastAssistantMessage = messagesData
        .filter((m) => m.role === 'assistant')
        .reverse()[0]

      if (lastAssistantMessage?.sources) {
        setSources(lastAssistantMessage.sources)
      }
    }
  }

  const startNewConversation = () => {
    setCurrentConversationId(null)
    setSources([])
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    // Pass dynamic body parameters at request-level to avoid stale state
    await sendMessage(
      { text: inputValue },
      {
        body: {
          conversationId: currentConversationId,
          filters: selectedMaterias.length > 0 ? { materias: selectedMaterias } : undefined,
        },
      }
    )
    setInputValue('')
  }

  const materiaOptions = [
    'Administrativa',
    'Civil',
    'Común',
    'Penal',
    'Laboral',
    'Constitucional',
    'Electoral',
    'Fiscal',
  ]

  const toggleMateria = (materia: string) => {
    setSelectedMaterias((prev) =>
      prev.includes(materia)
        ? prev.filter((m) => m !== materia)
        : [...prev, materia]
    )
  }

  return (
    <div className="h-full p-6">
      <div className="flex gap-4 h-full">
        {/* Sidebar - Conversations */}
        <div className="w-80 flex flex-col gap-4 h-full overflow-hidden">
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
                  {materia}
                </Label>
                <Switch
                  id={`materia-${materia}`}
                  checked={selectedMaterias.includes(materia)}
                  onCheckedChange={() => toggleMateria(materia)}
                />
              </div>
            ))}
            {selectedMaterias.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setSelectedMaterias([])}
              >
                <X className="w-3 h-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversaciones
              </CardTitle>
              <Button size="sm" onClick={startNewConversation}>
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
              <div className="space-y-2 px-4 pt-0 pb-4">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`block w-full text-left p-3 rounded-lg transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {conv.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
                <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
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
                      className="text-left h-auto p-3"
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
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.parts?.map((part: any, idx: number) =>
                          part.type === 'text' ? (
                            <span key={idx}>{part.text}</span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="bg-muted rounded-lg p-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}
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
        <div className="w-96 h-full overflow-hidden">
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
                    <Link
                      key={i}
                      href={`/dashboard/tesis?id=${source.id_tesis}`}
                      target="_blank"
                    >
                      <Card className="cursor-pointer hover:bg-muted transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary">
                              {(source.similarity * 100).toFixed(0)}% relevancia
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ID: {source.id_tesis}
                            </span>
                          </div>
                          <h4 className="font-medium text-sm mb-2 line-clamp-2">
                            {source.rubro}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {source.tipo_tesis}
                            </Badge>
                            <span>{source.anio}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
