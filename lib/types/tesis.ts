/**
 * Tesis types for RAG system
 */

export interface TesisSource {
  id_tesis: number
  chunk_text: string
  chunk_type: string
  similarity: number
  recency_score: number
  epoca_score: number
  final_score: number
  rubro: string
  texto: string
  tipo_tesis: string
  epoca: string
  anio: number
  materias: string[]
}
