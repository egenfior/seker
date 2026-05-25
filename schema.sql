CREATE TABLE IF NOT EXISTS indexed_items (
  source TEXT NOT NULL,
  asin TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  image TEXT,
  price_usd NUMERIC(12, 2),
  condition TEXT,
  merchant TEXT,
  is_amazon_fulfilled BOOLEAN,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, asin)
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  asin TEXT NOT NULL,
  price_usd NUMERIC(12, 2),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_history_item_idx
  ON price_history (source, asin, observed_at DESC);

CREATE TABLE IF NOT EXISTS search_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  query TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  country TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
