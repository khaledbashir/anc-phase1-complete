# ANC Proposal Engine — Source of Truth ✅

> Concise, single-source documentation for maintainers, contributors, and infra teams.

---

## Project — What & Why 🎯
- **Name:** ANC Proposal Engine (codebase: `anc-proposal-engine`, originally `invoify`).
- **Purpose:** Build, estimate, preview, export, and send professional proposals (originally proposals) focused on sports LED-screen projects. Includes multi-screen estimations, line-item breakdowns, PDF generation, email sending, and AI-driven commands (Commander/AnythingLLM).

---

## Tech Stack & Key Libraries 🔧
- **Framework:** Next.js (App Router, React Server + Client components)
- **Language:** TypeScript
- **UI:** TailwindCSS + Shadcn (Radix primitives)
- **Forms & Validation:** react-hook-form + zod
- **DB:** Prisma (Postgres DB via `DATABASE_URL`) + Prisma Client
- **PDF:** Puppeteer / `puppeteer-core` with `@sparticuz/chromium` for headless Chrome
- **Email:** nodemailer
- **Other:** lodash-style utilities, number-to-words, xlsx/xml2js/json2csv for exports
- **LLM Integration:** AnythingLLM (via `/api/command` route)

Major deps live in `package.json`.

---

## Architecture Overview 🏗️
- **Frontend**: Next.js App using the App Router. Pages/components under `app/` and `app/[locale]/` for i18n.
- **State & Forms**: Entire proposal workflow is driven by a large RHF (React Hook Form) form (types in `types.ts`, schema in `lib/schemas.ts`) and global `ProposalContext` for cross-component actions (save, export, generate PDF, command application).
- **Server/API**: App routes in `app/api/*` (e.g., `command`, `proposals/create`, `proposal/generate`, `proposal/send`, `proposal/export`).
- **Services**: Server-side business logic (PDF generation, export, email send) extracted under `services/proposal/server/*`.
- **DB**: Prisma schema at `prisma/schema.prisma` models Workspace, User, Proposal, ScreenConfig, CostLineItem.
- **Estimator**: Encapsulated in `lib/estimator.ts` with production formulas and a legacy-compatible estimator for ANC Excel logic.

---

## Key Features (User-facing) ✨
- Wizard-style Proposal Builder with live preview
- Multi-screen estimator: calculate LED, structure, install, power costs per screen
- Live PDF preview and export (PDF generation via server APIs)
- Send proposal PDF via email (Nodemailer)
- Export proposal data as JSON, CSV, XML, XLSX
- Save proposals in localStorage + basic workspace & proposal persistence (server)
- Commander / LLM chat: natural language commands that can mutate the form (ADD_SCREEN, SET_MARGIN, UPDATE_CLIENT, etc.)
- Templates: `app/components/templates/*` (ANCLOI and dynamic templates)
- I18n support (next-intl and `app/[locale]`)

---

## How it works — End-to-end flows 🔁

1. Proposal authoring
   - UI: `app/components/ProposalPage.tsx` renders toolbar, `ProposalForm`, and `PdfViewer`.
   - Form: RHF + `lib/schemas.ts` for validation and `types.ts` for types.

2. Estimation
   - Implemented in `lib/estimator.ts`:
     - `calculateScreenPrice(width, height, pitch, isOutdoor)` returns LED, structure, install, power, total.
     - `calculateProposalTotal(screens)` aggregates across screens.
     - ANC-specific extended estimator (feet/mm inputs, line-item breakdown) is included for exportable breakdowns.

3. Generate PDF
   - Client requests PDF generation through `GENERATE_PDF_API` constant (currently `/api/proposals/generate`).
   - Server renders a template (e.g., `app/components/templates/proposal-pdf/*`) and uses Puppeteer/Chromium to render HTML→PDF.
   - PDF returned to client and saved to `ProposalContext` as `proposalPdf` (Blob) for preview/download.

4. Send PDF via Email
   - Uses `SEND_PDF_API` (server route under `/api/proposal/send` in the project) and a email template component `app/components/templates/email/SendPdfEmail.tsx`.
   - Uses `NODEMAILER_EMAIL` and `NODEMAILER_PW` from env.

