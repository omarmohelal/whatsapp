ALTER TABLE conversations ADD COLUMN IF NOT EXISTS needs_human BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_intent TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS detected_game TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_asked_question TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent TEXT;

ALTER TABLE media_catalog_items ADD COLUMN IF NOT EXISTS game TEXT;
ALTER TABLE media_catalog_items ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE media_catalog_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_methods_business_id_is_active_idx ON payment_methods(business_id, is_active);

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, key)
);
CREATE INDEX IF NOT EXISTS admin_settings_business_id_idx ON admin_settings(business_id);

DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;
DELETE FROM knowledge_chunks;
ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(768) USING NULL;
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
