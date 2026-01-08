# 🔍 RAG System for Mexican Legal Thesis - Complete Guide

## 🎯 Overview

This is a complete RAG (Retrieval-Augmented Generation) system for querying Mexican legal thesis using:
- **Semantic Search**: OpenAI text-embedding-3-small (1536 dimensions)
- **Vector Database**: PostgreSQL with pgvector (HNSW index)
- **LLM**: Google Gemini 2.0 Flash for intelligent responses
- **Smart Context**: Adaptive full-text or chunk-based context building

## ✨ Features

### 1. **Materia Filtering**
Filter searches by legal subject matter:
- Administrativa
- Civil
- Común
- Constitucional
- Laboral
- Penal

### 2. **Smart Context Building**
- **Full Text First**: Uses complete tesis when possible (< 5000 chars)
- **Chunk Fallback**: Automatically uses chunks for large documents
- **Token Management**: Stays within LLM limits (max 15,000 chars total)

### 3. **Intelligent Q&A**
- Answers questions based on retrieved tesis
- Provides citations with tesis IDs
- Shows source documents with similarity scores
- Interactive CLI interface

---

## 📁 File Structure

```
tesis_api/
├── vectorize_tesis.py          # Vectorization pipeline
├── query_tesis.py              # Simple semantic search (no LLM)
├── rag_query.py                # ⭐ Full RAG with LLM
├── rag_pipeline.py             # RAG pipeline implementation
├── db_utils.py                 # Database operations
├── text_processing.py          # Text chunking
├── setup_database.sql          # Database schema
├── migrate_to_openai_embeddings.sql  # Migration script
└── .env                        # Configuration (API keys)
```

---

## 🚀 Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- `psycopg2-binary` - PostgreSQL adapter
- `pgvector` - Vector extension
- `openai` - OpenAI embeddings
- `google-generativeai` - Gemini LLM
- `numpy`, `tqdm`, `python-dotenv`

### 2. Configure API Keys

Edit `.env` file:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=MJ_TesisYJurisprudencias
DB_USER=postgres
DB_PASSWORD=admin

# API Keys
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Models
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gemini-2.0-flash-exp
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Google Gemini: https://makersuite.google.com/app/apikey

### 3. Set Up Database

Already done if you've migrated! Otherwise:

```bash
psql -U postgres -d MJ_TesisYJurisprudencias -f setup_database.sql
```

### 4. Vectorize Documents

```bash
python vectorize_tesis.py
```

This will:
1. Load tesis from `data/sample/tesis_sample_100.json`
2. Generate embeddings using OpenAI
3. Store vectors in database with HNSW index

---

## 💡 Usage

### Option 1: Simple Semantic Search (No LLM)

```bash
# Interactive mode
python query_tesis.py

# Single query
python query_tesis.py "¿Qué dice sobre amparo indirecto?"
```

**Returns**: Top 5 matching chunks with metadata

---

### Option 2: RAG with LLM (Recommended) ⭐

```bash
# Interactive mode with materia filtering
python rag_query.py

# Single query
python rag_query.py "¿Cuáles son los requisitos del amparo directo?"
```

#### Interactive Commands:

```
Pregunta: ¿Qué dice sobre amparo indirecto?
  → Ask a question

materias
  → List available materias

filtrar Constitucional
  → Filter by materia

limpiar
  → Clear filters

quit
  → Exit
```

---

## 📊 How It Works

### Architecture Flow:

```
User Query
    ↓
1. Select Materia (optional)
    ↓
2. Generate Query Embedding (OpenAI)
    ↓
3. Vector Search (pgvector HNSW)
    ├─ Similarity threshold: 0.3
    ├─ Top-k: 10 results
    └─ Materia filter applied
    ↓
4. Smart Context Builder
    ├─ Group chunks by tesis_id
    ├─ For each tesis:
    │   ├─ IF texto < 5000 chars → Use full text
    │   └─ ELSE → Use best chunk only
    └─ Stop at 15,000 total chars
    ↓
5. Build LLM Prompt
    ├─ System: "Eres un asistente legal..."
    └─ Context: All selected tesis
    ↓
6. Call Gemini LLM
    ├─ Temperature: 0.3 (factual)
    └─ Max tokens: 2000
    ↓
7. Format Response
    ├─ Answer
    └─ Sources (tesis IDs)
```

---

## 🧪 Examples

### Example 1: General Query

```bash
$ python rag_query.py

Pregunta: ¿Qué es el amparo directo?

🔍 Buscando tesis relevantes...

================================================================================
RESPUESTA
================================================================================

El amparo directo es un medio de defensa constitucional que procede contra
sentencias definitivas, laudos o resoluciones que pongan fin a un juicio.
Según la Tesis 2031561, el amparo directo tiene como finalidad proteger los
derechos fundamentales cuando han sido violados por una autoridad judicial...

================================================================================
FUENTES CONSULTADAS (3 tesis)
================================================================================

📄 Tesis ID: 2031561
   Rubro: AMPARO DIRECTO. PROCEDE CONTRA SENTENCIAS DEFINITIVAS...
   Materias: Constitucional
   Año: 2020
   Similitud: 0.856
   Tipo: Texto completo
...
```

