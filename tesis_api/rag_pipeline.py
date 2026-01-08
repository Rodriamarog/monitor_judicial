#!/usr/bin/env python3
"""
RAG Pipeline for Legal Thesis Query System
Combines semantic search with LLM for intelligent Q&A
"""
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
import google.generativeai as genai

from db_utils import DatabaseManager
from vectorize_tesis import OpenAIEmbeddingModel

logger = logging.getLogger(__name__)


@dataclass
class TesisContext:
    """Represents a tesis document in the context"""
    id_tesis: int
    rubro: str
    texto: str
    similarity: float
    materias: List[str]
    anio: int
    chunk_text: Optional[str] = None  # If using chunk instead of full text
    is_full_text: bool = True


class SmartContextBuilder:
    """
    Builds context for LLM from search results
    Uses full tesis when possible, falls back to chunks if too large
    """

    def __init__(self, max_chars_per_tesis: int = 5000, max_total_chars: int = 15000):
        """
        Initialize context builder

        Args:
            max_chars_per_tesis: Max characters for a single tesis (use chunk if exceeded)
            max_total_chars: Max total characters for all context
        """
        self.max_chars_per_tesis = max_chars_per_tesis
        self.max_total_chars = max_total_chars

    def build_context(self, search_results: List[Dict]) -> List[TesisContext]:
        """
        Build context from search results

        Strategy:
        1. Group chunks by tesis_id
        2. For each unique tesis:
           - If full texto < max_chars_per_tesis: use full text
           - Else: use best matching chunk only
        3. Stop when total_chars > max_total_chars

        Args:
            search_results: Results from semantic search (includes texto and chunk_text)

        Returns:
            List of TesisContext objects ready for LLM
        """
        # Group results by tesis_id
        tesis_map = {}
        for result in search_results:
            tesis_id = result['id_tesis']
            if tesis_id not in tesis_map:
                tesis_map[tesis_id] = {
                    'best_chunk': result,
                    'all_chunks': []
                }
            tesis_map[tesis_id]['all_chunks'].append(result)

        # Build context list
        context_list = []
        total_chars = 0

        for tesis_id, data in tesis_map.items():
            best_chunk = data['best_chunk']
            full_texto = best_chunk['texto']
            texto_length = len(full_texto)

            # Decide: full text or chunk?
            if texto_length <= self.max_chars_per_tesis:
                # Use full text
                context_chars = texto_length
                context = TesisContext(
                    id_tesis=tesis_id,
                    rubro=best_chunk['rubro'],
                    texto=full_texto,
                    similarity=best_chunk['similarity'],
                    materias=best_chunk['materias'],
                    anio=best_chunk['anio'],
                    is_full_text=True
                )
                logger.debug(f"Tesis {tesis_id}: Using full text ({texto_length} chars)")
            else:
                # Use chunk only (tesis too large)
                chunk_text = best_chunk['chunk_text']
                context_chars = len(chunk_text)
                context = TesisContext(
                    id_tesis=tesis_id,
                    rubro=best_chunk['rubro'],
                    texto=chunk_text,  # Use chunk as texto
                    similarity=best_chunk['similarity'],
                    materias=best_chunk['materias'],
                    anio=best_chunk['anio'],
                    chunk_text=chunk_text,
                    is_full_text=False
                )
                logger.debug(f"Tesis {tesis_id}: Using chunk only ({context_chars} chars, full text too large: {texto_length} chars)")

            # Check total limit
            if total_chars + context_chars > self.max_total_chars:
                logger.info(f"Stopping context building: would exceed max_total_chars ({self.max_total_chars})")
                break

            context_list.append(context)
            total_chars += context_chars

        logger.info(f"Built context: {len(context_list)} tesis, {total_chars} total characters")
        return context_list


