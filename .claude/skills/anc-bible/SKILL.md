---
name: anc-bible
description: Complete ANC Proposal Engine project bible. Use at the START of every conversation about this project. Contains architecture, patterns, file locations, stakeholder rules, deployment workflow, known bugs, and lessons learned. This is the single source of truth.
---

# ANC Proposal Engine — Project Bible

## What This App Does
Converts Excel cost analysis spreadsheets into branded PDF proposals for **ANC Sports Enterprises** (LED display integration for NFL, NBA, MLS, NCAA stadiums). Partners: LG, Yaham.

## The Team
- **Ahmad Basheer** — Developer/owner. Direct, fast-paced. Don't over-explain.
- **Natalia** — Proposal Lead, 70-75% usage. Mirror Mode. Her rules are LAW.
- **Matt/Jeremy** — Estimators. Intelligence Mode (build quotes from scratch).

## Stack
- Next.js 15.3 App Router, React 18, TypeScript
- shadcn/ui + Radix UI + Tailwind CSS, AG Grid, Framer Motion
- Prisma + PostgreSQL, Auth.js v5 (JWT, 30-day)
- Browserless (headless Chrome for PDF), AnythingLLM (RAG), Sentry
- Font: Work Sans. Brand color: French Blue `#0A52EF`

## Two Operating Modes

### Mirror Mode (Natalia — 70% usage)
- Upload Excel → exact PDF reproduction. **NO MATH. EVER.**
- Parser: `services/pricing/pricingTableParser.ts`
- If Excel says 2+2=5, the PDF shows 5
- 6 Golden Rules: No math, exact section order, exact row order, show alternates, show tax/bond even if $0, trust Excel's grand total

### Intelligence Mode (Matt/Jeremy — 30%)
- Build quotes from scratch, recalculates everything
- Parser: `services/proposal/server/excelImportService.ts`
- Margin formula: `sellingPrice = cost / (1 - marginPercent)`

## Wizard Steps
- **Mirror Mode**: 3 steps — Setup → Configure → Review (skips Math)
- **Intelligence Mode**: 4 steps — Setup → Configure → Math → Review
- Step skipping logic: `WizardProgress.tsx` + `WizardNavigation.tsx` check `isMirrorMode`

## Three Document Modes
| Mode | Header | Payment Terms | Signatures |
|------|--------|---------------|------------|
| Budget | "BUDGET ESTIMATE" | No | No |
| Proposal | "PROPOSAL" | No | No |
| LOI | Full legal paragraph with addresses | Yes (50/40/10) | Yes (dual) |

## PDF Template: ProposalTemplate5 (Hybrid)
- **THE template** — used for ALL modes (Budget, Proposal, LOI)
- ANC logo top-left, blue diagonal lines top-right
- Blue vertical bar accents on section headers
- Column headers: **WORK** | **PRICING** (not Description/Amount)
- Alternating white/light gray rows
- File: `app/components/templates/proposal-pdf/ProposalTemplate5.tsx`

## Critical File Locations

### Parsers
- `services/pricing/pricingTableParser.ts` — Mirror Mode parser (THE critical file)
- `services/proposal/server/excelImportService.ts` — Intelligence Mode parser
- `lib/sheetDetection.ts` — Finds "Margin Analysis" sheet in workbook

### Contexts (State Management)
- `contexts/ProposalContext.tsx` — Master state (119KB, has PDF gen, download, save)
- `contexts/ChargesContext.tsx` — Charges, taxes, bonds
- `contexts/SignatureContext.tsx` — Digital signatures

### Wizard
- `app/components/proposal/form/wizard/WizardProgress.tsx` — Step indicator (3 vs 4 steps)
- `app/components/proposal/form/wizard/WizardNavigation.tsx` — Step navigation + skip logic
- `app/components/proposal/form/wizard/steps/Step1Ingestion.tsx` — Upload + setup
- `app/components/proposal/form/wizard/steps/Step2Intelligence.tsx` — Configure
- `app/components/proposal/form/wizard/steps/Step3Math.tsx` — Math (Intelligence only)
- `app/components/proposal/form/wizard/steps/Step4Export.tsx` — Review + download

### PDF Templates
- `app/components/templates/proposal-pdf/ProposalTemplate5.tsx` — Hybrid (ACTIVE)
- `app/components/templates/proposal-pdf/ProposalLayout.tsx` — Shared layout wrapper
- `app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs.tsx` — Specs table

### Services
- `services/proposal/server/generateProposalPdfService.ts` — PDF gen via Browserless
- `services/proposal/server/activityLogService.ts` — Activity tracking
- `services/AnythingLLMService.ts` — RAG backend

### Other Key Files
- `app/components/proposal/intelligence/BriefMePanel.tsx` — Brief Me slide-out panel
- `middleware.ts` — Edge auth middleware
- `lib/auth.ts` + `lib/auth-middleware.ts` — Auth config (must have `secret` + `trustHost`)
- `prisma/schema.prisma` — Database schema
- `lib/variables.ts` — Constants (API URLs, defaults)

### API Routes (app/api/)
- `proposals/import-excel` — Excel upload endpoint
- `proposal/generate` — PDF generation
- `projects/[id]` — CRUD for projects
- `projects/[id]/activities` — Activity log
- `projects/[id]/share` — Share link generation
- `agent/intelligence-brief` — Brief Me AI query
- `pricing-logic/tree` — Pricing decision tree (Phase B)

