# 🔄 AI MAINTENANCE SIGNAL: This document is the SINGLE SOURCE OF TRUTH for Estimator V2 features. ANY agent modifying estimator files MUST update this document with: current status, file paths, commit hashes, integration points, and known issues. If you touch an estimator feature and don't update this doc, the change is incomplete.

---

# Estimator V2 — Feature Registry

**Branch:** `phase2/product-database`  
**Last Updated:** 2026-02-15  
**Total Features:** 11 (5 shipped earlier, 6 shipped in Phases 7-9)

---

## Feature Status Overview

| # | Feature | Status | Phase | Commit | Files |
|---|---------|--------|-------|--------|-------|
| 1 | Estimator Studio (core UI) | ✅ Shipped | Pre-7 | — | `app/estimator/`, `EstimatorStudio.tsx` |
| 2 | Question Flow Engine | ✅ Shipped | Pre-7 | — | `QuestionFlow.tsx`, `questions.ts` |
| 3 | EstimatorBridge (calc engine) | ✅ Shipped | Pre-7 | — | `EstimatorBridge.ts` |
| 4 | Excel Preview / Export | ✅ Shipped | Pre-7 | — | `ExcelPreview.tsx` |
| 5 | Product Matcher | ✅ Shipped | Pre-7 | — | `services/catalog/productMatcher.ts` |
| 6 | **Smart Assembly Bundler** | ✅ Shipped | 7 | — | *Built by other agent* |
| 7 | **Price-to-Spec Reverse Engineer** | ✅ Shipped | 7 | `505093d7` | See §7 below |
| 8 | **Revision Radar (Delta Scanner)** | ✅ Shipped | 8 | — | *Built by other agent* |
| 9 | **Liability Hunter** | ✅ Shipped | 8 | `505093d7` | See §9 below |
| 10 | **Visual Cut-Sheet Automator** | ✅ Shipped | 9 | — | *Built by other agent* |
| 11 | **Vendor RFQ Bot** | ✅ Shipped | 9 | `505093d7` | See §11 below |

---

## Phase 7 Features

### §7 — Price-to-Spec Reverse Engineer

**Purpose:** Given a target budget + display dimensions, filter the product catalog to show which LED products + configurations fit within that budget. Budget-first product selection.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/catalog/reverseEngineer.ts` | ~170 | Core reverse engineering logic |
| API | `app/api/products/reverse/route.ts` | ~50 | `POST /api/products/reverse` |
| UI Panel | `app/components/estimator/ReverseEngineerPanel.tsx` | ~290 | Slide-out panel with results |

**API Contract:**
```
POST /api/products/reverse
Body: {
  targetBudget: number,   // USD
  widthFt: number,
  heightFt: number,
  isIndoor: boolean,
  marginPercent?: number,  // default 30
  includeBondTax?: boolean, // default true
  bondRate?: number,       // default 0.015
  salesTaxRate?: number    // default 0.095
}
Response: {
  options: FeasibleOption[],  // max 10, sorted by fitScore desc
  query: ReverseQuery
}
```

**Key Types:**
- `ReverseQuery` — input parameters
- `FeasibleOption` — product + layout + pricing + fitScore + rank

**Business Logic:**
- Queries `ManufacturerProduct` table (Prisma) filtered by environment
- Cabinet layout: `ceil(targetDimMm / cabinetDimMm)` for columns and rows
- Hardware cost: `areaSqFt × costPerSqFt` (DB value or pitch-interpolated fallback)
- Margin model: 30% LED hardware (`cost / (1 - 0.3)`), 20% services
- Services estimate: 35% of hardware cost (ROM)
- Bond: 1.5% of subtotal, Tax: 9.5% default (location-specific)
- Fit score: area ratio × width ratio × height ratio × 100
- Returns top 10 options sorted by fitScore desc, then headroom asc

**Pitch-to-Cost Fallback (when DB has no `costPerSqFt`):**
| Pitch | $/sqft |
|-------|--------|
| 2.5mm | $175 |
| 3.9mm | $120 |
| 6mm | $80 |
| 10mm | $45 |
Linear interpolation between known pitches.

**UI Panel Props:**
```typescript
interface ReverseEngineerPanelProps {
  open: boolean;
  onClose: () => void;
  currentDisplay: DisplayAnswers;  // pre-fills width/height
  onSelectProduct: (productId: string, productName: string) => void;
}
```

**Integration Points:**
- Reads from: `ManufacturerProduct` (Prisma), `@/lib/prisma` singleton
- Feeds into: Parent estimator via `onSelectProduct` callback
- Does NOT modify: `EstimatorBridge.ts`, `questions.ts`, `QuestionFlow.tsx`

**Known Limitations:**
- Services estimate is ROM (35% of hardware) — not per-line-item
- Tax rate defaults to 9.5%, not location-aware yet
- No hardcoded fallback catalog if DB is empty (returns empty array)

---

### §6 — Smart Assembly Bundler

**Purpose:** Auto-suggests hidden/forgotten line items based on system type. When someone adds a scoreboard, the system suggests: video processor, receiving cards, fiber converter, spare modules, mounting brackets, cable kits.

**Files:** *Built by parallel agent — update paths when available*

**Integration Points:**
- Modifies: `EstimatorBridge.ts` (adds bundling logic)
- New service in `services/` directory

**Status:** ✅ Shipped by other agent. **TODO: Update file paths and commit hash when confirmed.**

---

## Phase 8 Features

### §9 — Liability Hunter (SOW Gap Scanner)

**Purpose:** Scans SOW/RFP/contract text against a 20-point checklist of required clauses and protections. Flags missing items that expose ANC to liability.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/sow/liabilityScanner.ts` | ~310 | 20-check scanning engine |
| API | `app/api/sow/scan/route.ts` | ~80 | `POST /api/sow/scan` |
| UI Panel | `app/components/estimator/LiabilityPanel.tsx` | ~310 | Upload/paste + results panel |

