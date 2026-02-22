# Environment Variables & APIs

## Environment Variables (set in EasyPanel, NOT in .env)
```
DATABASE_URL          — PostgreSQL connection string
AUTH_SECRET           — NextAuth secret (MUST be in auth.ts AND auth-middleware.ts)
ANYTHING_LLM_URL     — AnythingLLM base URL (https://basheer-anything-llm.prd42b.easypanel.host)
ANYTHING_LLM_KEY     — AnythingLLM API key
BROWSERLESS_URL       — Browserless Chrome URL (internal Docker first, WSS fallback)
NEXT_PUBLIC_BASE_URL  — App base URL
NODEMAILER_EMAIL      — Email for sending proposals
NODEMAILER_PW         — Email password
SENTRY_DSN            — Sentry error tracking
```

## API Routes (40+)
Key endpoints:
```
POST /api/workspaces/create          — Create workspace + initial proposal
POST /api/proposals/generate         — Generate PDF via Browserless
POST /api/proposals/save             — Auto-save proposal data
POST /api/rfp/analyze                — Full RFP analysis pipeline (SSE streaming)
POST /api/rfp/pipeline/extraction-excel     — Export extracted specs as .xlsx
POST /api/rfp/pipeline/subcontractor-excel  — Generate subcontractor quote request
POST /api/rfp/pipeline/import-quote         — Import subcontractor response
POST /api/rfp/pipeline/pricing-preview      — Get pricing for extracted displays
POST /api/rfp/pipeline/rate-card-excel      — 3-sheet rate card Excel
POST /api/rfp/pipeline/scoping-workbook     — Full 10+ sheet scoping workbook
POST /api/chat/kimi                  — AI chat endpoint
POST /api/estimator/*                — Estimator tool endpoints
GET  /api/proposals/[id]             — Load proposal
```

## AnythingLLM API
- Base: `ANYTHING_LLM_URL/api/v1`
- Auth: `Authorization: Bearer {ANYTHING_LLM_KEY}`
- Used for: workspace provisioning, document embedding, RAG chat
- Key: `7YMK7HD-B1KMNBZ-PPQ3DSV-9RGQDT7`

## Prisma Schema
Key models:
- `Workspace` — top-level container
- `Proposal` — proposal with screens, line items, settings
- `ScreenConfig` — individual LED display configs
- `LineItem` — pricing line items per screen
- `RfpAnalysis` — RFP extraction results (screens, requirements, project as JSON)
- `User` — auth users
