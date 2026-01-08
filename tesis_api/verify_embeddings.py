#!/usr/bin/env python3
"""
Verify Embeddings Integrity
Checks that all tesis have embeddings and they are valid
"""
import os
import logging
from dotenv import load_dotenv
from collections import Counter

from db_utils import DatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def verify_embeddings(db: DatabaseManager):
    """Verify embeddings integrity"""
    print("="*80)
    print("EMBEDDING VERIFICATION")
    print("="*80 + "\n")

    # Get total tesis
    total_tesis = db.get_document_count()
    total_embeddings = db.get_embedding_count()

    print(f"Total Tesis in Database:      {total_tesis:,}")
    print(f"Total Embeddings in Database: {total_embeddings:,}\n")

    # Check which tesis have embeddings
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            # Tesis with embeddings
            cur.execute("""
                SELECT COUNT(DISTINCT id_tesis)
                FROM tesis_embeddings
            """)
            tesis_with_embeddings = cur.fetchone()[0]

            # Tesis without embeddings
            cur.execute("""
                SELECT COUNT(*)
                FROM tesis_documents td
                WHERE NOT EXISTS (
                    SELECT 1 FROM tesis_embeddings te
                    WHERE te.id_tesis = td.id_tesis
                )
            """)
            tesis_without_embeddings = cur.fetchone()[0]

            print(f"Tesis WITH embeddings:        {tesis_with_embeddings:,}")
            print(f"Tesis WITHOUT embeddings:     {tesis_without_embeddings:,}")

            if tesis_without_embeddings > 0:
                print("\n⚠️  Warning: Some tesis are missing embeddings!")
                print("Run 'python embed_all_tesis.py' to complete embedding process")
            else:
                print("\n✓ All tesis have embeddings!")

            # Check chunks per tesis distribution
            print("\n" + "-"*80)
            print("CHUNKS PER TESIS DISTRIBUTION")
            print("-"*80)

            cur.execute("""
                SELECT
                    id_tesis,
                    COUNT(*) as chunk_count
                FROM tesis_embeddings
                GROUP BY id_tesis
            """)

            chunk_counts = [row[1] for row in cur.fetchall()]

            if chunk_counts:
                from collections import Counter
                distribution = Counter(chunk_counts)

                print(f"\nMin chunks: {min(chunk_counts)}")
                print(f"Max chunks: {max(chunk_counts)}")
                print(f"Avg chunks: {sum(chunk_counts) / len(chunk_counts):.1f}")
                print(f"Median chunks: {sorted(chunk_counts)[len(chunk_counts)//2]}")

                print("\nDistribution:")
                for chunks, count in sorted(distribution.items()):
                    print(f"  {chunks} chunks: {count:,} tesis")

            # Check for duplicates
            print("\n" + "-"*80)
            print("DUPLICATE CHECK")
            print("-"*80)

            cur.execute("""
                SELECT id_tesis, chunk_index, COUNT(*)
                FROM tesis_embeddings
                GROUP BY id_tesis, chunk_index
                HAVING COUNT(*) > 1
            """)

            duplicates = cur.fetchall()
            if duplicates:
                print(f"\n⚠️  Found {len(duplicates)} duplicate chunks!")
                for dup in duplicates[:10]:  # Show first 10
                    print(f"  Tesis {dup[0]}, Chunk {dup[1]}: {dup[2]} copies")
            else:
                print("\n✓ No duplicate chunks found")

            # Check embedding dimensions
            print("\n" + "-"*80)
            print("EMBEDDING DIMENSIONS CHECK")
            print("-"*80)

            cur.execute("""
                SELECT array_length(embedding, 1) as dims, COUNT(*)
                FROM tesis_embeddings
                GROUP BY dims
            """)

            dim_counts = cur.fetchall()
            for dims, count in dim_counts:
                status = "✓" if dims == 1536 else "⚠️ "
                print(f"{status} {dims} dimensions: {count:,} embeddings")

            # Check for NULL embeddings
            cur.execute("""
                SELECT COUNT(*)
                FROM tesis_embeddings
                WHERE embedding IS NULL
            """)

            null_count = cur.fetchone()[0]
            if null_count > 0:
                print(f"\n⚠️  Found {null_count} NULL embeddings!")
            else:
                print("\n✓ No NULL embeddings")

    print("\n" + "="*80)
    print("VERIFICATION COMPLETE")
    print("="*80 + "\n")


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

    verify_embeddings(db)


if __name__ == "__main__":
    main()