5. Export data
   - `/api/proposal/export` and client-side exports use `@json2csv/node`, `xlsx`, `xml2js` to produce CSV/XLSX/XML/JSON.

6. AnythingLLM Commander
   - Client (Commander components: `CommanderChat`, inline command input in `ProposalPage`) POST → `/api/command`.
   - `/api/command` proxies chat to AnythingLLM (configured via `ANYTHING_LLM_URL`, `ANYTHING_LLM_KEY`, `ANYTHING_LLM_WORKSPACE`) and expects either plain text or JSON action (e.g., { type: 'ADD_SCREEN', payload: {...} }).
   - The server endpoint will auto-create a workspace on AnythingLLM if the workspace slug doesn't exist.
   - Responses with typed actions are executed by `ProposalContext.applyCommand`.

---

## Database Schema (Prisma) — high level 📦
Defined in `prisma/schema.prisma`:
- **Workspace**: id, name, users[], proposals[]
- **User**: id, email, workspaceId
- **Proposal**: id, workspaceId, clientName, status (default DRAFT), screens[] (ScreenConfig)
- **ScreenConfig**: id, proposalId, name, pixelPitch (Float), width, height, lineItems[]
- **CostLineItem**: id, screenConfigId, category, cost, margin, price

Note: The schema maps directly to create proposals endpoint that uses the estimator to populate line items.

---

## API Routes (overview) 📡
- `POST /api/proposals/create` — Create a proposal in DB (uses `lib/prisma.ts` + estimator integration).
- `POST /api/command` — AnythingLLM proxy and action extractor.
- `POST /api/proposal/generate` — Render specified template → PDF (Puppeteer service).
- `POST /api/proposal/send` — Send PDF using nodemailer & email template.
- `POST /api/proposal/export` — Export proposal data (JSON/CSV/XML/XLSX).
- `POST /api/workspaces/create` — Create workspace + default user.

Notes:
- Client uses constants in `lib/variables.ts` (`GENERATE_PDF_API`, `SEND_PDF_API`, `EXPORT_PROPOSAL_API`) to call server endpoints.
- Some naming remains historical (`proposal/*` vs `proposals/*`) — both appear across code and build artifact maps.

---

## Components & Directories — map 🗺️
- `app/components/` — top-level app components
  - `ProposalPage.tsx` — main editor page
  - `CommanderChat.tsx` — LLM chat UI
  - `proposal/` — Proposal form components
    - `ProposalForm.tsx`, `ProposalMain.tsx`, `ProposalActions.tsx`, `actions/PdfViewer.tsx`, `actions/FinalPdf.tsx`
  - `layout/` — `BaseNavbar.tsx`, `BaseFooter.tsx`
  - `templates/` — PDF templates (ANCLOI, dynamic proposal templates)
- `components/ui/` — design system / shadcn components (Input, Button, Dialog, etc.)
- `contexts/` — `ProposalContext.tsx`, `ThemeProvider`, `TranslationContext`
- `lib/` — `estimator.ts`, `schemas.ts`, `prisma.ts`, `variables.ts`, `helpers.ts`
- `services/proposal/server` — generate/send/export services
- `app/api/*` — server app routes

---

## Environment Variables (from `lib/variables.ts` and code) 🔒
- `DATABASE_URL` — Postgres connection for Prisma
- `NODEMAILER_EMAIL` & `NODEMAILER_PW` — sending emails
- `ANYTHING_LLM_URL` — host for AnythingLLM
- `ANYTHING_LLM_KEY` — API key for AnythingLLM
- `ANYTHING_LLM_WORKSPACE` — optional default workspace slug
- `GOOGLE_SC_VERIFICATION` — optional site verification

Tip: Keep `DATABASE_URL`, LLM keys, and email credentials in a secret store; do not commit `.env`.

---

