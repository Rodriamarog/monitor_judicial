#!/usr/bin/env python3
"""
Generate embeddings for tesis from Supabase and store in local Postgres.
Phase 3: Start with 1,000 documents from 11th Época for testing.
"""

import os
import sys
from typing import List, Dict, Any
from dotenv import load_dotenv
from openai import OpenAI
import psycopg2
from psycopg2.extras import execute_values

# Load environment variables from .env.local
load_dotenv("/home/rodrigo/code/monitor_judicial/.env.local")

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_supabase_conn():
    """Connect to Supabase Postgres directly"""
    return psycopg2.connect(
        host=os.getenv("SUPABASE_TESIS_HOST"),
        port=os.getenv("SUPABASE_TESIS_PORT"),
        database=os.getenv("SUPABASE_TESIS_DB"),
        user=os.getenv("SUPABASE_TESIS_USER"),
        password=os.getenv("SUPABASE_TESIS_PASSWORD")
    )


def get_local_postgres_conn():
    """Connect to local Postgres"""
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="legal_rag",
        user="rodrigo",
        password=os.getenv("LOCAL_POSTGRES_PASSWORD")
    )


def get_already_embedded_ids() -> set:
    """Get set of id_tesis that already have embeddings in local database"""
    conn = get_local_postgres_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT id_tesis FROM tesis_embeddings")
    ids = {row[0] for row in cursor.fetchall()}

    cursor.close()
    conn.close()

    return ids


def fetch_tesis_from_supabase(epocas: List[str], limit: int = None, exclude_ids: set = None) -> List[Dict[str, Any]]:
    """Fetch tesis from Supabase, optionally excluding already-embedded IDs"""
    epoca_str = " y ".join(epocas)
    limit_str = f"{limit} tesis" if limit else "todas las tesis"
    exclude_str = f" (excluding {len(exclude_ids)} already embedded)" if exclude_ids else ""
    print(f"Fetching {limit_str} from {epoca_str}{exclude_str}...")

    conn = get_supabase_conn()
    cursor = conn.cursor()

    # Build query
    placeholders = ','.join(['%s'] * len(epocas))
    limit_clause = f"LIMIT {limit}" if limit else ""

    # Add exclusion clause if we have IDs to exclude
    exclude_clause = ""
    query_params = list(epocas)

    if exclude_ids:
        # For large sets, use NOT IN with a subquery approach or temp table
        # For now, if the set is reasonable, use NOT IN directly
        if len(exclude_ids) > 0:
            exclude_placeholders = ','.join(['%s'] * len(exclude_ids))
            exclude_clause = f"AND id_tesis NOT IN ({exclude_placeholders})"
            query_params.extend(list(exclude_ids))

    query = f"""
        SELECT
            id_tesis, rubro, texto, precedentes,
            epoca, tipo_tesis, instancia, organo_juris, anio, materias,
            tesis, localizacion, fuente
        FROM tesis_documents
        WHERE epoca IN ({placeholders})
        {exclude_clause}
        ORDER BY epoca DESC, id_tesis DESC
        {limit_clause}
    """

    cursor.execute(query, query_params)

    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    # Convert to list of dicts
    tesis_list = [dict(zip(columns, row)) for row in rows]
    print(f"Fetched {len(tesis_list)} tesis")

    # Show breakdown by época
    for epoca in epocas:
        count = sum(1 for t in tesis_list if t['epoca'] == epoca)
        print(f"  - {epoca}: {count} tesis")

    return tesis_list


def generate_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """Generate embedding using OpenAI API"""
    response = openai_client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding


def process_batch(tesis_batch: List[Dict[str, Any]], batch_num: int, total_batches: int):
    """Process a batch of tesis: generate embeddings and insert into Postgres"""
    conn = get_local_postgres_conn()
    cursor = conn.cursor()

    print(f"\nProcessing batch {batch_num}/{total_batches} ({len(tesis_batch)} tesis)...")

    for idx, tesis in enumerate(tesis_batch, 1):
        try:
            id_tesis = tesis['id_tesis']
            rubro = tesis['rubro']
            texto = tesis['texto']

            # Generate embeddings for rubro and texto
            print(f"  [{idx}/{len(tesis_batch)}] Generating embeddings for tesis {id_tesis}...", end=" ")
            rubro_embedding = generate_embedding(rubro)
            texto_embedding = generate_embedding(texto)
            print("✓")

            # Insert into local Postgres
            cursor.execute("""
                INSERT INTO tesis_embeddings (
                    id_tesis, rubro_embedding, texto_embedding,
                    rubro, texto, precedentes,
                    epoca, tipo_tesis, instancia, organo_juris, anio, materias,
                    tesis, localizacion, fuente
                ) VALUES (
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
                )
                ON CONFLICT (id_tesis) DO UPDATE SET
                    rubro_embedding = EXCLUDED.rubro_embedding,
                    texto_embedding = EXCLUDED.texto_embedding,
                    updated_at = NOW()
            """, (
                id_tesis, rubro_embedding, texto_embedding,
                rubro, texto, tesis.get('precedentes'),
                tesis['epoca'], tesis['tipo_tesis'], tesis.get('instancia'),
                tesis.get('organo_juris'), tesis.get('anio'), tesis.get('materias'),
                tesis.get('tesis'), tesis.get('localizacion'), tesis.get('fuente')
            ))

        except Exception as e:
            print(f"\n  ✗ Error processing tesis {id_tesis}: {e}")
            conn.rollback()
            continue

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Batch {batch_num} committed to database ✓")


def main():
    """Main execution"""
    # Configuration
    LIMIT = None  # No limit - get all documents
    BATCH_SIZE = 10  # Process 10 at a time to see progress
    EPOCAS = ["Décima Época", "Undécima Época"]  # Both 10th and 11th

    print("=" * 60)
    print("TESIS EMBEDDING GENERATOR - FULL DATASET (32k docs)")
    print("=" * 60)

    # Check for already-embedded documents (checkpoint/resume)
    print("\n📋 Checking for existing embeddings...")
    already_embedded = get_already_embedded_ids()

    if already_embedded:
        print(f"✓ Found {len(already_embedded)} documents already embedded")
        print(f"  Will skip these and only process remaining documents")
    else:
        print("  No existing embeddings found - starting from scratch")

    # Fetch tesis from Supabase (excluding already embedded)
    tesis_list = fetch_tesis_from_supabase(epocas=EPOCAS, limit=LIMIT, exclude_ids=already_embedded)

    if not tesis_list:
        print("\n✓ All documents already embedded! Nothing to process.")

        # Show final count
        conn = get_local_postgres_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tesis_embeddings")
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"\nTotal tesis in local database: {count}")
        return

    # Process in batches
    total_batches = (len(tesis_list) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(tesis_list), BATCH_SIZE):
        batch = tesis_list[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        process_batch(batch, batch_num, total_batches)

    print("\n" + "=" * 60)
    print(f"✓ Successfully processed {len(tesis_list)} new tesis in this run")
    print("=" * 60)

    # Verify in local database
    conn = get_local_postgres_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM tesis_embeddings")
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    print(f"\nTotal tesis in local database: {count}")


if __name__ == "__main__":
    main()
