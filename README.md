# Sekar Refurbished Apple Indexer

A Next.js (Pages Router) MVP that indexes **refurbished Apple devices on Amazon.com**, including iPhones and Apple Watches, using the **Amazon Product Advertising API (PA-API)** and displays an **estimated landed cost** for:
- Ghana (GH)
- Côte d’Ivoire (CI)
- Senegal (SN)

## 1) Quick start

1. Install deps:
```bash
npm install
```

2. Create `.env.local` using `.env.example`:
```bash
cp .env.example .env.local
```

3. Run dev server:
```bash
npm run dev
```

Open http://localhost:3000

## 2) Notes / disclaimers

- This project intentionally avoids scraping Amazon. Use PA-API only.
- Landed-cost is **estimate-only**. Replace the duty/VAT/handling logic with your validated rules.
- Currency conversion uses simple FX placeholders. Update via:
  - `.env.local` FX_* variables, or
  - POST `/api/fx` (see below).

## 3) API endpoints

- `GET /api/search?q=apple%20watch&page=1`
  - Returns normalized refurbished Apple device items.
  - If `DATABASE_URL` is configured, also stores indexed items, search runs, and price history.

- `GET /api/items`
  - Returns stored indexed items when Postgres storage is configured.

- `GET /api/history?asin=B0MCKGH001`
  - Returns stored price history for one item when Postgres storage is configured.

- `POST /api/users/register`
  - Creates a user account and returns a unique `userId`.

- `POST /api/users/login`
  - Signs in an existing user.

- `GET /api/fx`
  - Returns current FX rates used by the UI.

- `POST /api/fx`
  - Updates in-memory FX rates for the running process (dev/demo).
  - For production, store rates in a DB or KV store.

## 4) Production hardening (recommended)

- Add scheduled refresh jobs for common queries.
- Add shipping estimator for forwarder mode (weight bands).
- Add i18n for French (project includes EN/FR toggle).

## 5) Database storage

Sekar supports persistent Postgres storage. Set:
```bash
DATABASE_URL=postgres://user:password@host:5432/dbname
DATABASE_SSL=true
```

Tables are created automatically on the first `/api/search` request. The equivalent schema is in `db/schema.sql`.

Stored data:
- latest indexed item data by `source + asin`
- search runs
- price history observations
- app users with generated `usr_...` user IDs and hashed passwords

## 6) Deploy

### Vercel

1. Push this project to a GitHub repository.
2. In Vercel, import the repository as a Next.js project.
3. Set the production environment variables:
```bash
USE_MOCK_AMAZON=false
AMAZON_ACCESS_KEY=your_paapi_access_key
AMAZON_SECRET_KEY=your_paapi_secret_key
AMAZON_PARTNER_TAG=your_associates_tag
AMAZON_MARKETPLACE=www.amazon.com
FX_USD_GHS=15
FX_USD_XOF=650
FX_USD_XAF=650
DATABASE_URL=your_postgres_connection_string
DATABASE_SSL=true
```
4. Use the default build command:
```bash
npm run build
```
5. Deploy.

For a demo deployment without Amazon PA-API credentials, set `USE_MOCK_AMAZON=true`.

### Other Node hosts

Use Node `>=20.9.0`, then run:
```bash
npm install
npm run build
npm run start
```

Set the same environment variables shown above in the host's dashboard.

### AWS

Recommended AWS paths:

- **AWS Amplify Hosting**: connect the GitHub repository. The included `amplify.yml` runs `npm ci` and `npm run build`.
- **AWS App Runner / ECS**: build from the included `Dockerfile`.
- **Elastic Beanstalk Node.js**: upload `sekar-aws-deployment.zip`; Beanstalk will run `npm install`, `npm run build`, and `npm run start` when configured as a Node app.

Set these environment variables in AWS, not in source control:
```bash
USE_MOCK_AMAZON=false
AMAZON_ACCESS_KEY=your_paapi_access_key
AMAZON_SECRET_KEY=your_paapi_secret_key
AMAZON_PARTNER_TAG=genf0105-20
AMAZON_MARKETPLACE=www.amazon.com
FX_USD_GHS=15
FX_USD_XOF=650
FX_USD_XAF=650
```

For an AWS demo without PA-API credentials, use:
```bash
USE_MOCK_AMAZON=true
```
