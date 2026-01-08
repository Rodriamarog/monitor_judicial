#!/usr/bin/env python3
"""
Retry Failed Tesis Embedding
Attempts to re-embed tesis that failed during initial pipeline run
"""
import os
import sys
import logging
import argparse
from datetime import datetime
from typing import List, Dict
from tqdm import tqdm
import tiktoken
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

from db_utils import DatabaseManager
from text_processing import LegalTextProcessor
from checkpoint_manager import CheckpointManager
from retry_handler import RetryHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"retry_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class RetryPipeline:
    """Pipeline for retrying failed tesis embeddings"""

    def __init__(self,
                 db: DatabaseManager,
                 text_processor: LegalTextProcessor,
                 checkpoint: CheckpointManager,
                 retry_handler: RetryHandler,
                 model_name: str = "text-embedding-3-small",
                 api_key: str = None):
        """
        Initialize retry pipeline

        Args:
            db: Database manager
            text_processor: Text processor for chunking
            checkpoint: Checkpoint manager
            retry_handler: Retry handler
            model_name: OpenAI model name
            api_key: OpenAI API key
        """
        self.db = db
        self.processor = text_processor
        self.checkpoint = checkpoint
        self.retry = retry_handler

        # Initialize OpenAI client
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name

        # Initialize tiktoken for accurate token counting
        self.encoding = tiktoken.get_encoding("cl100k_base")

        logger.info(f"Initialized retry pipeline with model: {model_name}")

    def count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken"""
        return len(self.encoding.encode(text))

    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings with retry logic

        Args:
            texts: List of texts to embed

        Returns:
            Array of embeddings
        """
        def _api_call():
            response = self.client.embeddings.create(
                model=self.model_name,
                input=texts
            )
            return np.array([item.embedding for item in response.data])

        return self.retry.execute_with_retry(_api_call)

    def process_single_tesis(self, doc: Dict) -> Dict:
        """
        Process a single tesis document

        Args:
            doc: Document dictionary

        Returns:
            Dict with processing stats
        """
        tesis_id = doc['idTesis']

        # Prepare chunks
        chunks_with_types = self.processor.prepare_document_for_embedding(doc)

        if not chunks_with_types:
            raise ValueError(f"No chunks generated for tesis {tesis_id}")

        # Extract texts and types
        chunk_texts = [chunk[0] for chunk in chunks_with_types]
        chunk_types = [chunk[1] for chunk in chunks_with_types]

        # Generate embeddings with retry
        embeddings = self.generate_embeddings(chunk_texts)

        # Count tokens accurately
        total_tokens = sum(self.count_tokens(text) for text in chunk_texts)

        # Prepare data for database insertion
        embedding_data = [
            (tesis_id, idx, text, ctype, emb.tolist())
            for idx, (emb, text, ctype) in enumerate(
                zip(embeddings, chunk_texts, chunk_types)
            )
        ]

        # Insert to database
        inserted = self.db.insert_embeddings_batch(embedding_data)

        return {
            'chunks': len(chunks_with_types),
            'tokens': total_tokens,
            'inserted': inserted
        }

    def retry_failed(self) -> Dict:
        """
        Retry all failed tesis from checkpoint

        Returns:
            Statistics dictionary
        """
        failed_list = self.checkpoint.state['failed_tesis']

        if not failed_list:
            logger.info("No failed tesis to retry")
            return {'total': 0, 'successful': 0, 'still_failed': 0}

        failed_ids = [item['id'] for item in failed_list]
        total = len(failed_ids)

        logger.info(f"Attempting to retry {total} failed tesis...")

        stats = {
            'total': total,
            'successful': 0,
            'still_failed': 0,
            'chunks': 0,
            'tokens': 0
        }

        # Create new failed list (we'll rebuild it with remaining failures)
        new_failed_list = []

        # Fetch all failed tesis data
        tesis_docs = self.db.fetch_tesis_batch(failed_ids)

        # Create mapping for easier lookup
        tesis_map = {doc['idTesis']: doc for doc in tesis_docs}

        print()  # Newline before progress bar

        for failed_item in tqdm(failed_list, desc="Retrying failed tesis"):
            tesis_id = failed_item['id']
            old_error = failed_item['error']

            # Check if tesis data exists
            if tesis_id not in tesis_map:
                logger.warning(f"Tesis {tesis_id} not found in database")
                new_failed_list.append({
                    'id': tesis_id,
                    'error': 'Tesis not found in database',
                    'timestamp': datetime.now().isoformat()
                })
                stats['still_failed'] += 1
                continue

            doc = tesis_map[tesis_id]

            try:
                result = self.process_single_tesis(doc)

                # Success! Move from failed to processed
                self.checkpoint.mark_processed(
                    tesis_id,
                    result['chunks'],
                    result['tokens']
                )

                stats['successful'] += 1
                stats['chunks'] += result['chunks']
                stats['tokens'] += result['tokens']

                logger.info(f"✓ Successfully retried tesis {tesis_id} "
                          f"(was: {old_error[:50]}...)")

            except Exception as e:
                # Still failed - keep in failed list
                new_error = str(e)
                new_failed_list.append({
                    'id': tesis_id,
                    'error': new_error,
                    'timestamp': datetime.now().isoformat(),
                    'original_error': old_error,
                    'retry_attempt': datetime.now().isoformat()
                })
                stats['still_failed'] += 1
                logger.error(f"✗ Failed to retry tesis {tesis_id}: {new_error}")

        print()  # Newline after progress bar

        # Update checkpoint with new failed list
        self.checkpoint.state['failed_tesis'] = new_failed_list
        self.checkpoint.save_checkpoint()

        return stats


