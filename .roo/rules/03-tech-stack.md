# Tech Stack

## Core
- **Framework:** Next.js 15.3 (App Router)
- **Language:** TypeScript (strict)
- **React:** 18 (NOT React 19)
- **ORM:** Prisma + PostgreSQL
- **UI:** shadcn/ui + Tailwind CSS
- **Data Grid:** AG Grid (for pricing tables)
- **Animation:** Framer Motion
- **Forms:** React Hook Form + Zod validation
- **State:** React Context API (ProposalContext, ChargesContext, SignatureContext)

## AI / RAG
- **AnythingLLM** — RAG engine for document analysis and chat
- **Kimi K2.5** — AI chat via Puter.js (free, client-side)
- **AnythingLLM fallback** — when Kimi is unavailable
- **Mistral** — OCR for RFP PDF text extraction
- **Gemini 2.0 Flash** — Vision analysis for architectural drawings

## Key Libraries
- ExcelJS — Excel generation (.xlsx)
- pdftotext — PDF text extraction
- Browserless — headless Chrome for PDF rendering

## Design Tokens
- **Font:** Work Sans
- **Primary Color:** French Blue `#0A52EF`
- **Excel Green:** `#217346` (used in Excel-like UI elements)
- **Margin Formula:** `sellingPrice = cost / (1 - marginPercent)` (divisor model, NOT markup)

## File Structure
```
app/
  api/                    # 40+ API routes
  components/
    layout/               # Sidebar, Header
    modals/               # NewProjectModal, etc.
    proposal/             # PDF template components
    reusables/            # Shared UI components
    templates/            # PDF templates (Template5 = primary)
    estimator/            # EstimatorBridge, ExcelPreview
  tools/
    rfp-analyzer/         # RFP upload + analysis pipeline
  projects/               # Project CRUD pages
contexts/                 # React contexts
services/
  pricing/                # pricingTableParser, excelImportService
  chat/                   # kimiService, intentParser, actionExecutor
  rfp/                    # rfpExtractor, productCatalog, rateCardLoader
    pipeline/             # generateRateCardExcel, generateSubcontractorExcel, generateScopingWorkbook
    unified/              # types.ts (ExtractedLEDSpec, etc.)
  catalog/                # productMatcher
  dashboard/              # dashboardService
  sow/                    # scope of work
prisma/
  schema.prisma           # Database schema
lib/
  prisma.ts               # Prisma client singleton
  variables.ts            # Global constants, API URLs
  anything-llm.ts         # AnythingLLM client
```