**API Contract:**
```
POST /api/sow/scan
Accepts: multipart/form-data (file: PDF/TXT/DOCX) OR JSON { text, documentName }
Response: { result: ScanResult }
```

**Key Types:**
- `LiabilityCheck` — individual check result (id, category, name, severity, status, recommendation, foundText)
- `ScanResult` — aggregate (documentName, totalChecks, passed, warnings, critical, riskScore, checks[])

**20-Point Checklist:**

| # | ID | Category | Name | Severity | Logic |
|---|-----|----------|------|----------|-------|
| 1 | fin-01 | Financial | Liquidated Damages | Critical | Conditional — flags if found without cap |
| 2 | fin-02 | Financial | Performance Bond % | Warning | Conditional — flags if >5% |
| 3 | fin-03 | Financial | Payment Terms | Warning | Must exist |
| 4 | fin-04 | Financial | Retainage | Warning | Conditional — flags if >10% |
| 5 | fin-05 | Financial | Change Order Process | Critical | Must exist |
| 6 | leg-01 | Legal | Force Majeure | Warning | Must exist |
| 7 | leg-02 | Legal | Limitation of Liability | Critical | Must exist |
| 8 | leg-03 | Legal | Indemnification | Warning | Flag if found (review) |
| 9 | leg-04 | Legal | Termination Clause | Warning | Must exist |
| 10 | leg-05 | Legal | IP / Ownership | Info | Flag if found (review) |
| 11 | sco-01 | Scope | Scope Exclusions | Info | Flag if found |
| 12 | sco-02 | Scope | Prevailing Wage | Warning | Flag if found (cost impact) |
| 13 | sco-03 | Scope | Working Hours | Info | Flag if found |
| 14 | sco-04 | Scope | Permit Responsibility | Warning | Conditional — flags if contractor responsible |
| 15 | tim-01 | Timeline | Substantial Completion | Warning | Must exist |
| 16 | tim-02 | Timeline | Weather Days | Info | Must exist |
| 17 | tim-03 | Timeline | Concurrent Work | Info | Flag if found |
| 18 | war-01 | Warranty | Warranty Duration | Warning | Conditional — flags if >5 years |
| 19 | war-02 | Warranty | Extended Warranty | Info | Flag if found |
| 20 | war-03 | Warranty | Spare Parts | Info | Conditional — flags if >10% |

**Risk Scoring:**
- Missing critical: +15 points
- Missing/flagged warning: +8 points
- Flagged info: +3 points
- `riskScore = min(100, sum)`
- Display: 0-30 green (Low), 31-60 amber (Medium), 61-100 red (High)

**PDF Extraction:** Uses `unpdf` (primary) with `pdf-parse` fallback — same pattern as `app/api/vendor/parse/route.ts`.

**UI Panel Props:**
```typescript
interface LiabilityPanelProps {
  open: boolean;
  onClose: () => void;
}
```

**Integration Points:**
- Pure standalone — no DB dependency, no external API calls
- Deterministic regex scanning (no AI)
- Does NOT modify: `services/sow/sowGenerator.ts`, `services/sow/sowTemplates.ts`

**Known Limitations:**
- Regex-based, not semantic — can miss paraphrased clauses
- DOCX extraction is raw UTF-8 (no proper XML parsing) — works for plain text DOCX, not complex formatting
- No persistence of scan results (stateless)

---

### §8 — Revision Radar (Delta Scanner)

**Purpose:** Upload two versions of a cost analysis Excel (original + addendum). System diffs them section-by-section, highlights changes, and quantifies dollar impact.

**Files:** *Built by parallel agent — update paths when available*

**Integration Points:**
- New service in `services/revision/`
- New API in `app/api/revision/`
- New UI panel

**Status:** ✅ Shipped by other agent. **TODO: Update file paths and commit hash when confirmed.**

---

## Phase 9 Features

### §11 — Vendor RFQ Bot

