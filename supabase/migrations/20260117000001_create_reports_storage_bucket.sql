-- Create storage bucket for PDF reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the reports bucket
CREATE POLICY "Users can upload their own reports"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'reports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to read their own reports
CREATE POLICY "Users can view their own reports"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'reports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own reports
CREATE POLICY "Users can delete their own reports"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'reports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
