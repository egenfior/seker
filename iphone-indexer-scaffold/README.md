# iPhone Indexer Scaffold (Next.js + FastAPI + React Native)

This is a folder-ready monorepo scaffold for:
- **Web**: Next.js (TypeScript)
- **API**: FastAPI (Python)
- **Mobile**: React Native via Expo (TypeScript)
- **Infra**: Docker Compose (Postgres + Redis)

## 1) Prerequisites
- Node.js LTS (18+ recommended)
- pnpm (`npm i -g pnpm`)
- Python 3.11+
- Docker Desktop (for Postgres/Redis)

## 2) Quick start (local)

### A) Start databases (Postgres + Redis)
```bash
cd infra
docker compose up -d
```

### B) API (FastAPI)
```bash
cd apps/api
python -m venv .venv
# mac/linux
source .venv/bin/activate
# windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API health:
- http://localhost:8000/health
- http://localhost:8000/docs

### C) Web (Next.js)
```bash
cd ../../
pnpm install
pnpm dev:web
```

Web:
- http://localhost:3000

### D) Mobile (Expo)
```bash
pnpm dev:mobile
```
Then press:
- `i` for iOS simulator (macOS) or
- `a` for Android emulator, or
- scan QR code with Expo Go.

## 3) Environment variables

### API
- `apps/api/.env` (copy from `.env.example`)

### Web
- `apps/web/.env.local` (copy from `.env.example`)

### Mobile
- `apps/mobile/.env` (copy from `.env.example`)

## 4) What’s included
- FastAPI with:
  - `/health`, `/version`
  - `/listings` (mocked in-memory sample)
  - `/shipping/quote` (rules-engine placeholder)
  - CORS configured for local dev
- Next.js web with:
  - Search page pulling from API
  - Listing detail view
  - Shipping quote UI
- Expo React Native app with:
  - Search → Results → Detail navigation
  - API integration and basic error handling
- Docker Compose:
  - Postgres + Redis (ready for SQLAlchemy/Alembic integration)

## 5) Next steps
1. Replace mocked listings with DB-backed models (SQLAlchemy + Alembic).
2. Add ingestion jobs for Swappa + Amazon (PA-API).
3. Add Redis caching and background job scheduler (RQ/Celery/APS).
4. Add CI/CD (GitHub Actions) and deployment IaC.

