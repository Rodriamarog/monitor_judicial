#!/usr/bin/env python3
"""
Backfill Embeddings for Tesis Missing Them
Finds tesis documents without embeddings and generates them
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from text_processing import LegalTextProcessor

# Load environment variables
load_dotenv()

# Create logs directory
Path('./logs').mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/backfill_embeddings_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Find and generate embeddings for tesis without them"""

    from supabase import create_client
    import openai

    # Initialize clients
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not all([supabase_url, supabase_key, openai_api_key]):
        logger.error("Missing required environment variables")
        sys.exit(1)

    supabase = create_client(supabase_url, supabase_key)
    openai_client = openai.OpenAI(api_key=openai_api_key)
    text_processor = LegalTextProcessor()

    logger.info("Starting embeddings backfill...")

    # Find tesis without embeddings
    logger.info("Finding tesis without embeddings...")
    result = supabase.rpc('find_tesis_without_embeddings').execute()

    if not result.data:
        logger.info("No tesis found without embeddings")
        return

    tesis_without_embeddings = result.data
    logger.info(f"Found {len(tesis_without_embeddings)} tesis without embeddings")

    # Process each tesis
    processed = 0
    failed = []
    total_embeddings = 0

    for item in tesis_without_embeddings:
        tesis_id = item['id_tesis']

        try:
            # Get full tesis document
            doc_result = supabase.table('tesis_documents').select('*').eq('id_tesis', tesis_id).single().execute()

            if not doc_result.data:
                logger.warning(f"Tesis {tesis_id} not found")
                continue

            tesis = doc_result.data

            # Generate embeddings
            chunks_with_types = text_processor.prepare_document_for_embedding(tesis)

            embeddings_to_insert = []

            for idx, (chunk_text, chunk_type) in enumerate(chunks_with_types):
                response = openai_client.embeddings.create(
                    model='text-embedding-3-small',
                    input=chunk_text,
                    dimensions=256
                )
                embedding = response.data[0].embedding
                embeddings_to_insert.append({
                    'id_tesis': tesis_id,
                    'chunk_index': idx,
                    'chunk_text': chunk_text,
                    'chunk_type': chunk_type,
                    'embedding': embedding,  # Full precision vector
                    'embedding_reduced': embedding  # Half precision halfvec (256 dims)
                })

            # Insert embeddings
            if embeddings_to_insert:
                supabase.table('tesis_embeddings').upsert(embeddings_to_insert).execute()
                total_embeddings += len(embeddings_to_insert)
                processed += 1

                if processed % 10 == 0:
                    logger.info(f"Progress: {processed}/{len(tesis_without_embeddings)} tesis, {total_embeddings} embeddings")

        except Exception as e:
            logger.error(f"Error processing tesis {tesis_id}: {e}")
            failed.append(tesis_id)

    logger.info(f"Backfill complete!")
    logger.info(f"Processed: {processed}/{len(tesis_without_embeddings)} tesis")
    logger.info(f"Total embeddings created: {total_embeddings}")

    if failed:
        logger.warning(f"Failed tesis IDs: {failed}")

if __name__ == '__main__':
    main()