## Deployment & Infra 🐳
- **Dockerfile**: multi-stage build (Node 22, `npx prisma generate`, `npm run build`), production image runs `npm start` on port 3000.
- **Serverless / Vercel**: App Router + serverless functions are compatible; Puppeteer usage is already adapted to serverless via `puppeteer-core` + `@sparticuz/chromium`.
- **AnythingLLM**: If deployed behind Easypanel/Traefik, ensure the container has a port mapping (see `BAD_GATEWAY_FIX.md` — common 502 cause is missing Target port 3001).

---

## Recent Changes & Notes (highlights) 📝
- **Rebranding** to ANC Sports (`BRANDING_SUMMARY.md`) — colors, texts, nav changes, and rename to `anc-proposal-engine`.
- **Estimator** implemented and integrated (`lib/estimator.ts`) including formulas for LED, Structure, Install, Power.
- **Commander & AnythingLLM** integration (`app/api/command/route.ts`, `CommanderChat.tsx`, `ProposalPage` command input) — model instructed to emit JSON actions for direct mutation.
- **PDF flow**: `PdfViewer` transforms RHF form data into internal proposal shape and previews server-generated PDFs.
- **TypeScript fixes**: standard Next.js `next-env.d.ts` present, multiple naming fixes in `contexts/ProposalContext.tsx` to use `proposal*` instead of `proposal*`.

---

## Known Issues & Gotchas ⚠️
- Firefox: Visual issues reported (see `SETUP_SUMMARY.md` / README note about Firefox compatibility).
- AnythingLLM Bad Gateway: Ensure EasePanel port mapping (Target 3001) for the AnythingLLM container (`BAD_GATEWAY_FIX.md`).
- Names: `proposal` vs `proposals` path/name inconsistency exists in code and assets — be mindful when adding new endpoints or changing constants.
- PDF generation in some environments requires correct Chromium setup (use `@sparticuz/chromium` in containerized/serverless setups).

---

## Where to start contributing (priority list) ✅
1. Verify env variables and document in `README` or a `.env.example` file (missing LLM env variables currently).
2. Add unit tests and integration tests for `lib/estimator.ts` and `app/api/command/route.ts` action parsing.
3. Add E2E test for PDF generation (headless Chromium smoke test).
4. Consolidate API naming (`/api/proposals/*` vs `/api/proposal/*`) or provide mapping docs.
5. Add CI step to run `npx prisma generate` and `npm run build` to catch build-time errors.

---

## Quick file index (important files) 📁
- `prisma/schema.prisma` — DB models
- `lib/estimator.ts` — estimator formulas & types
- `lib/schemas.ts` — Zod validation for forms
- `lib/variables.ts` — URLs & env constants
- `app/components/ProposalPage.tsx` — main page
- `app/components/CommanderChat.tsx` — LLM chat UI
- `app/api/command/route.ts` — LLM proxy & action extraction
- `app/api/proposals/create/route.ts` — create proposal API
- `app/api/proposal/generate`, `.../send`, `.../export` — PDF/export/email server APIs
- `services/proposal/server/*` — implementation details for PDF/email/export
- `BRANDING_SUMMARY.md` — rebranding checklist
- `BAD_GATEWAY_FIX.md` — troubleshooting guide for AnythingLLM container

---

## 💡 Recommendations / Next Steps
- Add `/docs/.env.example` listing required variables for local dev and production.
- Add tests for the command action parsing and `calculateScreenPrice` formulas.
- Add a short infra doc for deploying AnythingLLM (port mapping, domain, workspace slug) to avoid 502s.

---

## 🤝 Handover
**What I did:**
- Produced this comprehensive `PROJECT_OVERVIEW.md` as the canonical source-of-truth for ANC Proposal Engine.

**Next:**
1. Add `.env.example` and link to this doc from `README.md` (helps dev onboarding).  
2. Add test coverage for estimator and command parsing (unit + small integration).  
3. If you'd like, I can open PRs to add `.env.example` and a basic Jest/Mocha test for `lib/estimator.ts`.

---

If you want I can: add this file to the README, scaffold `.env.example`, or create the first unit test for `calculateScreenPrice()` — tell me which and I'll proceed. 🔧
