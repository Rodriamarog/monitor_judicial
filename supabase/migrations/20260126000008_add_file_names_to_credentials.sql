-- Add columns to store original filenames
ALTER TABLE tribunal_credentials
ADD COLUMN key_file_name TEXT,
ADD COLUMN cer_file_name TEXT;
