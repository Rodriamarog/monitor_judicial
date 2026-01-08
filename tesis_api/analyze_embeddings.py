#!/usr/bin/env python3
"""
Embedding Analysis Tool
Provides comprehensive statistics and analysis of embedded tesis corpus
"""
import os
import logging
from dotenv import load_dotenv
from collections import Counter
import json
from typing import Dict, List
import numpy as np

from db_utils import DatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class EmbeddingAnalyzer:
    """Analyzer for embedded tesis corpus"""

    def __init__(self, db: DatabaseManager):
        """
        Initialize analyzer

        Args:
            db: Database manager
        """
        self.db = db

    def get_corpus_overview(self) -> Dict:
        """Get high-level corpus statistics"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                # Total documents and embeddings
                cur.execute("SELECT COUNT(*) FROM tesis_documents")
                total_docs = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM tesis_embeddings")
                total_embeddings = cur.fetchone()[0]

                cur.execute("SELECT COUNT(DISTINCT id_tesis) FROM tesis_embeddings")
                docs_with_embeddings = cur.fetchone()[0]

                # Average chunks per tesis
                cur.execute("""
                    SELECT AVG(chunk_count)
                    FROM (
                        SELECT COUNT(*) as chunk_count
                        FROM tesis_embeddings
                        GROUP BY id_tesis
                    ) counts
                """)
                avg_chunks = cur.fetchone()[0] or 0

                return {
                    'total_documents': total_docs,
                    'documents_embedded': docs_with_embeddings,
                    'total_embeddings': total_embeddings,
                    'average_chunks_per_tesis': float(avg_chunks),
                    'coverage_percentage': (docs_with_embeddings / total_docs * 100) if total_docs > 0 else 0
                }

    def get_chunk_distribution(self) -> Dict:
        """Analyze chunk count distribution"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        id_tesis,
                        COUNT(*) as chunk_count
                    FROM tesis_embeddings
                    GROUP BY id_tesis
                """)

                chunk_counts = [row[1] for row in cur.fetchall()]

                if not chunk_counts:
                    return {}

                sorted_counts = sorted(chunk_counts)
                n = len(sorted_counts)

                return {
                    'min': min(chunk_counts),
                    'max': max(chunk_counts),
                    'mean': np.mean(chunk_counts),
                    'median': sorted_counts[n // 2],
                    'std_dev': np.std(chunk_counts),
                    'percentile_25': sorted_counts[n // 4],
                    'percentile_75': sorted_counts[3 * n // 4],
                    'percentile_90': sorted_counts[int(n * 0.9)],
                    'percentile_95': sorted_counts[int(n * 0.95)],
                    'percentile_99': sorted_counts[int(n * 0.99)]
                }

    def get_chunk_type_distribution(self) -> Dict:
        """Analyze distribution of chunk types"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT chunk_type, COUNT(*)
                    FROM tesis_embeddings
                    GROUP BY chunk_type
                    ORDER BY COUNT(*) DESC
                """)

                distribution = {}
                total = 0
                for chunk_type, count in cur.fetchall():
                    distribution[chunk_type or 'unknown'] = count
                    total += count

                # Add percentages
                result = {}
                for chunk_type, count in distribution.items():
                    result[chunk_type] = {
                        'count': count,
                        'percentage': (count / total * 100) if total > 0 else 0
                    }

                return result

    def get_year_analysis(self) -> List[Dict]:
        """Analyze embeddings by year"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        td.anio,
                        COUNT(DISTINCT td.id_tesis) as tesis_count,
                        COUNT(te.id) as embedding_count,
                        AVG(chunk_counts.chunk_count) as avg_chunks
                    FROM tesis_documents td
                    LEFT JOIN tesis_embeddings te ON td.id_tesis = te.id_tesis
                    LEFT JOIN (
                        SELECT id_tesis, COUNT(*) as chunk_count
                        FROM tesis_embeddings
                        GROUP BY id_tesis
                    ) chunk_counts ON td.id_tesis = chunk_counts.id_tesis
                    WHERE td.anio IS NOT NULL
                    GROUP BY td.anio
                    ORDER BY td.anio DESC
                    LIMIT 20
                """)

                results = []
                for row in cur.fetchall():
                    results.append({
                        'year': row[0],
                        'tesis_count': row[1],
                        'embedding_count': row[2] or 0,
                        'avg_chunks': float(row[3]) if row[3] else 0
                    })

                return results

    def get_materia_analysis(self) -> List[Dict]:
        """Analyze embeddings by materia"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        unnest(td.materias) as materia,
                        COUNT(DISTINCT td.id_tesis) as tesis_count,
                        COUNT(te.id) as embedding_count,
                        AVG(chunk_counts.chunk_count) as avg_chunks
                    FROM tesis_documents td
                    LEFT JOIN tesis_embeddings te ON td.id_tesis = te.id_tesis
                    LEFT JOIN (
                        SELECT id_tesis, COUNT(*) as chunk_count
                        FROM tesis_embeddings
                        GROUP BY id_tesis
                    ) chunk_counts ON td.id_tesis = chunk_counts.id_tesis
                    WHERE td.materias IS NOT NULL
                    GROUP BY unnest(td.materias)
                    ORDER BY tesis_count DESC
                    LIMIT 15
                """)

                results = []
                for row in cur.fetchall():
                    results.append({
                        'materia': row[0],
                        'tesis_count': row[1],
                        'embedding_count': row[2] or 0,
                        'avg_chunks': float(row[3]) if row[3] else 0
                    })

                return results

    def get_tipo_tesis_analysis(self) -> List[Dict]:
        """Analyze embeddings by tipo de tesis"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        td.tipo_tesis,
                        COUNT(DISTINCT td.id_tesis) as tesis_count,
                        COUNT(te.id) as embedding_count,
                        AVG(chunk_counts.chunk_count) as avg_chunks
                    FROM tesis_documents td
                    LEFT JOIN tesis_embeddings te ON td.id_tesis = te.id_tesis
                    LEFT JOIN (
                        SELECT id_tesis, COUNT(*) as chunk_count
                        FROM tesis_embeddings
                        GROUP BY id_tesis
                    ) chunk_counts ON td.id_tesis = chunk_counts.id_tesis
                    WHERE td.tipo_tesis IS NOT NULL
                    GROUP BY td.tipo_tesis
                    ORDER BY tesis_count DESC
                """)

                results = []
                for row in cur.fetchall():
                    results.append({
                        'tipo_tesis': row[0],
                        'tesis_count': row[1],
                        'embedding_count': row[2] or 0,
                        'avg_chunks': float(row[3]) if row[3] else 0
                    })

                return results

    def get_missing_embeddings(self) -> List[Dict]:
        """Get tesis without embeddings"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        td.id_tesis,
                        td.rubro,
                        td.anio,
                        td.tipo_tesis
                    FROM tesis_documents td
                    WHERE NOT EXISTS (
                        SELECT 1 FROM tesis_embeddings te
                        WHERE te.id_tesis = td.id_tesis
                    )
                    LIMIT 100
                """)

                results = []
                for row in cur.fetchall():
                    results.append({
                        'id_tesis': row[0],
                        'rubro': row[1],
                        'year': row[2],
                        'tipo_tesis': row[3]
                    })

                return results

    def get_storage_stats(self) -> Dict:
        """Get database storage statistics"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                # Table sizes
                cur.execute("""
                    SELECT
                        pg_size_pretty(pg_total_relation_size('tesis_documents')) as docs_size,
                        pg_size_pretty(pg_total_relation_size('tesis_embeddings')) as embeddings_size
                """)

                row = cur.fetchone()

                return {
                    'documents_table_size': row[0],
                    'embeddings_table_size': row[1]
                }


