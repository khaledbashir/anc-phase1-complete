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
| 6 | **Smart Assembly Bundler** | ✅ Shipped | 7 | `9a0a8fe5` | See §6 below |
| 7 | **Price-to-Spec Reverse Engineer** | ✅ Shipped | 7 | `505093d7` | See §7 below |
| 8 | **Revision Radar (Delta Scanner)** | ✅ Shipped | 8 | See below | See §8 below |
| 9 | **Liability Hunter** | ✅ Shipped | 8 | `505093d7` | See §9 below |
| 10 | **Visual Cut-Sheet Automator** | ✅ Shipped | 9 | See below | See §10 below |
| 11 | **Vendor RFQ Bot** | ✅ Shipped | 9 | `505093d7` | See §11 below |

---

## Phase 7 Features

### §6 — Smart Assembly Bundler

**Purpose:** Auto-suggests hidden/forgotten line items based on system type. When someone adds a scoreboard, the system suggests: video processor, receiving cards, fiber converter, spare modules, mounting brackets, cable kits.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/estimator/bundleRules.ts` | ~388 | 22-rule bundle engine with types |
| UI Panel | `app/components/estimator/BundlePanel.tsx` | ~208 | Toggle UI per display |

**Integrated Into (modified existing files):**
| File | Change |
|------|--------|
| `app/components/estimator/questions.ts` | Added `excludedBundleItems: string[]` to `DisplayAnswers` |
| `app/components/estimator/EstimatorBridge.ts` | Added `bundleCost`/`bundleItems` to `ScreenCalc`, bundle calculation in `calculateDisplay()`, `buildBundleSheet()`, updated services cost |
| `app/components/estimator/EstimatorStudio.tsx` | Added Bundle button (orange), BundlePanel overlay, toggle handler |

**22 Bundle Rules (5 Categories):**

| Category | Rules |
|----------|-------|
| Signal | Video Processor ($12K), Receiving Cards ($85/4-cab), Sending Card ($450), Signal Cable Kit ($15), Fiber Media Converter ($1,200), Backup Processor ($12K) |
| Electrical | PDU ($850), Power Cables ($8), Surge Protector ($350), UPS Battery ($2,500) |
| Structural | Mounting Brackets ($25×2/cab), Rigging Hardware ($3,500), Weatherproof Enclosure ($12/sqft) |
| Accessory | Spare Receiving Cards (2%), Spare Power Supplies (2%), Calibration Kit ($800), Content Mgmt License ($2,400) |
| Service | Commissioning ($2/sqft), Demo/Disposal ($3,500), Training ($1,500), As-Built Docs ($2,000) |

**Key Types:**
- `BundleItem` — id, name, category, unitCost, quantity, totalCost, reason, trigger
- `BundleInput` — display config fields + excludedIds for user toggles
- `BundleResult` — items[], totalCost, byCategory

**Integration Points:**
- Modifies: `EstimatorBridge.ts` (bundleCost in ScreenCalc, services cost), `questions.ts` (excludedBundleItems)
- Bundle costs auto-included in totalCost and serviceCost
- Users toggle items on/off via BundlePanel checkboxes
- Excluded items persist in `DisplayAnswers.excludedBundleItems`

---

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
- Wired into EstimatorStudio.tsx via "Budget" button (teal) — commit `df727b79`

**Known Limitations:**
- Services estimate is ROM (35% of hardware) — not per-line-item
- Tax rate defaults to 9.5%, not location-aware yet
- No hardcoded fallback catalog if DB is empty (returns empty array)

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

**Integration Points:**
- Pure standalone — no DB dependency, no external API calls
- Deterministic regex scanning (no AI)
- Wired into EstimatorStudio.tsx via "Risk" button (rose) — commit `df727b79`

**Known Limitations:**
- Regex-based, not semantic — can miss paraphrased clauses
- DOCX extraction is raw UTF-8 (no proper XML parsing) — works for plain text DOCX, not complex formatting
- No persistence of scan results (stateless)

---

### §8 — Revision Radar (Delta Scanner)

**Purpose:** Upload two versions of a cost analysis Excel (original + addendum). System diffs them section-by-section, highlights changes, and quantifies dollar impact.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/revision/deltaScanner.ts` | ~290 | Section-level diff engine |
| API | `app/api/revision/compare/route.ts` | ~55 | `POST /api/revision/compare` (multipart) |
| UI Panel | `app/components/estimator/RevisionRadarPanel.tsx` | ~370 | Upload + results panel |

**API Contract:**
```
POST /api/revision/compare
Content-Type: multipart/form-data
Fields: "original" (Excel file) + "revised" (Excel file)
Response: { result: DeltaResult }
```

**Key Types:**
- `DeltaRow` — per-row comparison (label, oldValue, newValue, delta, pctChange, changeType)
- `DeltaSection` — per-section comparison (sectionName, oldTotal, newTotal, rows[], changeType)
- `DeltaResult` — full comparison (sections[], grandTotals, summary counts)

**Business Logic:**
- Parses both workbooks via `findMarginAnalysisSheet()` (same as Mirror Mode)
- Finds column headers (selling price/amount), then parses into sections
- Section matching: normalized label comparison (case-insensitive, alphanumeric)
- Row matching: same normalization within sections
- Change types: added, removed, changed, unchanged
- Grand total delta with percentage change
- Summary: total sections, changed/added/removed counts, total row changes

