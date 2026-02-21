-- Add optional note to interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS note text;
