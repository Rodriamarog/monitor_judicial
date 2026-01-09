#!/usr/bin/env python3
"""Quick search test"""
from db_utils import DatabaseManager
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize
db = DatabaseManager(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 5432)),
    dbname=os.getenv('DB_NAME', 'MJ_TesisYJurisprudencias'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'admin')
)

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Test query
query = 'amparo derechos humanos'
print(f'Testing query: {query}\n')

# Generate embedding
response = client.embeddings.create(model='text-embedding-3-small', input=query, dimensions=256)
query_embedding = response.data[0].embedding

# Search
results = db.search_similar(query_embedding, limit=3, threshold=0.3)

print(f'Found {len(results)} results:\n')
for i, result in enumerate(results, 1):
    print(f'{i}. [ID: {result["id_tesis"]}] Similarity: {result["similarity"]:.3f}')
    print(f'   Rubro: {result["rubro"][:100]}...')
    print(f'   Tipo: {result["tipo_tesis"]} | Año: {result["anio"]}')
    print()
