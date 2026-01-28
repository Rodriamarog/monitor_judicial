-- After successful migration, archive the old tribunal_documents table
-- Keep tribunal_credentials and tribunal_sync_log for audit purposes

-- Rename for archival (safer than dropping)
ALTER TABLE tribunal_documents RENAME TO tribunal_documents_archived;

-- Add comment
COMMENT ON TABLE tribunal_documents_archived IS
  'Archived 2026-01-28. Data migrated to case_files with source=tribunal_electronico.
   Kept for backup purposes. Can be dropped after verification period.';
