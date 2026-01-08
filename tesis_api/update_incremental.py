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
from db_utils import DatabaseManager
from text_processing import LegalTextProcessor
from checkpoint_manager import CheckpointManager
from retry_handler import retry_with_backoff

# Load environment variables
load_dotenv()

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
        
        # Database connection
        self.db = DatabaseManager(
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT', 5432)),
            dbname=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        
        # Test database connection
        if not self.db.test_connection():
            raise Exception("Failed to connect to database")
        
        # Initialize OpenAI for embeddings
        import openai
        self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Text processor
        self.text_processor = LegalTextProcessor()
        
        logger.info(f"Initialized IncrementalUpdateManager (run_type={run_type}, dry_run={dry_run})")
    
    def get_last_processed_id(self) -> int:
        """Get the maximum id_tesis from the database"""
        try:
            with self.db.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COALESCE(MAX(id_tesis), 0) FROM tesis_documents")
                    max_id = cur.fetchone()[0]
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
        
        # Map fields from API to database schema
        doc = {
            'idTesis': tesis.get('idTesis'),
            'rubro': self.clean_text(tesis.get('rubro', '')),
            'texto': self.clean_text(tesis.get('texto', '')),
            'precedentes': self.clean_text(tesis.get('precedentes')),
            'epoca': tesis.get('epoca'),
            'instancia': tesis.get('instancia'),
            'organoJuris': tesis.get('organoJuris'),
            'fuente': tesis.get('fuente'),
            'tesis': tesis.get('tesis'),
            'tipoTesis': tesis.get('tipoTesis'),
            'localizacion': tesis.get('localizacion'),
            'anio': tesis.get('anio'),
            'mes': tesis.get('mes'),
            'notaPublica': tesis.get('notaPublica'),
            'anexos': tesis.get('anexos'),
            'huellaDigital': tesis.get('huellaDigital'),
            'materias': tesis.get('materias', [])
        }
        
        return self.db.insert_document(doc)
    
    def generate_embeddings(self, tesis: Dict) -> List[tuple]:
        """Generate embeddings for a tesis"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would generate embeddings for tesis {tesis.get('idTesis')}")
            return []
        
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
                    input=chunk_text
                )
                embedding = response.data[0].embedding
                embeddings_to_insert.append((
                    tesis_id,
                    idx,
                    chunk_text,
                    'rubro',
                    json.dumps(embedding)
                ))
        
        # Process texto
        if texto:
            chunks = self.text_processor.chunk_text(texto, chunk_type='full')
            for idx, chunk_text in enumerate(chunks, start=len(embeddings_to_insert)):
                response = self.openai_client.embeddings.create(
                    model='text-embedding-3-small',
                    input=chunk_text
                )
                embedding = response.data[0].embedding
                embeddings_to_insert.append((
                    tesis_id,
                    idx,
                    chunk_text,
                    'full',
                    json.dumps(embedding)
                ))
        
        # Insert embeddings
        if embeddings_to_insert:
            self.db.insert_embeddings_batch(embeddings_to_insert)
        
        return embeddings_to_insert
    
    def record_automation_run(self, status: str, new_count: int = 0, embeddings_count: int = 0, error: str = None):
        """Record automation run to database"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would record run: status={status}, new={new_count}, embeddings={embeddings_count}")
            return
        
        try:
            with self.db.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO tesis_automation_runs (
                            run_type, status, new_tesis_count, new_embeddings_count, 
                            error_message, last_processed_id
                        ) VALUES (%s, %s, %s, %s, %s, (SELECT MAX(id_tesis) FROM tesis_documents))
                    """, (self.run_type, status, new_count, embeddings_count, error))
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
                        embeddings = self.generate_embeddings(tesis)
                        embeddings_count += len(embeddings)
                        
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
