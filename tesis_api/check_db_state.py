#!/usr/bin/env python3
"""Check current state of tesis database"""

import os
from supabase import create_client

# Get from environment (no dotenv needed if already set)
supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    print("Please set environment variables or run from project root with .env file")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

# Get total count and highest ID
result = supabase.table('tesis_documents').select('id_tesis', count='exact').order('id_tesis', desc=True).limit(1).execute()
print(f"Total tesis in database: {result.count}")
if result.data:
    print(f"Highest ID in database: {result.data[0]['id_tesis']}")

# Check when last tesis was inserted
result2 = supabase.table('tesis_documents').select('id_tesis,created_at').order('created_at', desc=True).limit(1).execute()
if result2.data:
    print(f"Last inserted: ID {result2.data[0]['id_tesis']} at {result2.data[0]['created_at']}")

# Check embeddings count
emb_result = supabase.table('tesis_embeddings').select('id', count='exact').limit(1).execute()
print(f"\nTotal embeddings in database: {emb_result.count}")

# Check automation runs
runs = supabase.table('tesis_automation_runs').select('*').order('run_at', desc=True).limit(5).execute()
print(f"\nRecent automation runs:")
for run in runs.data:
    print(f"  {run['run_at']}: {run['status']} - {run['new_tesis_count']} tesis, {run['new_embeddings_count']} embeddings")
