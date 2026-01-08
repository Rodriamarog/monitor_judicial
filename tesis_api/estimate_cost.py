#!/usr/bin/env python3
"""
Cost Estimation Script for Embedding Full Tesis Corpus
Calculates exact OpenAI API cost using tiktoken for accurate token counting
"""
import os
import logging
from collections import defaultdict
from typing import Dict, List
from tqdm import tqdm
from dotenv import load_dotenv
import tiktoken

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


class CostEstimator:
    """Estimates embedding cost using tiktoken for accurate token counting"""

    def __init__(self, db_manager: DatabaseManager, text_processor: LegalTextProcessor):
        """
        Initialize cost estimator

        Args:
            db_manager: Database manager instance
            text_processor: Text processor for chunking
        """
        self.db = db_manager
        self.processor = text_processor

        # Initialize tiktoken with cl100k_base encoding (used by text-embedding-3-small)
        self.encoding = tiktoken.get_encoding("cl100k_base")

        # OpenAI pricing (as of 2025)
        self.price_per_million_tokens = 0.020  # $0.020 per 1M tokens

        logger.info("Initialized CostEstimator with cl100k_base encoding")

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text using tiktoken

        Args:
            text: Text to count tokens in

        Returns:
            Number of tokens
        """
        return len(self.encoding.encode(text))

    def estimate_document(self, doc: Dict) -> Dict:
        """
        Estimate cost for a single document

        Args:
            doc: Document dictionary

        Returns:
            Dict with chunks, tokens, and breakdown by chunk type
        """
        # Prepare chunks using same logic as embedding pipeline
        chunks_with_types = self.processor.prepare_document_for_embedding(doc)

        if not chunks_with_types:
            return {
                'chunks': 0,
                'total_tokens': 0,
                'tokens_by_type': {}
            }

        tokens_by_type = defaultdict(int)
        total_tokens = 0

        for chunk_text, chunk_type in chunks_with_types:
            tokens = self.count_tokens(chunk_text)
            tokens_by_type[chunk_type] += tokens
            total_tokens += tokens

        return {
            'chunks': len(chunks_with_types),
            'total_tokens': total_tokens,
            'tokens_by_type': dict(tokens_by_type)
        }

    def estimate_all(self, batch_size: int = 1000) -> Dict:
        """
        Estimate cost for all tesis in database

        Args:
            batch_size: Number of tesis to process at once

        Returns:
            Comprehensive cost estimation report
        """
        logger.info("Starting cost estimation for all tesis...")

        # Get all tesis IDs
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id_tesis, anio, materias, tipo_tesis FROM tesis_documents ORDER BY id_tesis")
                all_tesis_metadata = cur.fetchall()

        total_tesis = len(all_tesis_metadata)
        logger.info(f"Found {total_tesis:,} tesis to estimate")

        # Initialize accumulators
        total_chunks = 0
        total_tokens = 0
        tokens_by_type = defaultdict(int)
        tokens_by_year = defaultdict(int)
        tokens_by_materia = defaultdict(int)
        tokens_by_tipo = defaultdict(int)

        tesis_by_year = defaultdict(int)
        tesis_by_materia = defaultdict(int)
        tesis_by_tipo = defaultdict(int)

        # Process in batches
        for i in tqdm(range(0, total_tesis, batch_size), desc="Estimating cost"):
            batch_metadata = all_tesis_metadata[i:i+batch_size]
            batch_ids = [meta[0] for meta in batch_metadata]

            # Fetch full tesis data for this batch
            with self.db.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id_tesis, rubro, texto, anio, materias, tipo_tesis
                        FROM tesis_documents
                        WHERE id_tesis = ANY(%s)
                    """, (batch_ids,))

                    batch_docs = []
                    for row in cur.fetchall():
                        batch_docs.append({
                            'idTesis': row[0],
                            'rubro': row[1] or '',
                            'texto': row[2] or '',
                            'anio': row[3],
                            'materias': row[4] or [],
                            'tipoTesis': row[5] or ''
                        })

            # Estimate each document
            for doc in batch_docs:
                estimate = self.estimate_document(doc)

                total_chunks += estimate['chunks']
                total_tokens += estimate['total_tokens']

                # Track by chunk type
                for chunk_type, tokens in estimate['tokens_by_type'].items():
                    tokens_by_type[chunk_type] += tokens

                # Track by year
                if doc['anio']:
                    tokens_by_year[doc['anio']] += estimate['total_tokens']
                    tesis_by_year[doc['anio']] += 1

                # Track by materias
                if doc['materias']:
                    for materia in doc['materias']:
                        if materia:  # Skip empty strings
                            tokens_by_materia[materia] += estimate['total_tokens']
                            tesis_by_materia[materia] += 1

                # Track by tipo
                if doc['tipoTesis']:
                    tokens_by_tipo[doc['tipoTesis']] += estimate['total_tokens']
                    tesis_by_tipo[doc['tipoTesis']] += 1

        # Calculate costs
        total_cost = (total_tokens / 1_000_000) * self.price_per_million_tokens

        return {
            'total_tesis': total_tesis,
            'total_chunks': total_chunks,
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'avg_chunks_per_tesis': total_chunks / total_tesis if total_tesis > 0 else 0,
            'avg_tokens_per_tesis': total_tokens / total_tesis if total_tesis > 0 else 0,
            'tokens_by_type': dict(tokens_by_type),
            'tokens_by_year': dict(sorted(tokens_by_year.items(), reverse=True)),
            'tokens_by_materia': dict(sorted(tokens_by_materia.items(), key=lambda x: x[1], reverse=True)),
            'tokens_by_tipo': dict(sorted(tokens_by_tipo.items(), key=lambda x: x[1], reverse=True)),
            'tesis_by_year': dict(sorted(tesis_by_year.items(), reverse=True)),
            'tesis_by_materia': dict(sorted(tesis_by_materia.items(), key=lambda x: x[1], reverse=True)),
            'tesis_by_tipo': dict(sorted(tesis_by_tipo.items(), key=lambda x: x[1], reverse=True))
        }