def print_retry_report(stats: Dict, checkpoint: CheckpointManager):
    """Print retry report"""
    print("\n" + "="*80)
    print("RETRY PIPELINE COMPLETE")
    print("="*80)

    print("\nRETRY STATISTICS")
    print("-"*80)
    print(f"Total Failed Tesis:       {stats['total']:,}")
    print(f"Successfully Recovered:   {stats['successful']:,}")
    print(f"Still Failed:             {stats['still_failed']:,}")

    if stats['total'] > 0:
        success_rate = (stats['successful'] / stats['total'] * 100)
        print(f"Recovery Rate:            {success_rate:.2f}%")

    if stats['successful'] > 0:
        print("\nEMBEDDING STATISTICS")
        print("-"*80)
        print(f"Chunks Created:           {stats['chunks']:,}")
        print(f"Tokens Processed:         {stats['tokens']:,}")

        # Calculate additional cost
        additional_cost = (stats['tokens'] / 1_000_000) * 0.020
        print(f"Additional Cost:          ${additional_cost:.4f}")

        # Update overall stats
        overall = checkpoint.get_stats()
        print("\nOVERALL PIPELINE STATISTICS")
        print("-"*80)
        print(f"Total Processed:          {overall['processed']:,}")
        print(f"Total Failed:             {checkpoint.get_failed_count():,}")
        print(f"Total Cost:               ${overall['actual_cost']:.2f}")

    if stats['still_failed'] > 0:
        print("\nSTILL FAILED")
        print("-"*80)
        print(f"{stats['still_failed']} tesis still failed after retry")
        print("Details saved in checkpoint file: embedding_progress.json")
        print("\nYou can:")
        print("1. Investigate specific failures in the checkpoint file")
        print("2. Run this script again to retry once more")
        print("3. Manually process problematic tesis")

    print("\nNEXT STEPS")
    print("-"*80)
    if stats['still_failed'] == 0:
        print("✓ All tesis successfully embedded!")
        print("1. Verify embeddings: python verify_embeddings.py")
        print("2. Test search: python query_tesis.py \"your query\"")
        print("3. Analyze results: python analyze_embeddings.py")
    else:
        print("1. Review failed tesis in embedding_progress.json")
        print("2. Try running retry again: python retry_failed_tesis.py")
        print("3. Verify embeddings: python verify_embeddings.py")

    print("="*80 + "\n")


def main():
    """Main execution"""
    parser = argparse.ArgumentParser(description="Retry failed tesis embeddings")
    parser.add_argument('--max-attempts', type=int, default=1,
                       help='Maximum retry attempts per run (default: 1)')
    args = parser.parse_args()

    print("="*80)
    print("RETRY FAILED TESIS PIPELINE")
    print("Model: OpenAI text-embedding-3-small (1536 dimensions)")
    print("="*80 + "\n")

    # Load configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'dbname': os.getenv('DB_NAME', 'MJ_TesisYJurisprudencias'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'admin')
    }

    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return

    # Initialize components
    logger.info("Initializing components...")
    db = DatabaseManager(**db_config)

    if not db.test_connection():
        logger.error("Database connection failed")
        return

    if not db.check_pgvector():
        logger.error("pgvector extension not found. Run setup_database.sql first.")
        return

    text_processor = LegalTextProcessor(max_chunk_size=512, chunk_overlap=50)
    checkpoint = CheckpointManager("embedding_progress.json")
    retry_handler = RetryHandler(max_retries=5, base_delay=1.0)

    # Check for checkpoint file
    if not checkpoint.checkpoint_file.exists():
        print("\n⚠️  No checkpoint file found!")
        print("This script requires embedding_progress.json from embed_all_tesis.py")
        print("Please run the main embedding pipeline first.")
        return

    # Check for failed tesis
    failed_count = checkpoint.get_failed_count()
    if failed_count == 0:
        print("\n✓ No failed tesis found in checkpoint!")
        print("All tesis have been successfully embedded.")
        return

    # Show failed tesis summary
    print(f"\nFound {failed_count} failed tesis in checkpoint")
    print("\nSample of failures:")
    print("-"*80)
    for i, failed in enumerate(checkpoint.state['failed_tesis'][:5]):
        error_msg = failed['error'][:60] + "..." if len(failed['error']) > 60 else failed['error']
        print(f"  Tesis {failed['id']}: {error_msg}")
    if failed_count > 5:
        print(f"  ... and {failed_count - 5} more")

    # Confirm retry
    print("\n" + "="*80)
    confirm = input(f"\nRetry {failed_count} failed tesis? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Cancelled.")
        return

    # Initialize retry pipeline
    pipeline = RetryPipeline(
        db=db,
        text_processor=text_processor,
        checkpoint=checkpoint,
        retry_handler=retry_handler,
        model_name="text-embedding-3-small",
        api_key=openai_api_key
    )

    # Run retry
    try:
        stats = pipeline.retry_failed()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Progress saved to checkpoint.")
        return
    except Exception as e:
        logger.error(f"Retry pipeline failed: {e}")
        print("\n\nRetry pipeline failed. Check logs for details.")
        return

    # Print report
    print_retry_report(stats, checkpoint)


if __name__ == "__main__":
    main()