def print_analysis_report(analyzer: EmbeddingAnalyzer):
    """Print comprehensive analysis report"""
    print("="*80)
    print("EMBEDDING CORPUS ANALYSIS")
    print("="*80 + "\n")

    # Corpus Overview
    print("CORPUS OVERVIEW")
    print("-"*80)
    overview = analyzer.get_corpus_overview()
    print(f"Total Tesis Documents:        {overview['total_documents']:,}")
    print(f"Documents with Embeddings:    {overview['documents_embedded']:,}")
    print(f"Total Embedding Chunks:       {overview['total_embeddings']:,}")
    print(f"Average Chunks per Tesis:     {overview['average_chunks_per_tesis']:.2f}")
    print(f"Embedding Coverage:           {overview['coverage_percentage']:.2f}%")

    # Chunk Distribution
    print("\n" + "="*80)
    print("CHUNK DISTRIBUTION STATISTICS")
    print("-"*80)
    chunk_dist = analyzer.get_chunk_distribution()
    if chunk_dist:
        print(f"Minimum Chunks:               {chunk_dist['min']}")
        print(f"Maximum Chunks:               {chunk_dist['max']}")
        print(f"Mean Chunks:                  {chunk_dist['mean']:.2f}")
        print(f"Median Chunks:                {chunk_dist['median']}")
        print(f"Standard Deviation:           {chunk_dist['std_dev']:.2f}")
        print(f"\nPercentiles:")
        print(f"  25th percentile:            {chunk_dist['percentile_25']}")
        print(f"  75th percentile:            {chunk_dist['percentile_75']}")
        print(f"  90th percentile:            {chunk_dist['percentile_90']}")
        print(f"  95th percentile:            {chunk_dist['percentile_95']}")
        print(f"  99th percentile:            {chunk_dist['percentile_99']}")

    # Chunk Type Distribution
    print("\n" + "="*80)
    print("CHUNK TYPE DISTRIBUTION")
    print("-"*80)
    chunk_types = analyzer.get_chunk_type_distribution()
    for chunk_type, stats in sorted(chunk_types.items(), key=lambda x: x[1]['count'], reverse=True):
        print(f"{chunk_type:20} {stats['count']:,} chunks ({stats['percentage']:.2f}%)")

    # Year Analysis
    print("\n" + "="*80)
    print("ANALYSIS BY YEAR (Top 20 Recent Years)")
    print("-"*80)
    print(f"{'Year':<8} {'Tesis':>10} {'Embeddings':>12} {'Avg Chunks':>12}")
    print("-"*80)
    year_analysis = analyzer.get_year_analysis()
    for year_data in year_analysis:
        print(f"{year_data['year']:<8} {year_data['tesis_count']:>10,} "
              f"{year_data['embedding_count']:>12,} {year_data['avg_chunks']:>12.2f}")

    # Materia Analysis
    print("\n" + "="*80)
    print("ANALYSIS BY MATERIA (Top 15)")
    print("-"*80)
    print(f"{'Materia':<25} {'Tesis':>10} {'Embeddings':>12} {'Avg Chunks':>12}")
    print("-"*80)
    materia_analysis = analyzer.get_materia_analysis()
    for materia_data in materia_analysis:
        materia_name = materia_data['materia'][:24]
        print(f"{materia_name:<25} {materia_data['tesis_count']:>10,} "
              f"{materia_data['embedding_count']:>12,} {materia_data['avg_chunks']:>12.2f}")

    # Tipo Tesis Analysis
    print("\n" + "="*80)
    print("ANALYSIS BY TIPO DE TESIS")
    print("-"*80)
    print(f"{'Tipo':<30} {'Tesis':>10} {'Embeddings':>12} {'Avg Chunks':>12}")
    print("-"*80)
    tipo_analysis = analyzer.get_tipo_tesis_analysis()
    for tipo_data in tipo_analysis:
        tipo_name = (tipo_data['tipo_tesis'] or 'Unknown')[:29]
        print(f"{tipo_name:<30} {tipo_data['tesis_count']:>10,} "
              f"{tipo_data['embedding_count']:>12,} {tipo_data['avg_chunks']:>12.2f}")

    # Missing Embeddings
    print("\n" + "="*80)
    print("MISSING EMBEDDINGS")
    print("-"*80)
    missing = analyzer.get_missing_embeddings()
    if missing:
        print(f"Found {len(missing)} tesis without embeddings (showing first 10):\n")
        for i, tesis in enumerate(missing[:10]):
            rubro = (tesis['rubro'] or 'No title')[:50]
            print(f"  {tesis['id_tesis']}: {rubro} ({tesis['year']}, {tesis['tipo_tesis']})")
        if len(missing) > 10:
            print(f"\n  ... and {len(missing) - 10} more")
        print("\nRun 'python embed_all_tesis.py' to complete embedding process")
    else:
        print("✓ All tesis have embeddings!")

    # Storage Statistics
    print("\n" + "="*80)
    print("DATABASE STORAGE")
    print("-"*80)
    storage = analyzer.get_storage_stats()
    print(f"Documents Table Size:         {storage['documents_table_size']}")
    print(f"Embeddings Table Size:        {storage['embeddings_table_size']}")

    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80 + "\n")


