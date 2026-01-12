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
        
        # Initialize OpenAI for embeddings
        import openai
        self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Text processor
        self.text_processor = LegalTextProcessor()
        
        logger.info(f"Initialized IncrementalUpdateManager (run_type={run_type}, dry_run={dry_run})")
    
    def get_last_processed_id(self) -> int:
        """Get the maximum id_tesis from the database"""
        try:
            # Use Supabase's RPC to call PostgreSQL MAX function
            result = self.supabase.rpc('get_max_tesis_id').execute()

            # If RPC doesn't exist, fall back to querying with order
            if result.data is None:
                result = self.supabase.table('tesis_documents') \
                    .select('id_tesis') \
                    .order('id_tesis', desc=True) \
                    .limit(1) \
                    .execute()
                max_id = result.data[0]['id_tesis'] if result.data else 0
            else:
                max_id = result.data if isinstance(result.data, int) else 0

            logger.info(f"Last processed ID: {max_id}")
            return max_id
        except Exception as e:
            logger.error(f"Error getting last processed ID: {e}")
            return 0
    
    def fetch_all_ids_from_api(self) -> List[int]:
        """Fetch all tesis IDs from SCJN API"""
        all_ids = []
        page = 0
        consecutive_empty = 0
        
        logger.info("Fetching all IDs from SCJN API...")
        
        while consecutive_empty < 5:
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
                else:
                    consecutive_empty = 0
                    all_ids.extend([int(id) for id in ids])
                    logger.info(f"Page {page}: {len(ids)} IDs (total: {len(all_ids)})")
                
                page += 1
                time.sleep(0.3)  # Rate limiting
                
            except Exception as e:
                logger.error(f"Error fetching page {page}: {e}")
                break
        
        logger.info(f"Fetched {len(all_ids)} total IDs from API")
        return all_ids
    
    def get_new_ids(self) -> List[int]:
        """Get IDs that are newer than the last processed ID"""
        last_id = self.get_last_processed_id()
        all_ids = self.fetch_all_ids_from_api()
        
        new_ids = [id for id in all_ids if id > last_id]
        new_ids.sort()  # Process in order
        
        logger.info(f"Found {len(new_ids)} new tesis (last_id={last_id})")
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
    
    def generate_embeddings(self, tesis: Dict) -> int:
        """Generate embeddings for a tesis"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would generate embeddings for tesis {tesis.get('idTesis')}")
            return 0

        try:
            tesis_id = tesis.get('idTesis')
            rubro = self.clean_text(tesis.get('rubro', ''))
            texto = self.clean_text(tesis.get('texto', ''))

            embeddings_to_insert = []

            # Process rubro
            if rubro:
                chunks = self.text_processor.chunk_text(rubro, chunk_type='rubro')
                for idx, chunk_text in enumerate(chunks):
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
                        'chunk_type': 'rubro',
                        'embedding_reduced': embedding  # Supabase will handle the array format
                    })

            # Process texto
            if texto:
                chunks = self.text_processor.chunk_text(texto, chunk_type='full')
                for idx, chunk_text in enumerate(chunks, start=len(embeddings_to_insert)):
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
                        'chunk_type': 'full',
                        'embedding_reduced': embedding
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
            
            for tesis_id in new_ids:
                try:
                    # Download
                    tesis = self.download_tesis(tesis_id)
                    if not tesis:
                        failed_ids.append(tesis_id)
                        continue
                    
                    # Insert document
                    if self.insert_tesis(tesis):
                        processed_count += 1

                        # Generate embeddings
                        num_embeddings = self.generate_embeddings(tesis)
                        embeddings_count += num_embeddings
                        
                        if processed_count % 10 == 0:
                            logger.info(f"Progress: {processed_count}/{len(new_ids)} tesis, {embeddings_count} embeddings")
                    else:
                        failed_ids.append(tesis_id)
                    
                    time.sleep(0.1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error processing tesis {tesis_id}: {e}")
                    failed_ids.append(tesis_id)
            
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Completed in {duration:.1f}s")
            logger.info(f"Processed: {processed_count}/{len(new_ids)}")
            logger.info(f"Embeddings created: {embeddings_count}")
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
