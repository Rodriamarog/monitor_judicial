-- Create storage bucket for case files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-files',
  'case-files',
  false, -- Private bucket
  52428800, -- 50MB limit per file
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
);

-- Create table to track file uploads
CREATE TABLE case_files (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE case_files IS 'Tracks files uploaded for monitored cases';
COMMENT ON COLUMN case_files.case_id IS 'Reference to the monitored case';
COMMENT ON COLUMN case_files.user_id IS 'User who owns this file';
COMMENT ON COLUMN case_files.file_name IS 'Original filename';
COMMENT ON COLUMN case_files.file_path IS 'Storage path in bucket (user_id/case_id/filename)';
COMMENT ON COLUMN case_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN case_files.mime_type IS 'MIME type of the file';

-- Create indexes
CREATE INDEX idx_case_files_case_id ON case_files(case_id);
CREATE INDEX idx_case_files_user_id ON case_files(user_id);
CREATE INDEX idx_case_files_uploaded_at ON case_files(uploaded_at);

-- Enable RLS
ALTER TABLE case_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_files table
CREATE POLICY "Users can view their own case files"
  ON case_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files to their own cases"
  ON case_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case files"
  ON case_files FOR DELETE
  USING (auth.uid() = user_id);

-- Storage RLS Policies for case-files bucket
-- Policy: Users can only upload to their own folder (user_id/case_id/*)
CREATE POLICY "Users can upload files to their own cases"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'case-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can only view their own files
CREATE POLICY "Users can view their own case files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'case-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can only delete their own files
CREATE POLICY "Users can delete their own case files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'case-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can only update their own files
CREATE POLICY "Users can update their own case files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'case-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
