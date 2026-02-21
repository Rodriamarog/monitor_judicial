#!/usr/bin/env python3
"""
Incremental Tesis Update Pipeline
Fetches only new tesis from SCJN and updates the Supabase database
"""

import os
import sys
import json
import logging
import requests
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Import existing utilities
from text_processing import LegalTextProcessor

# Load environment variables
load_dotenv()

# Create logs directory if it doesn't exist
Path('./logs').mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/incremental_update_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class IncrementalUpdateManager:
    """Manages incremental updates of new tesis"""
    
    SCJN_BASE_URL = "https://bicentenario.scjn.gob.mx/repositorio-scjn"
    IDS_ENDPOINT = f"{SCJN_BASE_URL}/api/v1/tesis/ids"
    TESIS_ENDPOINT = f"{SCJN_BASE_URL}/api/v1/tesis"
    
    def __init__(self, run_type: str = 'scheduled', dry_run: bool = False):
        self.run_type = run_type
        self.dry_run = dry_run
        self.run_id = None
        
        # Setup directories
        self.data_dir = Path('./data/incremental')
        self.data_dir.mkdir(parents=True, exist_ok=True)
        Path('./logs').mkdir(exist_ok=True)
        
        # Initialize Supabase client (works reliably in CI/CD)
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not supabase_key:
            raise Exception("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")

        from supabase import create_client
        self.supabase = create_client(supabase_url, supabase_key)

        logger.info(f"Initialized Supabase client: {supabase_url}")
        
        # Hetzner RAG API for embedding new tesis into the vector database
        self.hetzner_url = os.getenv('HETZNER_RAG_URL', '').rstrip('/')
        self.hetzner_api_key = os.getenv('HETZNER_RAG_API_KEY', '')
        if self.hetzner_url:
            logger.info(f"Hetzner ingest enabled: {self.hetzner_url}/ingest")
        else:
            logger.warning("HETZNER_RAG_URL not set - new tesis will NOT be embedded to Hetzner")

        # Text processor
        self.text_processor = LegalTextProcessor()

        logger.info(f"Initialized IncrementalUpdateManager (run_type={run_type}, dry_run={dry_run})")
    
    def get_existing_ids(self, id_list: List[int]) -> set:
        """
        Check which IDs from the list already exist in the database

        Args:
            id_list: List of tesis IDs to check

        Returns:
            Set of IDs that already exist in database
        """
        try:
            if not id_list:
                return set()

            # Query in batches of 1000 for efficiency
            existing_ids = set()
            batch_size = 1000

            for i in range(0, len(id_list), batch_size):
                batch = id_list[i:i+batch_size]
                result = self.supabase.table('tesis_documents') \
                    .select('id_tesis') \
                    .in_('id_tesis', batch) \
                    .execute()

                if result.data:
                    existing_ids.update(row['id_tesis'] for row in result.data)

            logger.info(f"Found {len(existing_ids)} existing IDs out of {len(id_list)} checked")
            return existing_ids
        except Exception as e:
            logger.error(f"Error checking existing IDs: {e}")
            return set()
    
    def fetch_recent_ids_from_api(self, max_pages: int = 10) -> List[int]:
        """
        Fetch recent tesis IDs from SCJN API

        Note: API returns IDs in non-sequential order, so we fetch a fixed
        number of pages and then check which ones already exist in DB.

        Args:
            max_pages: Number of pages to fetch (default 10 pages = 2k IDs)

        Returns:
            List of all IDs fetched from API
        """
        all_ids = []
        consecutive_empty = 0

        logger.info(f"Fetching recent IDs from SCJN API (max {max_pages} pages)...")

        for page in range(max_pages):
            try:
                response = requests.get(
                    self.IDS_ENDPOINT,
                    params={'page': page, 'size': 200},
                    timeout=30
                )
                response.raise_for_status()
                ids = response.json()

                if not ids:
                    consecutive_empty += 1
                    logger.info(f"Empty page {page} ({consecutive_empty}/5)")
                    if consecutive_empty >= 5:
                        logger.info("Hit 5 consecutive empty pages, stopping")
                        break
                else:
                    consecutive_empty = 0
                    page_ids = [int(id_val) for id_val in ids]
                    all_ids.extend(page_ids)
                    logger.info(f"Page {page}: {len(page_ids)} IDs (total: {len(all_ids)})")

                time.sleep(0.3)  # Rate limiting

            except Exception as e:
                logger.error(f"Error fetching page {page}: {e}")
                break

        logger.info(f"Fetched {len(all_ids)} total IDs from {page + 1} pages")
        return all_ids
    
    def get_new_ids(self) -> List[int]:
        """
        Get IDs that don't exist in the database yet

        Strategy:
        1. Fetch recent IDs from API (10 pages = ~2000 IDs)
        2. Check which ones already exist in DB
        3. Return only the new ones
        """
        # Fetch recent IDs from API
        all_ids = self.fetch_recent_ids_from_api(max_pages=10)

        if not all_ids:
            logger.info("No IDs fetched from API")
            return []

        # Check which ones exist in database
        existing_ids = self.get_existing_ids(all_ids)

        # Filter to only new IDs
        new_ids = [id for id in all_ids if id not in existing_ids]
        new_ids.sort()  # Process in order

        logger.info(f"Found {len(new_ids)} new tesis out of {len(all_ids)} fetched")
        return new_ids
    
    def download_tesis(self, tesis_id: int) -> Optional[Dict]:
        """Download a single tesis from SCJN API"""
        try:
            response = requests.get(
                f"{self.TESIS_ENDPOINT}/{tesis_id}",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error downloading tesis {tesis_id}: {e}")
            return None
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return text
        # Basic cleaning
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        text = ' '.join(text.split())  # Normalize whitespace
        return text
    
    def insert_tesis(self, tesis: Dict) -> bool:
        """Insert tesis into database"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would insert tesis {tesis.get('idTesis')}")
            return True

        try:
            # Map fields from API to database schema
            doc = {
                'id_tesis': tesis.get('idTesis'),
                'rubro': self.clean_text(tesis.get('rubro', '')),
                'texto': self.clean_text(tesis.get('texto', '')),
                'precedentes': self.clean_text(tesis.get('precedentes')),
                'epoca': tesis.get('epoca'),
                'instancia': tesis.get('instancia'),
                'organo_juris': tesis.get('organoJuris'),
                'fuente': tesis.get('fuente'),
                'tesis': tesis.get('tesis'),
                'tipo_tesis': tesis.get('tipoTesis'),
                'localizacion': tesis.get('localizacion'),
                'anio': tesis.get('anio'),
                'mes': tesis.get('mes'),
                'nota_publica': tesis.get('notaPublica'),
                'anexos': tesis.get('anexos'),
                'huella_digital': tesis.get('huellaDigital'),
                'materias': tesis.get('materias', [])
            }

            # Use upsert to handle duplicates
            self.supabase.table('tesis_documents').upsert(doc).execute()
            return True
        except Exception as e:
            logger.error(f"Error inserting tesis {tesis.get('idTesis')}: {e}")
            return False
    
    def ingest_to_hetzner(self, tesis_batch: List[Dict]) -> int:
        """
        Send new tesis to Hetzner RAG API for embedding and storage.
        Hetzner generates the embeddings and upserts into its local postgres.

        Args:
            tesis_batch: List of raw tesis dicts (from SCJN API)

        Returns:
            Number of tesis successfully embedded
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would ingest {len(tesis_batch)} tesis to Hetzner")
            return 0

        if not self.hetzner_url or not self.hetzner_api_key:
            logger.warning("Hetzner ingest skipped: HETZNER_RAG_URL or HETZNER_RAG_API_KEY not set")
            return 0

        # Map SCJN API fields to what Hetzner expects
        payload = []
        for t in tesis_batch:
            payload.append({
                'id_tesis': t.get('idTesis'),
                'rubro': t.get('rubro', ''),
                'texto': t.get('texto', ''),
                'tipo_tesis': t.get('tipoTesis', 'Tesis Aislada'),
                'epoca': t.get('epoca', 'Undécima Época'),
                'instancia': t.get('instancia'),
                'anio': t.get('anio'),
                'materias': t.get('materias', []),
            })

        # Send in batches of 50 to avoid timeouts
        batch_size = 50
        total_inserted = 0

        for i in range(0, len(payload), batch_size):
            batch = payload[i:i + batch_size]
            try:
                logger.info(f"Sending batch {i // batch_size + 1} ({len(batch)} tesis) to Hetzner...")
                response = requests.post(
                    f"{self.hetzner_url}/ingest",
                    json={'tesis': batch},
                    headers={
                        'Authorization': f'Bearer {self.hetzner_api_key}',
                        'Content-Type': 'application/json',
                    },
                    timeout=300,  # 5 min per batch (embeddings take time)
                )
                response.raise_for_status()
                result = response.json()
                total_inserted += result.get('inserted', 0)
                logger.info(f"Hetzner batch result: {result.get('inserted')} inserted, {result.get('failed')} failed")
                if result.get('failedIds'):
                    logger.warning(f"Hetzner failed IDs: {result['failedIds']}")
            except Exception as e:
                logger.error(f"Error sending batch to Hetzner: {e}")

        logger.info(f"Hetzner ingest complete: {total_inserted}/{len(tesis_batch)} tesis embedded")
        return total_inserted

    def generate_embeddings(self, tesis: Dict) -> int:
        """Generate embeddings for a tesis"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would generate embeddings for tesis {tesis.get('idTesis')}")
            return 0

        try:
            tesis_id = tesis.get('idTesis')

            # Use prepare_document_for_embedding which returns [(chunk_text, chunk_type), ...]
            chunks_with_types = self.text_processor.prepare_document_for_embedding(tesis)

            embeddings_to_insert = []

            # Process each chunk
            for idx, (chunk_text, chunk_type) in enumerate(chunks_with_types):
                response = self.openai_client.embeddings.create(
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
                    'embedding_reduced': embedding  # 256-dim halfvec embeddings
                })

            # Insert embeddings batch
            if embeddings_to_insert:
                self.supabase.table('tesis_embeddings').upsert(embeddings_to_insert).execute()

            return len(embeddings_to_insert)
        except Exception as e:
            logger.error(f"Error generating embeddings for tesis {tesis.get('idTesis')}: {e}")
            return 0
    
    def record_automation_run(self, status: str, new_count: int = 0, embeddings_count: int = 0, error: str = None):
        """Record automation run to database"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would record run: status={status}, new={new_count}, embeddings={embeddings_count}")
            return

        try:
            # Get last processed ID
            last_id_result = self.supabase.table('tesis_documents') \
                .select('id_tesis') \
                .order('id_tesis', desc=True) \
                .limit(1) \
                .execute()

            last_id = last_id_result.data[0]['id_tesis'] if last_id_result.data else None

            # Insert automation run record
            self.supabase.table('tesis_automation_runs').insert({
                'run_type': self.run_type,
                'status': status,
                'new_tesis_count': new_count,
                'new_embeddings_count': embeddings_count,
                'error_message': error,
                'last_processed_id': last_id
            }).execute()
        except Exception as e:
            logger.error(f"Error recording automation run: {e}")
    
    def run(self):
        """Execute the incremental update pipeline"""
        start_time = datetime.now()
        logger.info(f"Starting incremental update (run_type={self.run_type})")
        
        try:
            # Get new IDs
            new_ids = self.get_new_ids()
            
            if not new_ids:
                logger.info("No new tesis to process")
                self.record_automation_run('success', 0, 0)
                return
            
            logger.info(f"Processing {len(new_ids)} new tesis...")
            
            processed_count = 0
            embeddings_count = 0
            failed_ids = []
            inserted_tesis_raw = []  # Collect raw tesis for Hetzner ingest

            for tesis_id in new_ids:
                try:
                    # Download
                    tesis = self.download_tesis(tesis_id)
                    if not tesis:
                        failed_ids.append(tesis_id)
                        continue

                    # Insert document to Supabase
                    if self.insert_tesis(tesis):
                        processed_count += 1
                        inserted_tesis_raw.append(tesis)  # Keep for Hetzner ingest

                        if processed_count % 10 == 0:
                            logger.info(f"Progress: {processed_count}/{len(new_ids)} tesis inserted to Supabase")
                    else:
                        failed_ids.append(tesis_id)

                    time.sleep(0.1)  # Rate limiting

                except Exception as e:
                    logger.error(f"Error processing tesis {tesis_id}: {e}")
                    failed_ids.append(tesis_id)

            # Send new tesis to Hetzner for embedding
            if inserted_tesis_raw:
                logger.info(f"Sending {len(inserted_tesis_raw)} new tesis to Hetzner for embedding...")
                embeddings_count = self.ingest_to_hetzner(inserted_tesis_raw)

            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Completed in {duration:.1f}s")
            logger.info(f"Processed: {processed_count}/{len(new_ids)}")
            logger.info(f"Hetzner embeddings: {embeddings_count}")
            if failed_ids:
                logger.warning(f"Failed IDs: {failed_ids}")

            self.record_automation_run('success', processed_count, embeddings_count)
            
        except Exception as e:
            logger.error(f"Automation failed: {e}", exc_info=True)
            self.record_automation_run('failed', 0, 0, str(e))
            raise

def main():
    run_type = os.getenv('RUN_TYPE', 'manual')
    dry_run = os.getenv('DRY_RUN', 'false').lower() == 'true'
    
    manager = IncrementalUpdateManager(run_type=run_type, dry_run=dry_run)
    manager.run()

if __name__ == '__main__':
    main()