## Deployment
- **VPS**: 138.201.126.110, EasyPanel, Docker
- **Production**: https://basheer-natalia.prd42b.easypanel.host
- **Deploy branch**: `phase2/product-database` (EasyPanel watches this)
- **Local dev**: `pnpm dev` → port 3003
- **Flow**: Code on VPS → git push → EasyPanel auto-builds Docker

## Key Patterns
- Context API for state (ProposalContext is the big one)
- React Hook Form + Zod for forms
- Toast via `useToast()` hook
- Auto-save with `useDebouncedSave` (2000ms debounce)
- shadcn/ui components in `/components/ui/`

## Parser Architecture (pricingTableParser.ts)

### How It Works
1. `findMarginAnalysisSheet()` — fuzzy-finds the sheet
2. `findColumnHeaders()` — locates Cost, Selling Price, Margin columns
3. `findHeaderRowIndex()` — finds the column header row
4. `parseAllRows()` — parses every row after header with metadata flags
5. `findTableBoundaries()` — groups rows into table sections
6. `extractTable()` — builds PricingTable objects from boundaries
7. `findGlobalDocumentTotal()` — finds project grand total
8. `prependSyntheticRollupTable()` — adds summary table if none exists

### Excel Structure (Margin Analysis sheet)
```
ZONE 1 — Project Roll-Up:
  Row N:   TOTAL: | Cost | Selling Price | Margin $ | Margin %  ← header row
  Row N+1: Section 1 Name | cost | sell | margin | %
  Row N+2: Section 2 Name | cost | sell | margin | %
  ...
  Row N+K: [blank] | subtotal_cost | subtotal_sell           ← subtotal
  Row N+K+1: TAX | 0 | 0
  Row N+K+2: BOND | 0 | 0
  Row N+K+3: SUB TOTAL (BID FORM) | | grand_total_sell      ← grand total

ZONE 2 — Detail Sections (repeats for each section):
  Row M:   Section Name | Cost | Selling Price | Margin $ | Margin %
  Row M+1: Line item 1  | cost | sell | margin | %
  ...
  Row M+J: [blank] | | section_subtotal
  Row M+J+1: TAX | 0 | 0
  Row M+J+2: SUB TOTAL (BID FORM) | | section_total
  Row M+J+3: Alternates - Add to Cost Above | Cost | Selling Price
  Row M+J+4: Alternate #1: ... | cost | sell (negative = discount)
```

### Known Parser Pitfalls (Lessons Learned)
1. **Orphaned summary rows**: The "TOTAL:" row doubles as the column header row. Data rows between it and the first detail section header have no `isHeader` predecessor. Fix: `findTableBoundaries` creates a summary boundary for orphaned pre-section rows.
2. **Grand total in wrong boundary**: After the summary becomes the first boundary, `findGlobalDocumentTotal` must look INSIDE it (not before it).
3. **Column misalignment**: Some Excels have shifted columns. The `deriveBestShiftedColumnMap` fallback handles this.
4. **isGrandTotal detection**: Matches "grand total", "sub total (bid form)", "total" (exact), "project total". Note: "total:" (with colon) does NOT match "total" (exact match).

## Bundle Download
- 4 separate sequential downloads (NOT a zip):
  1. `ANC_[Client]_Audit_[M-D-YYYY].xlsx`
  2. `ANC_[Client]_Budget_Estimate_[M-D-YYYY].pdf`
  3. `ANC_[Client]_Proposal_[M-D-YYYY].pdf`
  4. `ANC_[Client]_LOI_[M-D-YYYY].pdf`
- 800ms delay between downloads
- Logic in `ProposalContext.tsx` → `downloadBundlePdfs()`

## Auth Gotchas (Docker/EasyPanel)
- MUST set `secret: process.env.AUTH_SECRET` explicitly in both `auth.ts` and `auth-middleware.ts`
- MUST set `trustHost: true` in both files
- MUST set `AUTH_URL` env var to the production URL
- Edge middleware must allow `/_next` and static assets through

## Test Files (Gold Standard)
| File | Expected Tables | Expected Total | Tests |
|------|----------------|----------------|-------|
| Indiana LOI (`ANC_Indiana Fever...xlsx`) | 8+ (1 summary + 7 detail) | $2,237,067.64 | Full LOI flow |
| Indiana Audit (`Cost-Analysis---Indiana-Fever...xlsx`) | 1 | $507,262.53 | Fallback parser |
| Scotia CAD (`Copy of Cost Analysis - SBA PH4...xlsx`) | 7 | CAD currency, 13% tax | CAD + tax |

## Phase 2 Roadmap
- **A: Mirror Polish** — Done (prompts 40-48)
- **B: Product Catalog** — In progress (current branch)
- **C: Intelligence Mode** — Planned
- **D: AI Chat** — Planned (Kimi K2.5 via Puter.js, free inference)
- **E: RFP Extraction** — Planned

## Things That Will Bite You
1. `ProposalContext.tsx` is 119KB. Read it carefully before changing it.
2. The PDF template renders whatever data it receives. If the PDF looks wrong, the BUG IS IN THE PARSER, not the template (usually).
3. Mirror Mode and Intelligence Mode use DIFFERENT parsers. Changes to one don't affect the other.
4. EasyPanel auto-deploys from `phase2/product-database`. Force-push if needed.
5. Browserless connects via internal Docker URL first, falls back to external WSS.
6. The "TOTAL:" header row in Excel is BOTH a section label AND the column header. The parser must handle this dual role.