class RAGPipeline:
    """
    Complete RAG pipeline: Search + Context Building + LLM (Google Gemini)
    """

    def __init__(
        self,
        db_manager: DatabaseManager,
        embedding_model: OpenAIEmbeddingModel,
        llm_model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None
    ):
        """
        Initialize RAG pipeline with Gemini LLM

        Args:
            db_manager: Database manager for searches
            embedding_model: Model for generating query embeddings
            llm_model: Gemini model name (default: gemini-2.5-flash)
            api_key: Google API key
        """
        self.db = db_manager
        self.embedding_model = embedding_model
        self.context_builder = SmartContextBuilder()

        # Configure Gemini
        genai.configure(api_key=api_key)
        self.llm_model = genai.GenerativeModel(llm_model)
        self.llm_model_name = llm_model

    def ask(
        self,
        query: str,
        materias: Optional[List[str]] = None,
        top_k: int = 10,
        threshold: float = 0.3
    ) -> Dict:
        """
        Ask a question using RAG

        Args:
            query: User's question
            materias: Optional materia filters
            top_k: Number of results to retrieve
            threshold: Similarity threshold

        Returns:
            Dict with:
                - answer: LLM response
                - sources: List of tesis IDs used
                - context: List of TesisContext objects
        """
        logger.info(f"RAG Query: '{query}' | Materias: {materias}")

        # Step 1: Generate query embedding
        logger.info("Generating query embedding...")
        query_embedding = self.embedding_model.encode([query], show_progress=False)[0]

        # Step 2: Semantic search
        logger.info(f"Searching (top_k={top_k}, threshold={threshold}, materias={materias})...")
        search_results = self.db.search_similar(
            query_embedding.tolist(),
            limit=top_k,
            threshold=threshold,
            materias=materias
        )

        if not search_results:
            logger.warning("No results found")
            return {
                'answer': "No encontré tesis relevantes para tu consulta. Intenta reformular la pregunta o ajustar los filtros.",
                'sources': [],
                'context': []
            }

        logger.info(f"Found {len(search_results)} chunks from vector search")

        # Step 3: Build smart context
        logger.info("Building context...")
        context = self.context_builder.build_context(search_results)

        # Step 4: Generate prompt
        prompt = self._build_prompt(query, context)

        # Step 5: Call LLM
        logger.info(f"Calling LLM ({self.llm_model})...")
        answer = self._call_llm(prompt)

        # Step 6: Return results
        sources = [ctx.id_tesis for ctx in context]
        logger.info(f"RAG complete. Used {len(sources)} tesis as sources: {sources}")

        return {
            'answer': answer,
            'sources': sources,
            'context': context
        }

    def _build_prompt(self, query: str, context: List[TesisContext]) -> str:
        """Build prompt for LLM with context"""

        # System message
        system_prompt = """Eres un asistente legal especializado en derecho mexicano.
Tu tarea es responder preguntas basándote ÚNICAMENTE en las tesis jurisprudenciales proporcionadas.

INSTRUCCIONES:
1. Responde en español de manera clara y profesional
2. Cita las tesis por su ID cuando las uses (ejemplo: "Según la Tesis 123...")
3. Si ninguna tesis responde la pregunta, indícalo claramente
4. No inventes información que no esté en las tesis
5. Si hay información relevante en múltiples tesis, compara y contrasta
"""

        # Build context section
        context_text = "TESIS DISPONIBLES:\n\n"
        for i, ctx in enumerate(context, 1):
            materias_str = ", ".join(ctx.materias) if ctx.materias else "N/A"
            text_type = "Texto completo" if ctx.is_full_text else "Fragmento relevante"

            context_text += f"--- TESIS {i} (ID: {ctx.id_tesis}) ---\n"
            context_text += f"Materias: {materias_str}\n"
            context_text += f"Año: {ctx.anio}\n"
            context_text += f"Rubro: {ctx.rubro}\n"
            context_text += f"Tipo: {text_type}\n"
            context_text += f"Similitud: {ctx.similarity:.3f}\n\n"
            context_text += f"Contenido:\n{ctx.texto}\n\n"

        # User query
        user_message = f"{context_text}\n\nPREGUNTA DEL USUARIO:\n{query}\n\nRespuesta:"

        return system_prompt + "\n\n" + user_message

    def _call_llm(self, prompt: str) -> str:
        """Call Gemini LLM"""
        try:
            response = self.llm_model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,  # Lower temperature for more factual responses
                    max_output_tokens=2000,
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Error calling Gemini LLM: {e}")
            return f"Error al generar respuesta: {str(e)}"


def format_response(result: Dict) -> str:
    """
    Format RAG response for display

    Args:
        result: Output from RAGPipeline.ask()

    Returns:
        Formatted string for display
    """
    output = "=" * 80 + "\n"
    output += "RESPUESTA\n"
    output += "=" * 80 + "\n\n"

    output += result['answer'] + "\n\n"

    if result['sources']:
        output += "=" * 80 + "\n"
        output += f"FUENTES CONSULTADAS ({len(result['sources'])} tesis)\n"
        output += "=" * 80 + "\n\n"

        for ctx in result['context']:
            output += f"📄 Tesis ID: {ctx.id_tesis}\n"
            output += f"   Rubro: {ctx.rubro[:80]}...\n" if len(ctx.rubro) > 80 else f"   Rubro: {ctx.rubro}\n"
            output += f"   Materias: {', '.join(ctx.materias)}\n"
            output += f"   Año: {ctx.anio}\n"
            output += f"   Similitud: {ctx.similarity:.3f}\n"
            output += f"   Tipo: {'Texto completo' if ctx.is_full_text else 'Fragmento'}\n"
            output += "\n"

    output += "=" * 80 + "\n"

    return output
