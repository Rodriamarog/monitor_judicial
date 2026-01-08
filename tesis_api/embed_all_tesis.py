#!/usr/bin/env python3
"""
Full Corpus Embedding Pipeline
Embeds all tesis documents with checkpoint/retry/resume capabilities
"""
import os
import sys
import logging
import time
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
        logging.FileHandler(f"embedding_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class ProgressTracker:
    """Track progress and calculate ETA"""

    def __init__(self, total: int):
        """
        Initialize progress tracker

        Args:
            total: Total number of items to process
        """
        self.total = total
        self.processed = 0
        self.start_time = time.time()

    def update(self, processed: int):
        """
        Update progress

        Args:
            processed: Number of items processed so far
        """
        self.processed = processed

        elapsed = time.time() - self.start_time
        rate = self.processed / elapsed if elapsed > 0 else 0
        remaining = self.total - self.processed
        eta_seconds = remaining / rate if rate > 0 else 0

        pct = (self.processed / self.total * 100) if self.total > 0 else 0

        print(f"\rProgress: {self.processed:,}/{self.total:,} "
              f"({pct:.1f}%) | "
              f"Rate: {rate:.1f} tesis/sec | "
              f"ETA: {self.format_time(eta_seconds)}",
              end='', flush=True)

    @staticmethod
    def format_time(seconds: float) -> str:
        """Format seconds to human readable HH:MM:SS"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"


class EmbeddingPipeline:
    """Main embedding pipeline orchestrator"""

    def __init__(self,
                 db: DatabaseManager,
                 text_processor: LegalTextProcessor,
                 checkpoint: CheckpointManager,
                 retry_handler: RetryHandler,
                 model_name: str = "text-embedding-3-small",
                 api_key: str = None):
        """
        Initialize embedding pipeline

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

        logger.info(f"Initialized pipeline with model: {model_name}")

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

    def process_batch(self, tesis_ids: List[int]) -> Dict:
        """
        Process a batch of tesis

        Args:
            tesis_ids: List of tesis IDs to process

        Returns:
            Batch statistics
        """
        stats = {'successful': 0, 'failed': 0, 'chunks': 0, 'tokens': 0}

        # Fetch tesis data
        tesis_docs = self.db.fetch_tesis_batch(tesis_ids)

        for doc in tqdm(tesis_docs, desc="Processing batch", leave=False):
            try:
                result = self.process_single_tesis(doc)

                self.checkpoint.mark_processed(
                    doc['idTesis'],
                    result['chunks'],
                    result['tokens']
                )

                stats['successful'] += 1
                stats['chunks'] += result['chunks']
                stats['tokens'] += result['tokens']

                # Save checkpoint every 100 tesis
                if stats['successful'] % 100 == 0:
                    self.checkpoint.save_checkpoint()

            except Exception as e:
                logger.error(f"Failed to process tesis {doc['idTesis']}: {e}")
                self.checkpoint.mark_failed(doc['idTesis'], str(e))
                stats['failed'] += 1

        # Final checkpoint save for batch
        self.checkpoint.save_checkpoint()
        return stats

    def run(self, limit: int = None):
        """
        Run the full embedding pipeline

        Args:
            limit: Optional limit on number of tesis to process (for testing)
        """
        logger.info("Starting embedding pipeline...")

        # Get all tesis IDs
        all_tesis_ids = self.db.get_all_tesis_ids()

        if limit:
            all_tesis_ids = all_tesis_ids[:limit]
            logger.info(f"Limited to {limit} tesis for testing")

        # Filter out already processed
        processed_set = set(self.checkpoint.state['processed_tesis'])
        unprocessed_ids = [tid for tid in all_tesis_ids if tid not in processed_set]

        total = len(unprocessed_ids)
        logger.info(f"Total tesis to process: {total:,}")
        logger.info(f"Already processed: {len(processed_set):,}")

        if total == 0:
            logger.info("No tesis to process!")
            return

        # Initialize progress tracker
        progress = ProgressTracker(total)

        # Process in batches of 1000
        batch_size = 1000
        processed_count = 0

        print()  # Newline before progress bar

        for i in range(0, total, batch_size):
            batch_ids = unprocessed_ids[i:i+batch_size]

            batch_stats = self.process_batch(batch_ids)

            processed_count += batch_stats['successful'] + batch_stats['failed']
            progress.update(processed_count)

            logger.info(f"\nBatch {i//batch_size + 1}: "
                       f"Success={batch_stats['successful']}, "
                       f"Failed={batch_stats['failed']}, "
                       f"Chunks={batch_stats['chunks']}, "
                       f"Tokens={batch_stats['tokens']}")

        print()  # Newline after progress bar


def print_final_report(checkpoint: CheckpointManager, db: DatabaseManager):
    """Print final embedding report"""
    stats = checkpoint.get_stats()

    # Calculate duration
    if stats['start_time']:
        start = datetime.fromisoformat(stats['start_time'])
        end = datetime.now()
        duration = end - start
    else:
        duration = None

    print("\n" + "="*80)
    print("EMBEDDING PIPELINE COMPLETE")
    print("="*80)

    print("\nEXECUTION SUMMARY")
    print("-"*80)
    if duration:
        print(f"Start Time:     {stats['start_time']}")
        print(f"End Time:       {end.isoformat()}")
        print(f"Duration:       {str(duration).split('.')[0]}")  # Remove microseconds

    print("\nPROCESSING STATISTICS")
    print("-"*80)
    total_processed = stats['processed'] + checkpoint.get_failed_count()
    success_rate = (stats['processed'] / total_processed * 100) if total_processed > 0 else 0

    print(f"Successfully Embedded:  {stats['processed']:,} ({success_rate:.2f}%)")
    print(f"Failed:                 {checkpoint.get_failed_count():,}")
    print(f"Total Chunks Created:   {stats['total_chunks']:,}")
    avg_chunks = stats['total_chunks'] / stats['processed'] if stats['processed'] > 0 else 0
    print(f"Average Chunks/Tesis:   {avg_chunks:.1f}")

    print("\nTOKEN & COST ANALYSIS")
    print("-"*80)
    print(f"Total Tokens Used:      {stats['total_tokens']:,}")
    print(f"Actual Cost:            ${stats['actual_cost']:.2f}")

    # Performance metrics
    if duration:
        rate = stats['processed'] / duration.total_seconds() if duration.total_seconds() > 0 else 0
        print("\nPERFORMANCE METRICS")
        print("-"*80)
        print(f"Average Processing Rate: {rate:.1f} tesis/second")

    # Database statistics
    print("\nDATABASE STATISTICS")
    print("-"*80)
    emb_count = db.get_embedding_count()
    print(f"Embeddings in Database:  {emb_count:,}")

    # Failed tesis
    if checkpoint.get_failed_count() > 0:
        print("\nFAILED TESIS")
        print("-"*80)
        print(f"Total Failed: {checkpoint.get_failed_count()}")
        print("See checkpoint file for details: embedding_progress.json")
        print("To retry failed tesis: python retry_failed_tesis.py")

    print("\nNEXT STEPS")
    print("-"*80)
    print("1. Verify embeddings: python verify_embeddings.py")
    if checkpoint.get_failed_count() > 0:
        print("2. Retry failed tesis: python retry_failed_tesis.py")
    print(f"{2 if checkpoint.get_failed_count() == 0 else 3}. Test search: python query_tesis.py \"your query\"")
    print(f"{3 if checkpoint.get_failed_count() == 0 else 4}. Analyze results: python analyze_embeddings.py")

    print("="*80 + "\n")


def main():
    """Main execution"""
    parser = argparse.ArgumentParser(description="Embed all tesis documents")
    parser.add_argument('--limit', type=int, help='Limit number of tesis (for testing)')
    parser.add_argument('--fresh', action='store_true', help='Start fresh (truncate embeddings)')
    args = parser.parse_args()

    print("="*80)
    print("FULL CORPUS EMBEDDING PIPELINE")
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

    # Check for existing checkpoint or fresh start
    if args.fresh or (not checkpoint.state['processed_tesis']):
        print("\n" + "="*80)
        print("STARTING FRESH")
        print("="*80)
        print("\n⚠️  This will DELETE all existing embeddings!")
        confirm = input("\nType 'yes' to confirm: ").strip().lower()

        if confirm != 'yes':
            print("Cancelled.")
            return

        # Truncate embeddings
        print("\nTruncating embeddings table...")
        db.truncate_embeddings()
        checkpoint.clear()
        print("✓ Embeddings table truncated\n")

    else:
        # Found existing checkpoint
        print("\n" + "="*80)
        print("FOUND EXISTING CHECKPOINT")
        print("="*80)
        stats = checkpoint.get_stats()
        print(f"\nProcessed:  {stats['processed']:,} tesis")
        print(f"Failed:     {checkpoint.get_failed_count():,} tesis")
        print(f"Cost so far: ${stats['actual_cost']:.2f}")

        resume = input("\nResume from checkpoint? (y/n): ").strip().lower()
        if resume != 'y':
            print("\nTo start fresh, run with --fresh flag")
            print("Exiting...")
            return

        print("\n✓ Resuming from checkpoint\n")

    # Initialize pipeline
    pipeline = EmbeddingPipeline(
        db=db,
        text_processor=text_processor,
        checkpoint=checkpoint,
        retry_handler=retry_handler,
        model_name="text-embedding-3-small",
        api_key=openai_api_key
    )

    # Run pipeline
    try:
        pipeline.run(limit=args.limit)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Progress saved to checkpoint.")
        print("Run again to resume from where you left off.")
        return
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        print("\n\nPipeline failed. Check logs for details.")
        print("Progress saved to checkpoint. Run again to resume.")
        return

    # Print final report
    print_final_report(checkpoint, db)


if __name__ == "__main__":
    main()