**UI Panel:**
1. **Upload Step** — drag/drop boxes for Original (blue) and Revised (amber), Compare button
2. **Results View** — Summary banner (old/new/delta grand totals), expandable sections with per-row color-coded diffs (green = savings, red = increase, amber = changed)

**Integration Points:**
- Pure standalone — no DB, no AI
- Uses `@/lib/sheetDetection` (shared with Mirror Mode parser)
- Wired into EstimatorStudio via "Delta" button (amber)

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

**Integration Points:**
- Pure standalone — no DB dependency, no AI calls
- Pre-fills from parent estimator's current `answers` object
- Wired into EstimatorStudio.tsx via "RFQ" button (cyan) — commit `df727b79`

**Known Limitations:**
- Plain text output only (no HTML email or PDF)
- No email sending — copy/download only
- No persistence of generated RFQs
- Does not auto-detect manufacturer from selected products

---

### §10 — Visual Cut-Sheet Automator

**Purpose:** Auto-generates per-display spec sheets showing product specs, layout diagram, power/weight/resolution stats, and installation notes. One-click export for submittal packages.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/cutsheet/cutSheetGenerator.ts` | ~300 | Cut sheet data builder + text export |
| API | `app/api/cutsheet/generate/route.ts` | ~40 | `POST /api/cutsheet/generate` |
| UI Panel | `app/components/estimator/CutSheetPanel.tsx` | ~280 | Generate + preview + download panel |

**API Contract:**
```
POST /api/cutsheet/generate
Body: { projectName, clientName, location, displays: DisplayInput[] }
Response: { cutSheet: CutSheetDocument, textSheets: string[] }
```

**Key Types:**
- `CutSheetDisplay` — full spec sheet data for one display (dims, resolution, power, weight, install notes)
- `CutSheetDocument` — project-level container (metadata + displays[] + notes[])
- `DisplayInput` — input from EstimatorBridge (includes ScreenCalc and CabinetLayout data)

**Cut Sheet Sections:**
1. Display Specifications (type, environment, product, pitch, brightness)
2. Dimensions (requested vs actual, resolution)
3. Cabinet Layout (grid, cabinet size, total count)
4. Electrical (max/typical power, heat load BTU, amps @ 120V/208V)
5. Structural (weight lbs/kg, weight/sqft, complexity, data run, lift type)
6. Notes (auto-generated based on display configuration)
7. ANC address block

**UI Panel — 2 Steps:**
1. **Pre-generate** — display summary cards, "Generate Cut Sheets" button
2. **Generated** — tabbed view per display, monospace text preview, Copy/Download/Download All

**Integration Points:**
- Uses ScreenCalc + CabinetLayout from EstimatorBridge for accurate data
- Fallback estimates for power/weight when no product selected
- Auto-generated notes based on environment (outdoor IP65, replacement demo, complex install)
- Wired into EstimatorStudio via "Cuts" button (indigo)

---

## Architecture Notes

### Shared Patterns
All Phase 7-9 panels follow the same UI pattern:
- **Overlay panel** inside EstimatorStudio's right section, absolute positioned with backdrop blur
- **Header** with icon + title + X close button
- **Design system**: French Blue `#0A52EF`, near-black `#1C1C1C`
- **EstimatorStudio header buttons**: Each tool has a colored icon button

### Prisma Usage
- All DB-dependent features use `import { prisma } from "@/lib/prisma"` (singleton)
- NOT `new PrismaClient()` per-file

### DO NOT MODIFY (Parallel Work Guards)
These files are owned by the core estimator and should not be modified by standalone feature panels:
- `app/components/estimator/EstimatorBridge.ts` (except for bundler integration which was planned)
- `app/components/estimator/EstimatorStudio.tsx` (integration wiring is done)
- `app/components/estimator/questions.ts`
- `app/components/estimator/QuestionFlow.tsx`
- `app/components/estimator/ExcelPreview.tsx`

---

## Completed Integration Work

- [x] Wire `BundlePanel` into `EstimatorStudio.tsx` — commit `9a0a8fe5`
- [x] Wire `ReverseEngineerPanel` into `EstimatorStudio.tsx` (Budget button, teal) — commit `df727b79`
- [x] Wire `LiabilityPanel` into `EstimatorStudio.tsx` (Risk button, rose) — commit `df727b79`
- [x] Wire `RfqPanel` into `EstimatorStudio.tsx` (RFQ button, cyan) — commit `df727b79`

## Remaining Work

- [ ] Add E2E tests for API endpoints
- [ ] Add product catalog data (waiting on Matt) — reverse engineer returns empty if DB has no products

---

## Commit History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-02-15 | `9a0a8fe5` | Phase 7: Smart Assembly Bundler (5 files, 767 insertions) |
| 2026-02-15 | `505093d7` | Phase 7+8+9: Reverse Engineer + Liability Hunter + Vendor RFQ Bot (9 files, 2365 lines) |
| 2026-02-15 | `df727b79` | Integration: Wire Reverse Engineer, Liability, RFQ panels into EstimatorStudio |

---

*This document is maintained by AI agents working on the Estimator V2 feature set. If you modify any file listed above, update the relevant section.*
