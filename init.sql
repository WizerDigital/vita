CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  whatsapp_id TEXT,
  jid TEXT,
  lid TEXT,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_msgs_tenant_contact ON conversation_messages(tenant_id, contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_embedding ON conversation_messages USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  tenant_id UUID,
  contact_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  is_bot_paused BOOLEAN DEFAULT FALSE,
  bot_paused_at TIMESTAMPTZ,
  UNIQUE(tenant_id, contact_id)
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id TEXT,
  tool_name TEXT NOT NULL,
  tool_args JSONB,
  tool_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vita: Categorias Financeiras
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('expense', 'income')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vita: Registros Financeiros (Transações)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('expense', 'income')) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_installment BOOLEAN DEFAULT FALSE,
  installment_number INTEGER DEFAULT 1,
  total_installments INTEGER DEFAULT 1,
  total_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vita: Lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT NOT NULL,
  description TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  is_executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserindo categorias padrões (Evita duplicação pelo nome e tipo)
INSERT INTO categories (name, type) 
SELECT 'Alimentação', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Alimentação' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Moradia', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Moradia' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Transporte', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transporte' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Saúde', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Saúde' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Lazer', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Lazer' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Educação', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Educação' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Vestuário', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Vestuário' AND type = 'expense');
INSERT INTO categories (name, type) 
SELECT 'Outros', 'expense' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Outros' AND type = 'expense');

INSERT INTO categories (name, type) 
SELECT 'Salário', 'income' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Salário' AND type = 'income');
INSERT INTO categories (name, type) 
SELECT 'Investimentos', 'income' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Investimentos' AND type = 'income');
INSERT INTO categories (name, type) 
SELECT 'Outros', 'income' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Outros' AND type = 'income');

