#!/usr/bin/env python3
"""
RAG Query Interface - Ask questions with LLM-powered responses
"""
import os
import sys
import logging
from dotenv import load_dotenv

from db_utils import DatabaseManager
from vectorize_tesis import OpenAIEmbeddingModel
from rag_pipeline import RAGPipeline, format_response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def interactive_mode(rag_pipeline: RAGPipeline, db: DatabaseManager):
    """Interactive RAG query mode with materia selection"""
    print("\n" + "=" * 80)
    print("RAG QUERY SYSTEM - Legal Thesis Q&A")
    print("=" * 80)
    print("\nEste sistema usa IA para responder tus preguntas sobre tesis jurisprudenciales.")
    print("\nComandos:")
    print("  - Escribe tu pregunta y presiona Enter")
    print("  - 'materias' para ver materias disponibles")
    print("  - 'filtrar <materia>' para filtrar por materia (ej: 'filtrar Constitucional')")
    print("  - 'limpiar' para quitar filtros")
    print("  - 'quit' para salir")
    print("=" * 80 + "\n")

    # Get available materias
    materias_list = db.get_all_materias()
    current_filter = None

    while True:
        try:
            # Show current filter
            filter_display = f" [Filtro: {', '.join(current_filter)}]" if current_filter else ""
            query = input(f"Pregunta{filter_display}: ").strip()

            if not query:
                continue

            if query.lower() in ['quit', 'exit', 'q', 'salir']:
                print("¡Hasta luego!")
                break

            if query.lower() == 'materias':
                print("\nMaterias disponibles:")
                for m in materias_list:
                    print(f"  - {m['materia']} ({m['count']} tesis)")
                print()
                continue

            if query.lower().startswith('filtrar '):
                materia = query[8:].strip()
                # Case-insensitive match
                matched = [m['materia'] for m in materias_list if m['materia'].lower() == materia.lower()]
                if matched:
                    current_filter = matched
                    print(f"✓ Filtrando por: {matched[0]}\n")
                else:
                    print(f"✗ Materia '{materia}' no encontrada. Usa 'materias' para ver opciones.\n")
                continue

            if query.lower() == 'limpiar':
                current_filter = None
                print("✓ Filtros eliminados\n")
                continue

            # Perform RAG query
            print("\n🔍 Buscando tesis relevantes...")
            result = rag_pipeline.ask(
                query=query,
                materias=current_filter,
                top_k=10,
                threshold=0.2
            )

            # Display formatted result
            print(format_response(result))

        except KeyboardInterrupt:
            print("\n\n¡Hasta luego!")
            break
        except Exception as e:
            logger.error(f"Error: {e}")
            print(f"\n✗ Error: {e}\n")


def single_query_mode(rag_pipeline: RAGPipeline, query: str, materias: list = None):
    """Single query mode"""
    print(f"\n🔍 Consultando: '{query}'")
    if materias:
        print(f"   Filtros: {', '.join(materias)}")

    result = rag_pipeline.ask(
        query=query,
        materias=materias,
        top_k=10,
        threshold=0.2
    )

    print(format_response(result))


def main():
    """Main execution"""
    # Load configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'dbname': os.getenv('DB_NAME', 'MJ_TesisYJurisprudencias'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'admin')
    }

    model_name = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')
    llm_model = os.getenv('LLM_MODEL', 'gemini-2.5-flash')
    openai_api_key = os.getenv('OPENAI_API_KEY')
    gemini_api_key = os.getenv('GEMINI_API_KEY')

    if not openai_api_key:
        logger.error("OPENAI_API_KEY not found in environment variables. Exiting.")
        print("\n✗ Error: OPENAI_API_KEY no configurada")
        print("  Agrega tu API key en el archivo .env")
        return

    if not gemini_api_key:
        logger.error("GEMINI_API_KEY not found in environment variables. Exiting.")
        print("\n✗ Error: GEMINI_API_KEY no configurada")
        print("  Agrega tu API key de Google Gemini en el archivo .env")
        return

    # Initialize components
    logger.info("Initializing database connection...")
    db = DatabaseManager(**db_config)

    if not db.test_connection():
        logger.error("Failed to connect to database. Exiting.")
        return

    # Check if data exists
    doc_count = db.get_document_count()
    emb_count = db.get_embedding_count()

    if doc_count == 0 or emb_count == 0:
        logger.error("No data found in database. Please run vectorize_tesis.py first.")
        return

    logger.info(f"Found {doc_count} documents with {emb_count} embeddings")

    logger.info("Initializing embedding model...")
    embedding_model = OpenAIEmbeddingModel(model_name=model_name, api_key=openai_api_key)

    logger.info(f"Initializing RAG pipeline (LLM: {llm_model})...")
    rag_pipeline = RAGPipeline(
        db_manager=db,
        embedding_model=embedding_model,
        llm_model=llm_model,
        api_key=gemini_api_key  # Gemini API key for LLM
    )

    print(f"\n✓ Sistema RAG inicializado correctamente")
    print(f"  - Base de datos: {doc_count} tesis, {emb_count} embeddings")
    print(f"  - Modelo LLM: {llm_model}")

    # Check if query provided as argument
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
        single_query_mode(rag_pipeline, query)
    else:
        # Interactive mode
        interactive_mode(rag_pipeline, db)


if __name__ == "__main__":
    main()
