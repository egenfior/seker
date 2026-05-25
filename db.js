import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

let pool = null;
let schemaReady = false;

export function isDatabaseEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isDatabaseEnabled()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

export async function ensureSchema() {
  const db = getPool();
  if (!db || schemaReady) return false;

  await db.query(`
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
  `);

  schemaReady = true;
  return true;
}

export async function createUser({ fullName, email, phone, country, password }) {
  const db = getPool();
  if (!db) {
    return {
      enabled: false,
      user: {
        userId: `demo_${crypto.randomUUID()}`,
        fullName,
        email,
        phone,
        country
      }
    };
  }

  await ensureSchema();
  const userId = `usr_${crypto.randomUUID()}`;
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, passwordSalt);

  try {
    const result = await db.query(
      `
      INSERT INTO app_users (user_id, full_name, email, phone, country, password_hash, password_salt)
      VALUES ($1, $2, LOWER($3), $4, $5, $6, $7)
      RETURNING user_id, full_name, email, phone, country, created_at
      `,
      [userId, fullName, email, phone || null, country || null, passwordHash, passwordSalt]
    );

    return { enabled: true, user: mapUser(result.rows[0]) };
  } catch (error) {
    if (error.code === "23505") {
      const duplicateError = new Error("An account with this email already exists");
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const db = getPool();
  if (!db) {
    return {
      enabled: false,
      user: {
        userId: `demo_${crypto.randomUUID()}`,
        email
      }
    };
  }

  await ensureSchema();
  const result = await db.query(
    `
    SELECT user_id, full_name, email, phone, country, password_hash, password_salt, created_at
    FROM app_users
    WHERE email = LOWER($1)
    `,
    [email]
  );

  const row = result.rows[0];
  if (!row || hashPassword(password, row.password_salt) !== row.password_hash) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  await db.query("UPDATE app_users SET last_login_at = NOW() WHERE user_id = $1", [row.user_id]);
  return { enabled: true, user: mapUser(row) };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
}

function mapUser(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    createdAt: row.created_at
  };
}

export async function recordSearchResults({ source = "amazon", query, page = 1, items = [] }) {
  const db = getPool();
  if (!db) return { enabled: false, savedItems: 0 };

  await ensureSchema();

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO search_runs (source, query, page, item_count) VALUES ($1, $2, $3, $4)",
      [source, query || "", page, items.length]
    );

    for (const item of items) {
      if (!item?.asin) continue;

      await client.query(
        `
        INSERT INTO indexed_items (
          source, asin, title, url, image, price_usd, condition, merchant,
          is_amazon_fulfilled, raw, last_seen_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
        ON CONFLICT (source, asin)
        DO UPDATE SET
          title = EXCLUDED.title,
          url = EXCLUDED.url,
          image = EXCLUDED.image,
          price_usd = EXCLUDED.price_usd,
          condition = EXCLUDED.condition,
          merchant = EXCLUDED.merchant,
          is_amazon_fulfilled = EXCLUDED.is_amazon_fulfilled,
          raw = EXCLUDED.raw,
          last_seen_at = NOW()
        `,
        [
          source,
          item.asin,
          item.title || "Untitled Apple listing",
          item.url || null,
          item.image || null,
          typeof item.price === "number" ? item.price : null,
          item.condition || null,
          item.merchant || null,
          item.isAmazonFulfilled ?? null,
          JSON.stringify(item)
        ]
      );

      if (typeof item.price === "number") {
        await client.query(
          "INSERT INTO price_history (source, asin, price_usd) VALUES ($1, $2, $3)",
          [source, item.asin, item.price]
        );
      }
    }

    await client.query("COMMIT");
    return { enabled: true, savedItems: items.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getIndexedItems({ source = "amazon", limit = 100 } = {}) {
  const db = getPool();
  if (!db) return { enabled: false, items: [] };

  await ensureSchema();
  const result = await db.query(
    `
    SELECT source, asin, title, url, image, price_usd, condition, merchant,
      is_amazon_fulfilled, first_seen_at, last_seen_at
    FROM indexed_items
    WHERE source = $1
    ORDER BY last_seen_at DESC
    LIMIT $2
    `,
    [source, limit]
  );

  return {
    enabled: true,
    items: result.rows.map((row) => ({
      source: row.source,
      asin: row.asin,
      title: row.title,
      url: row.url,
      image: row.image,
      price: row.price_usd == null ? null : Number(row.price_usd),
      condition: row.condition,
      merchant: row.merchant,
      isAmazonFulfilled: row.is_amazon_fulfilled,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at
    }))
  };
}

export async function getPriceHistory({ source = "amazon", asin, limit = 30 }) {
  const db = getPool();
  if (!db || !asin) return { enabled: Boolean(db), history: [] };

  await ensureSchema();
  const result = await db.query(
    `
    SELECT price_usd, observed_at
    FROM price_history
    WHERE source = $1 AND asin = $2
    ORDER BY observed_at DESC
    LIMIT $3
    `,
    [source, asin, limit]
  );

  return {
    enabled: true,
    history: result.rows.map((row) => ({
      price: row.price_usd == null ? null : Number(row.price_usd),
      observedAt: row.observed_at
    }))
  };
}
