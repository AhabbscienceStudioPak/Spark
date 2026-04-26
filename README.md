# Generative City Wallet

AI-powered mobile wallet that detects real-time context (weather, location, events, merchant demand) and dynamically generates personalized, time-sensitive local offers. Built for the DSV-Gruppe hackathon challenge. Submitted for the Hack-Nation 2026.

---

## Team Member

```
* Adeel Mukhtar
* M. Ahabb Sheraz

## Architecture

```
Consumer Mobile App (React Native/Expo)
        │ HTTPS
        ▼
API Gateway :3000  ←── JWT auth, rate limiting, routing
        │
        ├── Context Service :3001  ← Weather, Events, Payone, Holidays
        ├── Offer Service   :3002  ← Ollama LLM, Rule Engine, Analytics
        ├── Checkout Service:3003  ← Tokens, QR, Redemption, GDPR
        └── Notification    :3004  ← Expo Push

Merchant Dashboard (Next.js) → same API Gateway

Infrastructure: PostgreSQL + Redis + Ollama + Payone Simulator
```

---

## Prerequisites

- **Docker Desktop** (includes Docker Compose)
- **Node.js 20+** (for mobile app and merchant dashboard)
- **Python 3.11+** (only if running services locally without Docker)

---

## Quick Start — Full Stack

### Step 1 — Clone and configure

```bash
cd generative-city-wallet

# .env is already configured with your API keys
# Verify it exists:
cat .env
```

### Step 2 — Start all backend services

```bash
docker-compose up -d
```

This starts: PostgreSQL, Redis, Ollama, Payone Simulator, API Gateway, Context Service, Offer Service, Checkout Service, Notification Service.

Wait ~30 seconds for all services to be healthy:

```bash
docker-compose ps
# All services should show "healthy" or "running"
```

### Step 3 — Pull the LLM model (first time only, ~1GB)

```bash
docker-compose exec ollama ollama pull qwen3:1.7b
```

### Step 4 — Run the smoke test to verify everything works

```bash
bash scripts/smoke-test.sh
```

You should see all 12 checks pass, including the full journey:
`Auth → Context → Offer → Accept → Validate → Redeem`

### Step 5 — Start the merchant dashboard

```bash
cd apps/merchant-web
npm install --legacy-peer-deps
npm run dev
```

Open **http://localhost:4000** (port 4000 — avoids conflict with context-service on 3001)

Login with: `merchant@demo.com` / `demo1234`

### Step 6 — Start the mobile app

```bash
cd apps/mobile
npm install --legacy-peer-deps
npx expo start
```

- Scan the QR code with **Expo Go** on your phone
- Or press `a` for Android emulator / `i` for iOS simulator

Login with: `consumer@demo.com` / `demo1234`

> **Note:** Your phone must be on the same WiFi as your PC. The API URL is pre-configured to `http://192.168.10.5:3000`. If your IP changes, update `EXPO_PUBLIC_API_URL` in `.env` and restart Expo.

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `consumer@demo.com` | `demo1234` | Consumer |
| `merchant@demo.com` | `demo1234` | Merchant (Café Müller) |
| `admin@demo.com` | `admin1234` | Admin |

---

## Demo Mode (Hackathon Presentation)

To trigger the "Mia scenario" (cold + quiet café + lunch) regardless of real conditions:

```bash
# Get a token first
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer@demo.com","password":"demo1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Trigger demo context
curl -s -X POST http://localhost:3000/api/v1/context/demo \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

This returns a pre-built context: 11°C + overcast + Tuesday lunch + Café Müller at 25% typical traffic → relevance score 90.

---

## API Reference

All endpoints are documented at **http://localhost:3000/docs** (Swagger UI, auto-generated).

### Auth endpoints (no token required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login → access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `GET` | `/auth/me` | Current user profile |

### Protected endpoints (Bearer token required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/context/aggregate` | Build context state from GPS |
| `POST` | `/api/v1/context/demo` | Demo context (Mia scenario) |
| `POST` | `/api/v1/offers/generate` | Generate offers from context |
| `PATCH` | `/api/v1/offers/{id}/approve` | Merchant approves offer |
| `PATCH` | `/api/v1/offers/{id}/reject` | Merchant rejects offer |
| `POST` | `/api/v1/checkout/accept` | Consumer accepts → token + QR |
| `POST` | `/api/v1/validate/token` | Merchant validates QR token |
| `POST` | `/api/v1/checkout/complete` | Complete simulated checkout |
| `GET` | `/api/v1/merchants/{id}/performance` | Merchant KPIs |
| `GET` | `/api/v1/analytics/merchants/{id}/breakdown` | Time-of-day/DOW breakdown |
| `GET` | `/api/v1/analytics/merchants/{id}/decline-insights` | Decline patterns |
| `GET` | `/api/v1/analytics/system/metrics` | System health metrics |
| `GET` | `/api/v1/analytics/system/alerts` | Active system alerts |
| `GET` | `/api/v1/gdpr/export/{consumer_id}` | GDPR data export |
| `DELETE` | `/api/v1/gdpr/delete/{consumer_id}` | GDPR account deletion |

