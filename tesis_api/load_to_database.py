#!/usr/bin/env python3
"""
Load cleaned tesis JSON files into PostgreSQL database
"""

import json
import psycopg2
from psycopg2.extras import execute_batch
from pathlib import Path
from typing import List, Dict
from tqdm import tqdm
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class TesisDatabaseLoader:
    """Loads tesis from JSON files into PostgreSQL"""

    # Field mapping: JSON (camelCase) -> DB (snake_case)
    FIELD_MAP = {
        'idTesis': 'id_tesis',
        'organoJuris': 'organo_juris',
        'tipoTesis': 'tipo_tesis',
        'notaPublica': 'nota_publica',
        'huellaDigital': 'huella_digital'
    }

    def __init__(self, host: str, port: int, dbname: str, user: str, password: str):
        self.connection_params = {
            'host': host,
            'port': port,
            'dbname': dbname,
            'user': user,
            'password': password
        }
        self.conn = None
        self.stats = {
            'total_files': 0,
            'total_tesis': 0,
            'successful': 0,
            'failed': 0,
            'failed_ids': []
        }

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(**self.connection_params)
            print(f"✓ Connected to database: {self.connection_params['dbname']}")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            print("✓ Database connection closed")

    def convert_to_db_format(self, tesis: Dict) -> Dict:
        """Convert JSON tesis to database format (camelCase -> snake_case)"""
        db_record = {}
        for json_key, value in tesis.items():
            db_key = self.FIELD_MAP.get(json_key, json_key)
            db_record[db_key] = value

        # Ensure all required fields exist (set to None if missing)
        required_fields = [
            'id_tesis', 'rubro', 'texto', 'precedentes', 'epoca', 'instancia',
            'organo_juris', 'fuente', 'tesis', 'tipo_tesis', 'localizacion',
            'anio', 'mes', 'nota_publica', 'anexos', 'huella_digital', 'materias'
        ]

        for field in required_fields:
            if field not in db_record:
                db_record[field] = None

        return db_record

    def load_batch_file(self, filepath: Path) -> int:
        """
        Load a single batch file into database

        Returns:
            Number of successfully inserted tesis
        """
        try:
            # Read JSON file
            with open(filepath, 'r', encoding='utf-8') as f:
                tesis_list = json.load(f)

            # Convert all records to DB format
            db_records = [self.convert_to_db_format(t) for t in tesis_list]

            # Prepare insert query
            insert_query = """
                INSERT INTO tesis_documents (
                    id_tesis, rubro, texto, precedentes, epoca, instancia,
                    organo_juris, fuente, tesis, tipo_tesis, localizacion,
                    anio, mes, nota_publica, anexos, huella_digital, materias
                ) VALUES (
                    %(id_tesis)s, %(rubro)s, %(texto)s, %(precedentes)s, %(epoca)s, %(instancia)s,
                    %(organo_juris)s, %(fuente)s, %(tesis)s, %(tipo_tesis)s, %(localizacion)s,
                    %(anio)s, %(mes)s, %(nota_publica)s, %(anexos)s, %(huella_digital)s, %(materias)s
                )
                ON CONFLICT (id_tesis) DO UPDATE SET
                    rubro = EXCLUDED.rubro,
                    texto = EXCLUDED.texto,
                    precedentes = EXCLUDED.precedentes,
                    epoca = EXCLUDED.epoca,
                    instancia = EXCLUDED.instancia,
                    organo_juris = EXCLUDED.organo_juris,
                    fuente = EXCLUDED.fuente,
                    tesis = EXCLUDED.tesis,
                    tipo_tesis = EXCLUDED.tipo_tesis,
                    localizacion = EXCLUDED.localizacion,
                    anio = EXCLUDED.anio,
                    mes = EXCLUDED.mes,
                    nota_publica = EXCLUDED.nota_publica,
                    anexos = EXCLUDED.anexos,
                    huella_digital = EXCLUDED.huella_digital,
                    materias = EXCLUDED.materias
            """

            # Batch insert with cursor
            cur = self.conn.cursor()

            # Use execute_batch for better performance
            execute_batch(cur, insert_query, db_records, page_size=1000)

            self.conn.commit()
            cur.close()

            self.stats['successful'] += len(db_records)
            return len(db_records)

        except Exception as e:
            self.conn.rollback()
            print(f"\n❌ Error loading {filepath.name}: {e}")
            self.stats['failed'] += len(tesis_list) if 'tesis_list' in locals() else 0
            return 0

    def load_all(self, data_dir: Path):
        """Load all batch files from directory"""
        batch_files = sorted(data_dir.glob("tesis_batch_*.json"))
        self.stats['total_files'] = len(batch_files)

        if not batch_files:
            print(f"❌ No batch files found in {data_dir}")
            return

        print("=" * 80)
        print("LOADING TESIS TO DATABASE")
        print("=" * 80)
        print(f"Database: {self.connection_params['dbname']}")
        print(f"Files to load: {len(batch_files)}")
        print(f"Starting load...")
        print()

        # Connect to database
        if not self.connect():
            return

        # Get initial count
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM tesis_documents")
        initial_count = cur.fetchone()[0]
        cur.close()
        print(f"Initial tesis count: {initial_count:,}")
        print()

        # Load each batch file
        try:
            for batch_file in tqdm(batch_files, desc="Loading batches"):
                count = self.load_batch_file(batch_file)
                self.stats['total_tesis'] += count

        except KeyboardInterrupt:
            print("\n\n⚠️  Load interrupted by user")
            self.conn.rollback()

        except Exception as e:
            print(f"\n\n❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            self.conn.rollback()

        finally:
            # Get final count
            cur = self.conn.cursor()
            cur.execute("SELECT COUNT(*) FROM tesis_documents")
            final_count = cur.fetchone()[0]
            cur.close()

            self.close()
            self.print_summary(initial_count, final_count)

    def print_summary(self, initial_count: int, final_count: int):
        """Print load summary"""
        print("\n" + "=" * 80)
        print("LOAD COMPLETE!")
        print("=" * 80)
        print(f"\n📊 STATISTICS")
        print(f"   Files processed: {self.stats['total_files']}")
        print(f"   Records in batches: {self.stats['total_tesis']:,}")
        print(f"   Successfully loaded: {self.stats['successful']:,}")
        print(f"   Failed: {self.stats['failed']:,}")
        print()
        print(f"📈 DATABASE COUNTS")
        print(f"   Before: {initial_count:,}")
        print(f"   After: {final_count:,}")
        print(f"   Added/Updated: {final_count - initial_count:,}")
        print()

        if self.stats['failed'] > 0:
            print(f"⚠️  {self.stats['failed']:,} records failed to load")
        else:
            print("✓ All records loaded successfully!")

        print("\n" + "=" * 80)
        print("Next steps:")
        print("  1. Verify data: SELECT COUNT(*) FROM tesis_documents;")
        print("  2. Check materias: SELECT DISTINCT unnest(materias) FROM tesis_documents;")
        print("  3. Generate embeddings: python vectorize_tesis.py")
        print("=" * 80)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Load tesis JSON files to database')
    parser.add_argument('--input', type=str, default='data/cleaned', help='Input directory with JSON files')
    args = parser.parse_args()

    # Paths
    base_dir = Path(__file__).parent
    data_dir = base_dir / args.input

    if not data_dir.exists():
        print(f"❌ Input directory not found: {data_dir}")
        return

    # Database configuration from environment
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'dbname': os.getenv('DB_NAME', 'MJ_TesisYJurisprudencias'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'admin')
    }

    # Create loader and run
    loader = TesisDatabaseLoader(**db_config)
    loader.load_all(data_dir)


if __name__ == "__main__":
    main()
