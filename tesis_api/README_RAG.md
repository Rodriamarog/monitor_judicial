# RAG Vectorization Pipeline for Legal Thesis

A complete pipeline for vectorizing and semantically searching Mexican legal thesis (tesis y jurisprudencias) from the SCJN using pgvector and Qwen3 embeddings.

## Overview

This system allows you to:
- Store legal thesis documents in PostgreSQL with pgvector
- Generate semantic embeddings using Qwen3-Embedding-8B (local, no API costs)
- Perform semantic search to find relevant legal precedents
- Query using natural language in Spanish

## Quick Start

### 1. Database Setup

First, set up the PostgreSQL database with pgvector:

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres

# Run the setup script
\i setup_database.sql

# Or from command line:
psql -h localhost -U postgres -d MJ_TesisYJurisprudencias -f setup_database.sql
```

### 2. Python Environment

Install dependencies:

```bash
# Install Python packages
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file (copy from `env_template.txt`):

```bash
cp env_template.txt .env
# Edit .env with your credentials if needed
```

### 4. Vectorize Documents

Run the vectorization script:

```bash
python vectorize_tesis.py
```

This will:
- Load the 100 sample thesis from `data/sample/tesis_sample_100.json`
- Generate embeddings using Qwen3 model (~5-10 minutes on CPU, faster on GPU)
- Store documents and embeddings in the database

### 5. Query the Database

Interactive mode:
```bash
python query_tesis.py
```

Single query:
```bash
python query_tesis.py "¿Qué dice sobre el amparo indirecto?"
```

## Database Schema

### Tables

**tesis_documents**: Stores full thesis metadata
- `id_tesis`: Primary key
- `rubro`: Thesis title/heading
- `texto`: Full text content
- `materias`: Array of legal subjects
- `tipo_tesis`: Type (Jurisprudencia/Aislada)
- `anio`, `mes`: Publication date
- Other metadata fields

**tesis_embeddings**: Stores vector embeddings
- `id`: Auto-increment primary key
- `id_tesis`: Foreign key to tesis_documents
- `chunk_index`: Chunk number within document
- `chunk_text`: Text content of chunk
- `chunk_type`: Section type (rubro/hechos/criterio/justificacion/full)
- `embedding`: Vector(8192) - Qwen3 embedding

### Indexes

- IVFFlat index on embeddings for fast cosine similarity search
- GIN index on materias array for filtering
- B-tree indexes on year, tipo_tesis for filtering

## How It Works

### Text Processing

Legal documents are intelligently chunked:
1. **Section Detection**: Extracts "Hechos", "Criterio jurídico", "Justificación"
2. **Smart Chunking**: Preserves paragraph boundaries, ~512 tokens per chunk
3. **Overlap**: 50-token overlap between chunks for context preservation

### Embedding Generation

Uses **Qwen3-Embedding-8B** (or gte-Qwen2-7B-instruct):
- 8192-dimensional embeddings
- Optimized for multilingual text (excellent for Spanish)
- Runs locally (no API costs)
- GPU-accelerated when available

### Semantic Search

1. Query is converted to embedding
2. Cosine similarity search using pgvector
3. Results ranked by similarity score
4. Returns top-k most relevant chunks with metadata

## File Structure

```
tesis_api/
├── setup_database.sql          # Database schema and setup
├── requirements.txt             # Python dependencies
├── env_template.txt            # Environment variables template
├── db_utils.py                 # Database operations
├── text_processing.py          # Text chunking and processing
├── vectorize_tesis.py          # Main vectorization script
├── query_tesis.py              # Query interface
└── data/
    └── sample/
        └── tesis_sample_100.json  # Sample data
```

## Example Queries

```python
# In interactive mode (python query_tesis.py):

Query: ¿Qué dice sobre el amparo indirecto?
Query: Derechos humanos y dignidad
Query: Pensión jubilatoria
Query: Suspensión del acto reclamado
Query: Violencia familiar
Query: Aborto y derechos reproductivos
```

## Configuration

Edit `.env` to customize:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=MJ_TesisYJurisprudencias
DB_USER=postgres
DB_PASSWORD=admin

# Model
EMBEDDING_MODEL=Alibaba-NLP/gte-Qwen2-7B-instruct
EMBEDDING_DIMENSION=8192
BATCH_SIZE=8
MAX_CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

## Troubleshooting

### pgvector not found
```bash
# Install pgvector extension
sudo apt-get install postgresql-15-pgvector
# Or compile from source: https://github.com/pgvector/pgvector
```

### Out of memory during vectorization
Reduce `BATCH_SIZE` in `.env`:
```bash
BATCH_SIZE=4  # or even 2 for very limited RAM
```

### Model download issues
The model will auto-download from HuggingFace (~3GB). Ensure you have:
- Stable internet connection
- ~10GB free disk space
- HuggingFace access (no authentication needed for this model)

## Performance

- **Vectorization**: ~100 documents in 5-10 minutes (CPU), 1-2 minutes (GPU)
- **Query**: <100ms per query
- **Storage**: ~50MB for 100 documents with embeddings

## Scaling to Full Dataset

To vectorize all thesis (100,000+):

1. Use `get_all_ids.py` to download all IDs
2. Modify `vectorize_tesis.py` to process in batches
3. Consider using GPU for faster processing
4. Increase `lists` parameter in IVFFlat index for better performance

## License

This project is for research and educational purposes.
