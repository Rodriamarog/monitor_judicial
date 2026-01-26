-- Create Tribunal Electrónico tables with Vault integration
-- This migration creates tables for storing tribunal credentials, documents, and sync logs

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tribunal_credentials table
-- Stores metadata and Vault secret IDs (not actual passwords)
CREATE TABLE IF NOT EXISTS tribunal_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Vault secret IDs (not actual credentials)
  vault_password_id UUID NOT NULL,
  vault_key_file_id UUID NOT NULL,
  vault_cer_file_id UUID NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'failed', 'inactive')),
  validation_error TEXT,
  last_validation_at TIMESTAMPTZ,

  -- Watermark for forward-only tracking
  last_document_numero INTEGER NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One set of credentials per user
  UNIQUE(user_id)
);

-- Create tribunal_documents table
-- Stores document metadata, PDF paths, AI summaries, notification status
CREATE TABLE IF NOT EXISTS tribunal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document metadata from scraper
  numero INTEGER NOT NULL,
  expediente TEXT NOT NULL,
  juzgado TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE,

  -- PDF storage
  pdf_path TEXT, -- Path in Supabase Storage: user_id/tribunal/YYYY-MM-DD/filename.pdf
  pdf_size_bytes BIGINT,

  -- AI summary
  ai_summary TEXT,
  summary_generated_at TIMESTAMPTZ,

  -- Notification status
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_status TEXT,
  whatsapp_error TEXT,

  -- User interaction
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate documents per user
  UNIQUE(user_id, numero)
);

-- Create tribunal_sync_log table
-- Logs each sync operation for monitoring
CREATE TABLE IF NOT EXISTS tribunal_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Sync metadata
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Results
  new_documents_found INTEGER DEFAULT 0,
  documents_processed INTEGER DEFAULT 0,
  documents_failed INTEGER DEFAULT 0,
  error_message TEXT,

  -- Watermark tracking
  previous_watermark INTEGER,
  new_watermark INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tribunal_credentials_user_id ON tribunal_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_tribunal_credentials_status ON tribunal_credentials(status);

CREATE INDEX IF NOT EXISTS idx_tribunal_documents_user_id ON tribunal_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_numero ON tribunal_documents(numero);
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_created_at ON tribunal_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_read_at ON tribunal_documents(read_at);

CREATE INDEX IF NOT EXISTS idx_tribunal_sync_log_user_id ON tribunal_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tribunal_sync_log_started_at ON tribunal_sync_log(started_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE tribunal_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribunal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribunal_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tribunal_credentials
-- Users can only access their own credentials
CREATE POLICY "Users can view their own tribunal credentials"
  ON tribunal_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tribunal credentials"
  ON tribunal_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tribunal credentials"
  ON tribunal_credentials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tribunal credentials"
  ON tribunal_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tribunal_documents
-- Users can only access their own documents
CREATE POLICY "Users can view their own tribunal documents"
  ON tribunal_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tribunal documents"
  ON tribunal_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tribunal documents"
  ON tribunal_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tribunal documents"
  ON tribunal_documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tribunal_sync_log
-- Users can only view their own sync logs
CREATE POLICY "Users can view their own tribunal sync logs"
  ON tribunal_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tribunal sync logs"
  ON tribunal_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for tribunal documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tribunal-documents',
  'tribunal-documents',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for tribunal-documents storage bucket
-- Users can only access their own documents in the bucket
CREATE POLICY "Users can view their own tribunal document files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tribunal-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own tribunal document files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tribunal-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own tribunal document files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tribunal-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'tribunal-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own tribunal document files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tribunal-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_tribunal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER tribunal_credentials_updated_at
  BEFORE UPDATE ON tribunal_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_tribunal_updated_at();

CREATE TRIGGER tribunal_documents_updated_at
  BEFORE UPDATE ON tribunal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_tribunal_updated_at();
