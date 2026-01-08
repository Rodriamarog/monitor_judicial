# Migration Summary: Qwen3 → OpenAI text-embedding-3-small

## ✅ Changes Completed

### 1. Code Updates
- **vectorize_tesis.py**: Replaced `Qwen3EmbeddingModel` with `OpenAIEmbeddingModel`
- **query_tesis.py**: Updated to use `OpenAIEmbeddingModel`
- Both files now use OpenAI API for embeddings

### 2. Database Schema
- **Vector dimensions**: Changed from 8192 → 1536
- **HNSW index**: Successfully created (1536 < 2000 limit ✓)
- **Migration applied**: All tables and functions updated

### 3. Configuration Files
- **requirements.txt**: Updated dependencies (removed torch/transformers, added openai)
- **env_template.txt**: Added OPENAI_API_KEY, updated model settings
- **setup_database.sql**: Updated for future fresh installations

### 4. New Files
- **migrate_to_openai_embeddings.sql**: Migration script (already applied)

---

## 🚀 Next Steps

### Step 1: Update Your .env File
Add your OpenAI API key to `.env`:

```bash
# Add this line to your .env file
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Update these values (if not already set)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
BATCH_SIZE=100
```

### Step 2: Install New Dependencies
```bash
pip install openai>=1.0.0

# Optional: Uninstall old heavy dependencies to free space
pip uninstall torch transformers sentence-transformers accelerate
```

### Step 3: Re-vectorize Your Documents
Since the embedding dimensions changed, you need to regenerate all embeddings:

```bash
python vectorize_tesis.py
```

This will:
- Connect to the database
- Load your thesis documents
- Generate new 1536-dimension embeddings via OpenAI API
- Store them in the database with HNSW indexing

### Step 4: Test Search
```bash
# Interactive mode
python query_tesis.py

# Or with a direct query
python query_tesis.py "¿Qué dice sobre el amparo indirecto?"
```

---

## 📊 Benefits of This Change

### ✅ Solved Problems
- **HNSW index now works**: 1536 < 2000 dimension limit
- **No more dimension errors**: Compatible with pgvector 0.7.4
- **Faster queries**: HNSW index provides efficient similarity search

### 💰 Cost Considerations
- **OpenAI API pricing**: ~$0.02 per 1M tokens
- **For 100 documents**: Typically a few cents
- **Much lighter**: No need for GPU or large model downloads

### ⚡ Performance
- **Embedding generation**: Slightly slower (API calls) but parallelizable
- **Search speed**: Much faster with HNSW index
- **Memory usage**: Significantly reduced (no local model)

---

## 🔍 Verification

Check that everything is working:

```bash
# Verify database schema
PGPASSWORD=admin psql -h localhost -U postgres -d MJ_TesisYJurisprudencias \
  -c "\d tesis_embeddings"

# Should show: embedding | vector(1536)
```

---

## 🆘 Troubleshooting

### "OPENAI_API_KEY not found"
- Make sure you've added your API key to `.env`
- Get your key from: https://platform.openai.com/api-keys

### "Module 'openai' not found"
```bash
pip install openai
```

### "No data found in database"
- This is expected after migration
- Run `python vectorize_tesis.py` to populate

---

## 📝 Technical Details

| Aspect | Before (Qwen3) | After (OpenAI) |
|--------|----------------|----------------|
| Model | Qwen3-Embedding-8B | text-embedding-3-small |
| Dimensions | 8192 | 1536 |
| HNSW Index | ❌ Failed (>2000 limit) | ✅ Works (<2000 limit) |
| Hosting | Self-hosted | API-based |
| Memory | ~16GB+ | Minimal |
| Cost | Free (but needs GPU) | ~$0.02/1M tokens |

---

## 🎉 Summary

Your RAG pipeline is now fully configured with:
- ✅ OpenAI text-embedding-3-small (1536 dimensions)
- ✅ PostgreSQL with pgvector 0.7.4
- ✅ Working HNSW index for fast similarity search
- ✅ All code updated and ready to use

Just add your OpenAI API key and re-vectorize!