### Example 2: Filtered Query

```bash
$ python rag_query.py

Pregunta [Filtro: Laboral]: ¿Qué dice sobre despido injustificado?

🔍 Buscando tesis relevantes...
```

---

## 🎛️ Configuration

### Smart Context Builder Settings

In `rag_pipeline.py`:

```python
SmartContextBuilder(
    max_chars_per_tesis=5000,  # Tesis > 5000 chars → use chunk
    max_total_chars=15000       # Total context limit
)
```

### Search Parameters

In `rag_query.py`:

```python
result = rag_pipeline.ask(
    query=query,
    materias=['Constitucional'],  # Optional filter
    top_k=10,                      # Retrieve top 10 chunks
    threshold=0.2                  # Min similarity: 0.2
)
```

### LLM Settings

In `rag_pipeline.py`:

```python
generation_config=genai.types.GenerationConfig(
    temperature=0.3,         # Lower = more factual
    max_output_tokens=2000,  # Response length
)
```

---

## 📈 Performance

### Vector Search Speed
- **100 documents**: ~50ms (HNSW index)
- **1000 documents**: ~100ms (estimated)

### Cost Estimates (per query)
- **Embeddings** (OpenAI): ~$0.0001
- **LLM** (Gemini Flash): ~$0.0001
- **Total**: ~$0.0002 per query 💰

### Context Stats (Current Data)
- Average tesis: ~2,600 chars
- Typical context: 3-5 full tesis = ~10,000 chars
- Chunks used: < 5% (most tesis fit in full)

---

## 🔧 Troubleshooting

### "OPENAI_API_KEY not found"
Add to `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

### "GEMINI_API_KEY not found"
Add to `.env`:
```bash
GEMINI_API_KEY=your-gemini-key
```

### "No results found"
- Lower threshold: Change `threshold=0.2` → `0.1`
- Remove materia filter
- Check if documents are vectorized

### "Module 'google.generativeai' not found"
```bash
pip install google-generativeai
```

---

## 🚢 Next Steps (Future Enhancements)

### Phase 1: Web Interface ✅ (You are here)
- [x] Materia filtering
- [x] Smart context builder
- [x] RAG pipeline with LLM
- [x] CLI interface

### Phase 2: API & Frontend (Next)
- [ ] FastAPI REST API
- [ ] Next.js chat interface
- [ ] Clickable tesis references
- [ ] User authentication
- [ ] Chat history

### Phase 3: Advanced Features
- [ ] Multi-turn conversations
- [ ] Tesis summarization
- [ ] Legal citation extraction
- [ ] Export to PDF/Word
- [ ] Collaborative annotations

### Phase 4: Supabase Migration
- [ ] Migrate to Supabase PostgreSQL
- [ ] Enable RLS (Row Level Security)
- [ ] Integrate with existing tables
- [ ] Deploy to production

---

## 📝 Database Schema

### Tables

**tesis_documents** (100 documents)
- `id_tesis` (PK)
- `rubro`, `texto`, `precedentes`
- `materias[]` (array for filtering)
- `anio`, `tipo_tesis`, etc.

**tesis_embeddings** (400 embeddings)
- `id` (PK)
- `id_tesis` (FK)
- `chunk_index`, `chunk_text`, `chunk_type`
- `embedding vector(1536)`

### Indexes
- HNSW index on `embedding` (vector similarity)
- GIN index on `materias[]` (array overlap)
- B-tree indexes on `id_tesis`, `anio`

### Functions
- `search_similar_tesis()` - Vector search with materia filtering
- `get_all_materias()` - List unique materias

---

## 🎓 Key Concepts

### RAG (Retrieval-Augmented Generation)
Combines search with LLM to provide accurate, source-backed answers.

### Vector Embeddings
Mathematical representations of text that capture semantic meaning.

### HNSW Index
Hierarchical Navigable Small World - fast approximate nearest neighbor search.

### Cosine Similarity
Measures similarity between vectors (0 = different, 1 = identical).

### Smart Context
Adaptively chooses full text vs chunks to maximize information within token limits.

---

## 📞 Support

For issues or questions:
1. Check this README
2. Review error messages
3. Check API quotas/billing
4. Verify database connection

---

## 🎉 Summary

You now have a complete RAG system that:
- ✅ Filters by materia
- ✅ Uses smart context building
- ✅ Answers questions with Gemini LLM
- ✅ Provides source citations
- ✅ Works via CLI (ready for API/web integration)

**Next**: Build the web interface or migrate to Supabase!

---

*Generated with Claude Code* 🤖
