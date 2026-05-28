ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pending_fields JSONB;
