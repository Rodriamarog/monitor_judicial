-- Add PDF storage and AI summary fields to tribunal_documents

ALTER TABLE tribunal_documents
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS pdf_downloaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'downloading', 'summarizing', 'completed', 'failed'));

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_processing_status
ON tribunal_documents(processing_status);

CREATE INDEX IF NOT EXISTS idx_tribunal_documents_pdf_path
ON tribunal_documents(pdf_storage_path) WHERE pdf_storage_path IS NOT NULL;

-- Create storage bucket for tribunal PDFs (will be created via Supabase Dashboard or API)
-- Bucket name: tribunal-documents
-- Access: Authenticated users can read their own documents
