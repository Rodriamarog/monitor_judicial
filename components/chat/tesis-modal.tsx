'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface TesisData {
  id_tesis: number
  rubro: string
  texto: string
  precedentes: string | null
  epoca: string | null
  instancia: string | null
  organo_juris: string | null
  fuente: string | null
  tesis: string | null
  tipo_tesis: string | null
  localizacion: string | null
  anio: number | null
  mes: string | null
  nota_publica: string | null
  anexos: string | null
  materias: string[] | null
}

interface TesisModalProps {
  tesisId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TesisModal({ tesisId, open, onOpenChange }: TesisModalProps) {
  const [tesis, setTesis] = useState<TesisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && tesisId) {
      fetchTesis(tesisId)
    } else {
      setTesis(null)
      setError(null)
    }
  }, [open, tesisId])

  const fetchTesis = async (id: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tesis/${id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch tesis')
      }

      const data = await response.json()
      setTesis(data)
    } catch (err) {
      setError('Error al cargar la tesis')
      console.error('Error fetching tesis:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {loading && 'Cargando tesis...'}
            {error && 'Error'}
            {tesis && `Tesis ${tesis.id_tesis}`}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-muted-foreground">
            {error}
          </div>
        )}

        {tesis && (
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-4">
              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                {tesis.tipo_tesis && (
                  <Badge variant="default">{tesis.tipo_tesis}</Badge>
                )}
                {tesis.epoca && (
                  <Badge variant="outline">{tesis.epoca}</Badge>
                )}
                {tesis.anio && (
                  <Badge variant="secondary">{tesis.anio}</Badge>
                )}
                {tesis.materias && tesis.materias.length > 0 && (
                  tesis.materias.map((materia) => (
                    <Badge key={materia} variant="outline">
                      {materia}
                    </Badge>
                  ))
                )}
              </div>

              {/* Rubro */}
              <div>
                <h3 className="font-semibold text-base mb-2">Rubro</h3>
                <p className="text-sm">{tesis.rubro}</p>
              </div>

              {/* Texto */}
              {tesis.texto && (
                <div>
                  <h3 className="font-semibold text-base mb-2">Texto</h3>
                  <p className="text-sm whitespace-pre-wrap">{tesis.texto}</p>
                </div>
              )}

              {/* Precedentes */}
              {tesis.precedentes && (
                <div>
                  <h3 className="font-semibold text-base mb-2">Precedentes</h3>
                  <p className="text-sm whitespace-pre-wrap">{tesis.precedentes}</p>
                </div>
              )}

              {/* Tesis Number */}
              {tesis.tesis && (
                <div>
                  <h3 className="font-semibold text-base mb-2">Número de Tesis</h3>
                  <p className="text-sm">{tesis.tesis}</p>
                </div>
              )}

              {/* Additional Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {tesis.instancia && (
                  <div>
                    <span className="font-semibold">Instancia:</span>{' '}
                    <span className="text-muted-foreground">{tesis.instancia}</span>
                  </div>
                )}
                {tesis.organo_juris && (
                  <div>
                    <span className="font-semibold">Órgano:</span>{' '}
                    <span className="text-muted-foreground">{tesis.organo_juris}</span>
                  </div>
                )}
                {tesis.fuente && (
                  <div>
                    <span className="font-semibold">Fuente:</span>{' '}
                    <span className="text-muted-foreground">{tesis.fuente}</span>
                  </div>
                )}
                {tesis.localizacion && (
                  <div>
                    <span className="font-semibold">Localización:</span>{' '}
                    <span className="text-muted-foreground">{tesis.localizacion}</span>
                  </div>
                )}
              </div>

              {/* Nota Publica */}
              {tesis.nota_publica && (
                <div>
                  <h3 className="font-semibold text-base mb-2">Nota Pública</h3>
                  <p className="text-sm whitespace-pre-wrap">{tesis.nota_publica}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
