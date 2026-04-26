# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Consumer Device                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Native App (Expo)                                 │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ Context     │  │ Offer Cards  │  │ QR Checkout    │  │   │
│  │  │ Store       │  │ (GenUI)      │  │ (Token)        │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ Privacy Layer: SQLite (on-device) + SecureStore     │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │ HTTPS/TLS 1.3                    │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        API Gateway :3000                        │
│              Auth (JWT) · Rate Limiting · Routing               │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────────┐
│  Context    │ │  Offer     │ │ Checkout  │ │ Notification  │
│  Service    │ │  Service   │ │ Service   │ │ Service       │
│  :3001      │ │  :3002     │ │ :3003     │ │ :3004         │
│             │ │            │ │           │ │               │
│ Weather API │ │ Ollama LLM │ │ Token Gen │ │ Expo Push     │
│ Events API  │ │ Rule Engine│ │ QR Codes  │ │               │
│ Payone Sim  │ │            │ │           │ │               │
└──────┬──────┘ └─────┬──────┘ └────┬──────┘ └───────────────┘
       │              │              │
       └──────────────┼──────────────┘
                      │
              ┌───────▼────────┐
              │   PostgreSQL   │
              │   Redis Cache  │
              └────────────────┘
```

## Data Flow: Offer Generation

```
1. Consumer opens app
2. Mobile requests location permission
3. Context Service aggregates:
   - Weather (OpenWeatherMap / DWD)
   - Events (Eventbrite)
   - Transaction density (Payone simulator)
   - Time + location signals
4. CompositeContextState built with relevance score
5. Offer Service receives context state
6. Rule Engine selects applicable campaign rules
7. Ollama (on-device or server) generates:
   - Offer content (headline, description, CTA)
   - Visual design parameters
8. Discount calculated (never exceeds merchant max)
9. Offer stored in PostgreSQL
10. Notification Service pushes to consumer device
11. Consumer sees OfferCard (3-second comprehension design)
12. Consumer accepts → Token generated → QR displayed
13. Merchant scans QR → Validation → Simulated checkout
14. Redemption recorded → Cashback credited (optional)
```

## Privacy Architecture

- Raw GPS coordinates: processed on-device only
- Movement patterns: never leave the device
- Behavioral data: stored in SQLite on-device
- Upstream: only abstract IntentSignal (e.g., "warm_beverages")
- GDPR: explicit consent gate, download/delete data features
- On-device LLM: Ollama with Phi-3/Gemma for local inference

## Configuration-Driven Design

City-specific parameters live in `config/cities/<cityCode>.yaml`:
- Geo-fence radius
- Supported merchant categories
- Weather data source (openweathermap vs dwd)
- Event data source
- Seed merchants

No code changes required to add a new city.
