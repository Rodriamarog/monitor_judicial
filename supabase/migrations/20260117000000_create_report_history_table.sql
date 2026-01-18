-- Create report_history table to store user-generated reports
CREATE TABLE IF NOT EXISTS report_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL DEFAULT 'antecedentes_legales',
    search_params JSONB NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    file_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX idx_report_history_user_id ON report_history(user_id);

-- Create index on created_at for sorting
CREATE INDEX idx_report_history_created_at ON report_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own reports
CREATE POLICY "Users can view their own report history"
    ON report_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own reports
CREATE POLICY "Users can create their own reports"
    ON report_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
    ON report_history
    FOR DELETE
    USING (auth.uid() = user_id);
