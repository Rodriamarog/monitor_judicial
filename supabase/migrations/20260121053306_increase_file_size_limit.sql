-- Update the case-files bucket to allow files up to 200MB
UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200MB in bytes (200 * 1024 * 1024)
WHERE id = 'case-files';