def print_report(estimate: Dict):
    """Print formatted cost estimation report"""
    print("\n" + "="*80)
    print("COST ESTIMATION REPORT")
    print("="*80)
    print(f"\nData Source: PostgreSQL Database")
    print(f"Total Tesis: {estimate['total_tesis']:,}")
    print(f"Total Chunks: {estimate['total_chunks']:,} (avg {estimate['avg_chunks_per_tesis']:.1f} per tesis)")
    print(f"Total Tokens: {estimate['total_tokens']:,} (avg {estimate['avg_tokens_per_tesis']:.0f} per tesis)")

    print("\n" + "-"*80)
    print("COST BREAKDOWN")
    print("-"*80)
    print(f"Estimated Cost: ${estimate['total_cost']:.2f} USD")
    print(f"Pricing: $0.020 per 1M tokens (text-embedding-3-small)")

    # By chunk type
    print("\nBy Processing Stage:")
    for chunk_type, tokens in sorted(estimate['tokens_by_type'].items(), key=lambda x: x[1], reverse=True):
        cost = (tokens / 1_000_000) * 0.020
        pct = (tokens / estimate['total_tokens']) * 100
        print(f"  {chunk_type:15s}: {tokens:>12,} tokens ({pct:>5.1f}%) → ${cost:>6.2f}")

    # By year (top 10)
    print("\nBy Year (Top 10):")
    for i, (year, tokens) in enumerate(list(estimate['tokens_by_year'].items())[:10]):
        cost = (tokens / 1_000_000) * 0.020
        tesis_count = estimate['tesis_by_year'][year]
        print(f"  {year}: {tesis_count:>6,} tesis → {tokens:>12,} tokens → ${cost:>6.2f}")

    # By materia (top 10)
    print("\nBy Materia (Top 10):")
    for i, (materia, tokens) in enumerate(list(estimate['tokens_by_materia'].items())[:10]):
        cost = (tokens / 1_000_000) * 0.020
        tesis_count = estimate['tesis_by_materia'][materia]
        print(f"  {materia:25s}: {tesis_count:>6,} tesis → {tokens:>12,} tokens → ${cost:>6.2f}")

    # By tipo
    print("\nBy Tipo de Tesis:")
    for tipo, tokens in estimate['tokens_by_tipo'].items():
        cost = (tokens / 1_000_000) * 0.020
        tesis_count = estimate['tesis_by_tipo'][tipo]
        print(f"  {tipo:25s}: {tesis_count:>6,} tesis → {tokens:>12,} tokens → ${cost:>6.2f}")

    print("\n" + "-"*80)
    print("RECOMMENDATION")
    print("-"*80)
    print(f"With current OpenAI account balance: $5.00 (assumed)")
    print(f"Required for embedding: ${estimate['total_cost']:.2f}")
    print(f"Remaining after embedding: ${5.00 - estimate['total_cost']:.2f}")

    if estimate['total_cost'] <= 5.00:
        print("\nSTATUS: ✓ Sufficient funds available")
    else:
        shortfall = estimate['total_cost'] - 5.00
        print(f"\nSTATUS: ⚠ Need to add ${shortfall:.2f} more credits")

    print("="*80 + "\n")


def main():
    """Main execution"""
    print("="*80)
    print("TESIS EMBEDDING COST ESTIMATION")
    print("Using OpenAI text-embedding-3-small with tiktoken")
    print("="*80 + "\n")

    # Load configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'dbname': os.getenv('DB_NAME', 'MJ_TesisYJurisprudencias'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'admin')
    }

    max_chunk_size = int(os.getenv('MAX_CHUNK_SIZE', 512))
    chunk_overlap = int(os.getenv('CHUNK_OVERLAP', 50))

    # Initialize components
    logger.info("Initializing database connection...")
    db = DatabaseManager(**db_config)

    if not db.test_connection():
        logger.error("Failed to connect to database. Exiting.")
        return

    logger.info("Initializing text processor...")
    text_processor = LegalTextProcessor(max_chunk_size=max_chunk_size, chunk_overlap=chunk_overlap)

    logger.info("Initializing cost estimator...")
    estimator = CostEstimator(db, text_processor)

    # Run estimation
    print("\nThis will process all tesis to calculate exact cost.")
    print("It may take several minutes depending on database size.\n")

    estimate = estimator.estimate_all(batch_size=1000)

    # Print report
    print_report(estimate)

    print("Cost estimation complete!")
    print("Next step: Run 'python embed_all_tesis.py' to start embedding pipeline")


if __name__ == "__main__":
    main()
