#!/usr/bin/env python3
"""
Query interface for semantic search of legal thesis
"""
import os
import sys
import logging
from typing import List, Dict
from dotenv import load_dotenv

from db_utils import DatabaseManager
from vectorize_tesis import OpenAIEmbeddingModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class TesisSearchEngine:
    """Semantic search engine for legal thesis"""

    def __init__(self, db_manager: DatabaseManager, embedding_model: OpenAIEmbeddingModel):
        self.db = db_manager
        self.model = embedding_model
    
    def search(self, query: str, top_k: int = 5, threshold: float = 0.3) -> List[Dict]:
        """
        Search for relevant thesis based on query
        
        Args:
            query: Natural language query
            top_k: Number of results to return
            threshold: Minimum similarity threshold (0-1)
        
        Returns:
            List of matching results
        """
        # Generate query embedding
        logger.info(f"Generating embedding for query: '{query}'")
        query_embedding = self.model.encode([query], show_progress=False)[0]
        
        # Search database
        logger.info(f"Searching database (top_k={top_k}, threshold={threshold})...")
        results = self.db.search_similar(
            query_embedding.tolist(),
            limit=top_k,
            threshold=threshold
        )
        
        return results
    
    def print_results(self, results: List[Dict], query: str):
        """Pretty print search results"""
        print("\n" + "="*80)
        print(f"SEARCH RESULTS FOR: '{query}'")
        print("="*80 + "\n")
        
        if not results:
            print("No results found. Try lowering the similarity threshold or rephrasing your query.")
            return
        
        for i, result in enumerate(results, 1):
            print(f"[{i}] Similarity: {result['similarity']:.3f}")
            print(f"    ID: {result['id_tesis']}")
            print(f"    Tipo: {result['tipo_tesis']}")
            print(f"    Año: {result['anio']}")
            print(f"    Materias: {', '.join(result['materias']) if result['materias'] else 'N/A'}")
            print(f"    Rubro: {result['rubro'][:100]}...")
            print(f"    Chunk Type: {result['chunk_type']}")
            print(f"    Texto:")
            # Print first 300 characters of chunk
            chunk_preview = result['chunk_text'][:300]
            print(f"    {chunk_preview}...")
            print()


def interactive_mode(search_engine: TesisSearchEngine):
    """Interactive query mode"""
    print("\n" + "="*80)
    print("INTERACTIVE SEARCH MODE")
    print("="*80)
    print("Enter your queries (or 'quit' to exit)")
    print("Commands:")
    print("  - Type your query and press Enter")
    print("  - 'quit' or 'exit' to quit")
    print("  - 'help' for example queries")
    print("="*80 + "\n")
    
    while True:
        try:
            query = input("Query: ").strip()
            
            if not query:
                continue
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            if query.lower() == 'help':
                print("\nExample queries:")
                print("  - ¿Qué dice sobre el amparo indirecto?")
                print("  - Derechos humanos y dignidad")
                print("  - Pensión jubilatoria")
                print("  - Suspensión del acto reclamado")
                print("  - Violencia familiar")
                print()
                continue
            
            # Perform search
            results = search_engine.search(query, top_k=5, threshold=0.2)
            search_engine.print_results(results, query)
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            logger.error(f"Error: {e}")


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
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not openai_api_key:
        logger.error("OPENAI_API_KEY not found in environment variables. Exiting.")
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

    logger.info("Initializing OpenAI embedding model...")
    embedding_model = OpenAIEmbeddingModel(model_name=model_name, api_key=openai_api_key)

    # Create search engine
    search_engine = TesisSearchEngine(db, embedding_model)
    
    # Check if query provided as argument
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
        results = search_engine.search(query, top_k=5, threshold=0.2)
        search_engine.print_results(results, query)
    else:
        # Interactive mode
        interactive_mode(search_engine)


if __name__ == "__main__":
    main()