**Purpose:** Auto-generates professional RFQ emails to LED manufacturers with display specs, quantities, ANC standard terms. One per manufacturer.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/rfq/rfqGenerator.ts` | ~150 | Email template builder |
| API | `app/api/rfq/generate/route.ts` | ~45 | `POST /api/rfq/generate` |
| UI Panel | `app/components/estimator/RfqPanel.tsx` | ~340 | 3-step wizard panel |

**API Contract:**
```
POST /api/rfq/generate
Body: {
  answers: {
    clientName: string,
    projectName: string,
    location: string,
    displays: Array<{
      displayName, widthFt, heightFt, pixelPitch,
      productName, locationType, serviceType, isReplacement
    }>
  },
  manufacturer: string,
  options?: {
    deliveryTimeline?: string,
    includeSpares?: boolean,  // default true (2% spare modules)
    contactName?: string,
    contactEmail?: string,
    specialRequirements?: string[]
  }
}
Response: { rfq: RfqDocument }
```

**Key Types:**
- `RfqLineItem` — per-display line (name, dims, area, pitch, environment, preferred product)
- `RfqDocument` — full email (subject, recipient, body text, line items, metadata)

**Email Template Structure:**
1. Subject line: `RFQ: {projectName} - LED Display Systems`
2. Greeting + intro paragraph
3. Project header (name, client, location)
4. Display requirements table (per display: dims, pitch, environment, service access, preferred model)
5. Spare parts line (2% modules)
6. Special requirements (if any)
7. Requested deliverables (unit pricing, total, cabinet specs, power, lead time, warranty)
8. ANC address block (2 Manhattanville Road, Suite 402, Purchase, NY 10577)
9. Contact info (if provided)
10. Sign-off

**UI Panel — 3-Step Wizard:**
1. **Select Manufacturers** — checkboxes for LG, Yaham, Absen, Unilumin + custom text input
2. **Optional Details** — delivery timeline, contact name/email, special requirements textarea, display summary
3. **Preview** — tabbed view per manufacturer, copy to clipboard, download as .txt, generate another

**UI Panel Props:**
```typescript
interface RfqPanelProps {
  open: boolean;
  onClose: () => void;
  answers: {
    clientName: string;
    projectName: string;
    location: string;
    displays: DisplayInput[];
  };
}
```

**Integration Points:**
- Pure standalone — no DB dependency, no AI calls
- Pre-fills from parent estimator's current `answers` object
- Does NOT modify: `EstimatorBridge.ts`, `EstimatorStudio.tsx`, `generateProposalPdfService.ts`

**Known Limitations:**
- Plain text output only (no HTML email or PDF)
- No email sending — copy/download only
- No persistence of generated RFQs
- Does not auto-detect manufacturer from selected products

---

### §10 — Visual Cut-Sheet Automator

**Purpose:** Auto-generates per-display spec sheets showing product specs, layout diagram, power/weight/resolution stats, and installation notes. One-click export for submittal packages.

**Files:** *Built by parallel agent — update paths when available*

**Integration Points:**
- New service in `services/cutsheet/`
- New API in `app/api/cutsheet/`
- May interact with `generateProposalPdfService.ts`

**Status:** ✅ Shipped by other agent. **TODO: Update file paths and commit hash when confirmed.**

---

## Architecture Notes

### Shared Patterns
All Phase 7-9 panels follow the same UI pattern:
- **Slide-out panel** fixed to right side, full height, max-w-lg
- **Backdrop** with `bg-black/20` click-to-close
- **Header** with icon + title + X close button
- **Design system**: French Blue `#0A52EF`, near-black `#1C1C1C`, borders `#E8E8E8`, muted `#878787`
- **Inputs**: Drafting-line style (bottom border only, blue on focus)
- **Buttons**: Primary = `bg-[#1C1C1C] text-white`, hover = opacity change

### Prisma Usage
- All DB-dependent features use `import { prisma } from "@/lib/prisma"` (singleton)
- NOT `new PrismaClient()` per-file

### DO NOT MODIFY (Parallel Work Guards)
These files are owned by the core estimator and must not be modified by feature panels:
- `app/components/estimator/EstimatorBridge.ts`
- `app/components/estimator/EstimatorStudio.tsx`
- `app/components/estimator/questions.ts`
- `app/components/estimator/QuestionFlow.tsx`
- `app/components/estimator/ExcelPreview.tsx`

---

## Pending Integration Work

- [ ] Wire `ReverseEngineerPanel` into `EstimatorStudio.tsx` (button to open panel)
- [ ] Wire `LiabilityPanel` into estimator or project page
- [ ] Wire `RfqPanel` into estimator (pass current `answers`)
- [ ] Update §6, §8, §10 with file paths from other agent's work
- [ ] Add E2E tests for all 3 API endpoints
- [ ] Add product catalog data (waiting on Matt) — reverse engineer currently returns empty if DB has no products

---

## Commit History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-02-15 | `505093d7` | Phase 7+8+9: Reverse Engineer + Liability Hunter + Vendor RFQ Bot (9 files, 2365 lines) |

---

*This document is maintained by AI agents working on the Estimator V2 feature set. If you modify any file listed above, update the relevant section.*
