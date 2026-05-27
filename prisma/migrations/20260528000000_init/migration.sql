CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "HandoffStatus" AS ENUM ('NONE', 'REQUESTED', 'ACTIVE', 'RESOLVED');
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'ADMIN');
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'IMAGE', 'UNKNOWN');
CREATE TYPE "KnowledgeSource" AS ENUM ('MANUAL', 'FAQ_SUGGESTION', 'CHAT_DRAFT');
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'ARCHIVED');
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN', 'AGENT');
CREATE TYPE "HandoffEventType" AS ENUM ('REQUESTED', 'ACTIVATED', 'RESOLVED', 'ADMIN_REPLY');
CREATE TYPE "FaqSuggestionStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MediaEventType" AS ENUM ('INBOUND_MEDIA', 'OUTBOUND_IMAGE');

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE whatsapp_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  display_phone_number TEXT,
  access_token_secret_ref TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_phones_business_id_idx ON whatsapp_phones(business_id);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  wa_id TEXT NOT NULL,
  display_name TEXT,
  profile_name TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, wa_id)
);
CREATE INDEX contacts_business_id_idx ON contacts(business_id);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  handoff_status "HandoffStatus" NOT NULL DEFAULT 'NONE',
  handoff_reason TEXT,
  needs_human_pricing BOOLEAN NOT NULL DEFAULT false,
  needs_human_sales BOOLEAN NOT NULL DEFAULT false,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversations_business_id_last_message_at_idx ON conversations(business_id, last_message_at);
CREATE INDEX conversations_contact_id_status_idx ON conversations(contact_id, status);
CREATE INDEX conversations_handoff_status_idx ON conversations(handoff_status);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  direction "MessageDirection" NOT NULL,
  channel_message_id TEXT UNIQUE,
  body TEXT,
  content_type "MessageContentType" NOT NULL DEFAULT 'TEXT',
  media_id TEXT,
  media_url TEXT,
  metadata JSONB,
  contains_sensitive_credential BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_id_created_at_idx ON messages(conversation_id, created_at);
CREATE INDEX messages_contact_id_idx ON messages(contact_id);

CREATE TABLE media_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  type "MediaEventType" NOT NULL,
  provider_media_id TEXT,
  url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX media_events_conversation_id_created_at_idx ON media_events(conversation_id, created_at);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role "AdminRole" NOT NULL DEFAULT 'AGENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source "KnowledgeSource" NOT NULL DEFAULT 'MANUAL',
  status "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  internal_notes TEXT,
  created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_documents_business_id_status_idx ON knowledge_documents(business_id, status);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_chunks_business_id_idx ON knowledge_chunks(business_id);
CREATE INDEX knowledge_chunks_document_id_idx ON knowledge_chunks(document_id);
CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE media_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  aliases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, key)
);
CREATE INDEX media_catalog_items_business_id_idx ON media_catalog_items(business_id);

CREATE TABLE handoff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  type "HandoffEventType" NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX handoff_events_conversation_id_created_at_idx ON handoff_events(conversation_id, created_at);

CREATE TABLE sensitive_credential_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  credential_type TEXT NOT NULL,
  masked_preview TEXT NOT NULL,
  encrypted_payload TEXT,
  delete_after TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sensitive_credential_events_delete_after_deleted_at_idx ON sensitive_credential_events(delete_after, deleted_at);

CREATE TABLE faq_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  evidence_message_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status "FaqSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  approved_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX faq_suggestions_business_id_status_idx ON faq_suggestions(business_id, status);