def export_analysis_json(analyzer: EmbeddingAnalyzer, output_file: str = "embedding_analysis.json"):
    """Export analysis to JSON file"""
    analysis_data = {
        'overview': analyzer.get_corpus_overview(),
        'chunk_distribution': analyzer.get_chunk_distribution(),
        'chunk_types': analyzer.get_chunk_type_distribution(),
        'year_analysis': analyzer.get_year_analysis(),
        'materia_analysis': analyzer.get_materia_analysis(),
        'tipo_tesis_analysis': analyzer.get_tipo_tesis_analysis(),
        'storage_stats': analyzer.get_storage_stats()
    }

    # Convert numpy types to native Python types for JSON serialization
    def convert_to_native(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {key: convert_to_native(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_native(item) for item in obj]
        return obj

    analysis_data = convert_to_native(analysis_data)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Analysis exported to {output_file}")


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

    db = DatabaseManager(**db_config)

    if not db.test_connection():
        logger.error("Database connection failed")
        return

    # Create analyzer
    analyzer = EmbeddingAnalyzer(db)

    # Print analysis report
    print_analysis_report(analyzer)

    # Export to JSON
    export_analysis_json(analyzer)
    print("Analysis exported to: embedding_analysis.json\n")


if __name__ == "__main__":
    main()
