"""
Database utilities for RAG vectorization pipeline
"""
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict, Optional, Tuple
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages PostgreSQL database connections and operations"""

    def __init__(self, host: str, port: int, dbname: str, user: str, password: str, use_pooler: bool = False):
        """
        Initialize database manager

        Args:
            use_pooler: If True, uses connection pooler (port 6543) for better CI/CD compatibility
        """
        # Force IPv4 by resolving hostname if needed
        import socket
        resolved_host = host
        if use_pooler and not host.replace('.', '').replace('-', '').isalnum():
            try:
                # Try to resolve to IPv4 address
                resolved_host = socket.getaddrinfo(host, None, socket.AF_INET)[0][4][0]
                logger.info(f"Resolved {host} to IPv4: {resolved_host}")
            except Exception as e:
                logger.warning(f"Could not resolve to IPv4, using hostname: {e}")

        self.connection_params = {
            'host': resolved_host,
            'port': port,
            'dbname': dbname,
            'user': user,
            'password': password,
            'sslmode': 'require',  # Required for Supabase
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 second query timeout
        }
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    logger.info("Database connection successful")
                    return True
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}")
            return False
    
    def check_pgvector(self) -> bool:
        """Check if pgvector extension is installed"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector'")
                    result = cur.fetchone()
                    if result:
                        logger.info("pgvector extension is installed")
                        return True
                    else:
                        logger.warning("pgvector extension not found")
                        return False
        except Exception as e:
            logger.error(f"Error checking pgvector: {e}")
            return False
    
    def insert_document(self, doc: Dict) -> bool:
        """Insert a single thesis document"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        INSERT INTO tesis_documents (
                            id_tesis, rubro, texto, precedentes, epoca, instancia,
                            organo_juris, fuente, tesis, tipo_tesis, localizacion,
                            anio, mes, nota_publica, anexos, huella_digital, materias
                        ) VALUES (
                            %(idTesis)s, %(rubro)s, %(texto)s, %(precedentes)s, %(epoca)s, %(instancia)s,
                            %(organoJuris)s, %(fuente)s, %(tesis)s, %(tipoTesis)s, %(localizacion)s,
                            %(anio)s, %(mes)s, %(notaPublica)s, %(anexos)s, %(huellaDigital)s, %(materias)s
                        )
                        ON CONFLICT (id_tesis) DO UPDATE SET
                            rubro = EXCLUDED.rubro,
                            texto = EXCLUDED.texto,
                            precedentes = EXCLUDED.precedentes
                    """
                    cur.execute(query, doc)
                    return True
        except Exception as e:
            logger.error(f"Error inserting document {doc.get('idTesis')}: {e}")
            return False
    
    def insert_embeddings_batch(self, embeddings: List[Tuple]) -> int:
        """
        Insert multiple embeddings at once

        Args:
            embeddings: List of tuples (id_tesis, chunk_index, chunk_text, chunk_type, embedding_vector)
            Note: embedding_vector should be halfvec(256) - reduced dimensions for memory efficiency

        Returns:
            Number of embeddings inserted
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                        INSERT INTO tesis_embeddings (id_tesis, chunk_index, chunk_text, chunk_type, embedding_reduced)
                        VALUES %s
                        ON CONFLICT (id_tesis, chunk_index) DO UPDATE SET
                            chunk_text = EXCLUDED.chunk_text,
                            embedding_reduced = EXCLUDED.embedding_reduced
                    """
                    execute_values(cur, query, embeddings)
                    return len(embeddings)
        except Exception as e:
            logger.error(f"Error inserting embeddings batch: {e}")
            return 0
    
    def get_document_count(self) -> int:
        """Get total number of documents"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM tesis_documents")
                    return cur.fetchone()[0]
        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            return 0
    
    def get_embedding_count(self) -> int:
        """Get total number of embeddings"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM tesis_embeddings")
                    return cur.fetchone()[0]
        except Exception as e:
            logger.error(f"Error getting embedding count: {e}")
            return 0
    
    def search_similar(self, query_embedding: List[float], limit: int = 10, threshold: float = 0.5, materias: Optional[List[str]] = None) -> List[Dict]:
        """
        Search for similar thesis chunks with optional materia filtering

        Args:
            query_embedding: Query vector
            limit: Maximum number of results
            threshold: Minimum similarity threshold
            materias: Optional list of materias to filter by (e.g., ['Constitucional', 'Penal'])

        Returns:
            List of matching results with metadata including full texto
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Use the database function with materia filtering
                    cur.execute(
                        "SELECT * FROM search_similar_tesis(%s::vector, %s, %s, %s)",
                        (query_embedding, threshold, limit, materias)
                    )

                    results = []
                    for row in cur.fetchall():
                        results.append({
                            'id_tesis': row[0],
                            'chunk_text': row[1],
                            'chunk_type': row[2],
                            'chunk_index': row[3],
                            'similarity': float(row[4]),
                            'rubro': row[5],
                            'texto': row[6],  # Full text included
                            'tipo_tesis': row[7],
                            'anio': row[8],
                            'materias': row[9]
                        })
                    return results
        except Exception as e:
            logger.error(f"Error searching similar: {e}")
            return []

    def get_tesis_by_id(self, tesis_id: int) -> Optional[Dict]:
        """
        Get full tesis document by ID

        Args:
            tesis_id: Tesis ID

        Returns:
            Dict with full tesis data or None if not found
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT
                            id_tesis, rubro, texto, precedentes, epoca,
                            instancia, tipo_tesis, anio, materias
                        FROM tesis_documents
                        WHERE id_tesis = %s
                    """, (tesis_id,))

                    row = cur.fetchone()
                    if row:
                        return {
                            'id_tesis': row[0],
                            'rubro': row[1],
                            'texto': row[2],
                            'precedentes': row[3],
                            'epoca': row[4],
                            'instancia': row[5],
                            'tipo_tesis': row[6],
                            'anio': row[7],
                            'materias': row[8]
                        }
                    return None
        except Exception as e:
            logger.error(f"Error getting tesis {tesis_id}: {e}")
            return None

    def get_all_materias(self) -> List[Dict]:
        """
        Get all unique materias with document counts

        Returns:
            List of dicts with materia name and count
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT
                            unnest(materias) as materia,
                            COUNT(*) as count
                        FROM tesis_documents
                        GROUP BY unnest(materias)
                        ORDER BY materia
                    """)

                    return [{'materia': row[0], 'count': row[1]} for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Error getting materias: {e}")
            return []

    def get_all_tesis_ids(self) -> List[int]:
        """
        Get all tesis IDs ordered by id_tesis

        Returns:
            List of tesis IDs
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id_tesis FROM tesis_documents ORDER BY id_tesis")
                    return [row[0] for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Error getting all tesis IDs: {e}")
            return []

    def fetch_tesis_batch(self, tesis_ids: List[int]) -> List[Dict]:
        """
        Fetch multiple tesis by IDs

        Args:
            tesis_ids: List of tesis IDs to fetch

        Returns:
            List of tesis documents
        """
        if not tesis_ids:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id_tesis, rubro, texto
                        FROM tesis_documents
                        WHERE id_tesis = ANY(%s)
                        ORDER BY id_tesis
                    """, (tesis_ids,))

                    results = []
                    for row in cur.fetchall():
                        results.append({
                            'idTesis': row[0],
                            'rubro': row[1] or '',
                            'texto': row[2] or ''
                        })
                    return results
        except Exception as e:
            logger.error(f"Error fetching tesis batch: {e}")
            return []

    def truncate_embeddings(self):
        """
        Truncate tesis_embeddings table

        WARNING: This will delete ALL embeddings!
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("TRUNCATE TABLE tesis_embeddings CASCADE")
                    logger.info("Truncated tesis_embeddings table")
        except Exception as e:
            logger.error(f"Error truncating embeddings: {e}")
            raise
