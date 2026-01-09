#!/usr/bin/env python3
"""
Vectorize legal thesis documents using OpenAI text-embedding-3-small
"""
import json
import logging
import os
from pathlib import Path
from typing import List, Dict
from tqdm import tqdm
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

from db_utils import DatabaseManager
from text_processing import LegalTextProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class OpenAIEmbeddingModel:
    """Wrapper for OpenAI embedding models"""

    def __init__(self, model_name: str = "text-embedding-3-small", api_key: str = None):
        """
        Initialize the OpenAI embedding model

        Args:
            model_name: OpenAI model name (default: text-embedding-3-small)
            api_key: OpenAI API key (if None, reads from OPENAI_API_KEY env var)
        """
        self.model_name = model_name
        self.client = OpenAI(api_key=api_key)

        logger.info(f"Initialized OpenAI embedding model: {model_name}")
        logger.info(f"Dimensions: 1536")

    def encode(self, texts: List[str], batch_size: int = 100, show_progress: bool = True) -> np.ndarray:
        """
        Encode texts to embeddings using OpenAI API

        Args:
            texts: List of texts to encode
            batch_size: Batch size for API requests (OpenAI supports up to 2048 texts per request)
            show_progress: Show progress bar

        Returns:
            numpy array of embeddings
        """
        all_embeddings = []

        iterator = range(0, len(texts), batch_size)
        if show_progress:
            iterator = tqdm(iterator, desc="Generating embeddings")

        for i in iterator:
            batch_texts = texts[i:i + batch_size]

            # Call OpenAI API
            response = self.client.embeddings.create(
                model=self.model_name,
                input=batch_texts,
                dimensions=256  # Reduced dimensions for memory efficiency
            )

            # Extract embeddings
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        return np.array(all_embeddings)


class TesisVectorizer:
    """Main vectorization pipeline"""

    def __init__(self, db_manager: DatabaseManager, embedding_model: OpenAIEmbeddingModel, text_processor: LegalTextProcessor):
        self.db = db_manager
        self.model = embedding_model
        self.processor = text_processor
    
    def vectorize_document(self, doc: Dict) -> int:
        """
        Vectorize a single thesis document
        
        Returns:
            Number of chunks created
        """
        id_tesis = doc['idTesis']
        
        # Insert document metadata
        if not self.db.insert_document(doc):
            logger.error(f"Failed to insert document {id_tesis}")
            return 0
        
        # Prepare chunks
        chunks_with_types = self.processor.prepare_document_for_embedding(doc)
        
        if not chunks_with_types:
            logger.warning(f"No chunks generated for document {id_tesis}")
            return 0
        
        # Generate embeddings
        chunk_texts = [chunk[0] for chunk in chunks_with_types]
        chunk_types = [chunk[1] for chunk in chunks_with_types]
        
        embeddings = self.model.encode(chunk_texts, show_progress=False)
        
        # Prepare data for insertion
        embedding_data = []
        for idx, (embedding, chunk_text, chunk_type) in enumerate(zip(embeddings, chunk_texts, chunk_types)):
            embedding_data.append((
                id_tesis,
                idx,
                chunk_text,
                chunk_type,
                embedding.tolist()
            ))
        
        # Insert embeddings
        inserted = self.db.insert_embeddings_batch(embedding_data)
        
        return inserted
    
    def vectorize_batch(self, documents: List[Dict]) -> Dict[str, int]:
        """
        Vectorize a batch of documents
        
        Returns:
            Statistics dictionary
        """
        stats = {
            'total_docs': len(documents),
            'successful': 0,
            'failed': 0,
            'total_chunks': 0
        }
        
        for doc in tqdm(documents, desc="Vectorizing documents"):
            try:
                chunks_created = self.vectorize_document(doc)
                if chunks_created > 0:
                    stats['successful'] += 1
                    stats['total_chunks'] += chunks_created
                else:
                    stats['failed'] += 1
            except Exception as e:
                logger.error(f"Error vectorizing document {doc.get('idTesis')}: {e}")
                stats['failed'] += 1
        
        return stats


def main():
    """Main execution"""
    print("="*80)
    print("TESIS VECTORIZATION PIPELINE")
    print("Using OpenAI text-embedding-3-small (1536 dimensions)")
    print("="*80 + "\n")

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
    batch_size = int(os.getenv('BATCH_SIZE', 100))
    max_chunk_size = int(os.getenv('MAX_CHUNK_SIZE', 512))
    chunk_overlap = int(os.getenv('CHUNK_OVERLAP', 50))

    if not openai_api_key:
        logger.error("OPENAI_API_KEY not found in environment variables. Exiting.")
        return

    # Initialize components
    logger.info("Step 1: Initializing database connection...")
    db = DatabaseManager(**db_config)

    if not db.test_connection():
        logger.error("Failed to connect to database. Exiting.")
        return

    if not db.check_pgvector():
        logger.error("pgvector extension not found. Please run setup_database.sql first.")
        return

    logger.info("\nStep 2: Initializing OpenAI embedding model...")
    embedding_model = OpenAIEmbeddingModel(model_name=model_name, api_key=openai_api_key)

    logger.info("\nStep 3: Initializing text processor...")
    text_processor = LegalTextProcessor(max_chunk_size=max_chunk_size, chunk_overlap=chunk_overlap)
    
    # Load data
    logger.info("\nStep 4: Loading thesis data...")
    data_file = Path("data/sample/tesis_sample_100.json")
    
    if not data_file.exists():
        logger.error(f"Data file not found: {data_file}")
        return
    
    with open(data_file, 'r', encoding='utf-8') as f:
        documents = json.load(f)
    
    logger.info(f"Loaded {len(documents)} documents")
    
    # Vectorize
    logger.info("\nStep 5: Vectorizing documents...")
    vectorizer = TesisVectorizer(db, embedding_model, text_processor)
    stats = vectorizer.vectorize_batch(documents)
    
    # Print summary
    print("\n" + "="*80)
    print("VECTORIZATION SUMMARY")
    print("="*80)
    print(f"Total documents: {stats['total_docs']}")
    print(f"Successful: {stats['successful']}")
    print(f"Failed: {stats['failed']}")
    print(f"Total chunks created: {stats['total_chunks']}")
    print(f"Average chunks per document: {stats['total_chunks'] / stats['successful']:.1f}")
    
    # Database stats
    doc_count = db.get_document_count()
    emb_count = db.get_embedding_count()
    print(f"\nDatabase statistics:")
    print(f"Documents in DB: {doc_count}")
    print(f"Embeddings in DB: {emb_count}")
    print("="*80 + "\n")
    
    print("Vectorization complete!")
    print("Next step: Run query_tesis.py to test semantic search")


if __name__ == "__main__":
    main()
