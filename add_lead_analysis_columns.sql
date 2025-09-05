-- Add lead analysis columns to the Conversations table
-- Run this script in your Supabase SQL Editor

-- Add lead_analysis column to store the JSON analysis results
ALTER TABLE "Conversations" 
ADD COLUMN lead_analysis JSONB;

-- Add analyzed_at column to track when the analysis was performed
ALTER TABLE "Conversations" 
ADD COLUMN analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add an index on analyzed_at for better query performance
CREATE INDEX idx_conversations_analyzed_at ON "Conversations" (analyzed_at);

-- Add an index on lead_analysis for querying by lead quality
CREATE INDEX idx_conversations_lead_quality ON "Conversations" 
USING BTREE ((lead_analysis->>'leadQuality'));

-- Optional: Add a comment to document the new columns
COMMENT ON COLUMN "Conversations".lead_analysis IS 'JSON object containing extracted customer information and lead quality assessment';
COMMENT ON COLUMN "Conversations".analyzed_at IS 'Timestamp when the lead analysis was performed';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Conversations' 
AND column_name IN ('lead_analysis', 'analyzed_at');