---

## External APIs — All Free

| API | Purpose | Key Required? |
|-----|---------|--------------|
| [Open-Meteo](https://open-meteo.com) | Weather | ❌ None |
| [OSM Overpass](https://overpass-api.de) | Event venues | ❌ None |
| [Nager.Date](https://date.nager.at) | Public holidays | ❌ None |
| [Eventbrite](https://eventbrite.com) | Real events | ✅ Configured in `.env` |
| [OpenWeatherMap](https://openweathermap.org) | Weather (alt) | ✅ Configured in `.env` |
| Ollama + qwen3:1.7b | LLM inference | ❌ Local Docker |
| Payone Simulator | Transaction density | ❌ Built-in |
| [Expo Push](https://expo.dev) | Push notifications | ✅ Free account |

---

## Running a Single Service Locally (without Docker)

```bash
cd services/offer-service
pip install -r requirements.txt
pip install ../../packages/shared-utils/

# Set env vars
export DATABASE_URL="postgresql://gcw_user:gcw_dev_password_2024@localhost:5432/gcw"
export REDIS_URL="redis://localhost:6379"
export OLLAMA_URL="http://localhost:11434"
export OLLAMA_MODEL="qwen3:1.7b"

uvicorn app.main:app --reload --port 3002
# Swagger docs: http://localhost:3002/docs
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) + TypeScript |
| Merchant Dashboard | Next.js 14 + TypeScript |
| Backend (all services) | Python 3.11 + FastAPI + Uvicorn |
| Auth | JWT (HS256) + bcrypt + refresh token rotation |
| LLM | Ollama + qwen3:1.7b (local, GDPR-compliant) |
| Database | PostgreSQL 16 (asyncpg) |
| Cache | Redis 7 |
| Infrastructure | Docker Compose |
| CI/CD | GitHub Actions |

---

## Project Structure

```
generative-city-wallet/
├── apps/
│   ├── mobile/              # React Native consumer app
│   └── merchant-web/        # Next.js merchant dashboard
├── services/
│   ├── api-gateway/         # Auth, rate limiting, routing
│   ├── context-service/     # Weather, events, Payone, holidays
│   ├── offer-service/       # LLM, rule engine, analytics
│   ├── checkout-service/    # Tokens, QR, redemption, GDPR
│   └── notification-service/# Expo push notifications
├── packages/
│   ├── shared-types/        # TypeScript types + Python Pydantic models
│   └── shared-utils/        # Geo, time, token, validation utilities
├── infrastructure/
│   └── docker/              # Dockerfiles + Payone simulator
├── config/
│   └── cities/              # Stuttgart + Berlin YAML configs
├── scripts/
│   ├── db-init.sql          # Database schema
│   ├── db-seed.sql          # Demo data + users
│   └── smoke-test.sh        # End-to-end verification
└── .env                     # Your API keys (already configured)
```

---

## Troubleshooting

**Services not starting?**
```bash
docker-compose logs api-gateway
docker-compose logs offer-service
```

**Database not initialized?**
```bash
docker-compose down -v   # removes volumes
docker-compose up -d     # recreates with fresh schema + seed data
```

**Ollama model not found?**
```bash
docker-compose exec ollama ollama list
docker-compose exec ollama ollama pull qwen3:1.7b
```

**401 Unauthorized on all requests?**
```bash
# Get a fresh token
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer@demo.com","password":"demo1234"}'
```

**Smoke test fails on offer generation?**
The Payone simulator needs to mark at least one merchant as low-demand.
Wait 10 minutes or restart the simulator to trigger a new rotation:
```bash
docker-compose restart payone-simulator
```
