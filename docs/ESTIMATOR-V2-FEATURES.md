# Estimator V2 — Feature Registry

**Branch:** `phase2/product-database`
**Last Updated:** 2026-02-15
**Total Features:** 17 (5 shipped earlier, 6 shipped in Phases 7-9, 1 infrastructure, 2 shipped in Phase 10, 3 shipped in Phase 11-12)

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
| 11 | **Vendor RFQ Bot V2** | ✅ Shipped | 9+11 | `953725a1` | See §11 below |
| 12 | **Kreuzberg OCR Integration** | ✅ Shipped | Infra | `8cb142d6` | See §12 below |
| 13 | **Frankenstein Excel Normalizer** | ✅ Shipped | 10 | `deda528b` | See §13 below |
| 14 | **Metric Mirror (Imperial/Metric Bridge)** | ✅ Shipped | 10 | `8cb142d6` | See §14 below |
| 15 | **Modern Dialog System** | ✅ Shipped | 12 | See below | See §15 below |
| 16 | **Toolbar Descriptions** | ✅ Shipped | 11 | `953725a1` | See §16 below |
| 17 | **Liability Scanner Fix** | ✅ Shipped | 12 | `dc7efa11` | See §17 below |

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

**PDF Extraction:** Uses Kreuzberg OCR (Tesseract + PaddleOCR) via `@/services/kreuzberg/kreuzbergClient`. Handles PDF, DOCX, DOC natively with full OCR for scanned documents.

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

### §11 — Vendor RFQ Bot V2

**Purpose:** Auto-generates professional RFQ documents to LED manufacturers with enriched display specs (resolution, brightness, IP rating), RFQ numbering, and a rich styled preview UI. One per manufacturer, generated in parallel.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Service | `services/rfq/rfqGenerator.ts` | ~292 | RFQ document builder with enrichment |
| API (generate) | `app/api/rfq/generate/route.ts` | ~45 | `POST /api/rfq/generate` |
| API (manufacturers) | `app/api/manufacturers/list/route.ts` | ~25 | `GET /api/manufacturers/list` (from DB) |
| UI Panel | `app/components/estimator/RfqPanel.tsx` | ~640 | 3-step wizard with rich preview |
| Tooltips | `app/components/estimator/ToolDescription.tsx` | ~112 | Rich hover tooltips for toolbar buttons |

**V2 Upgrades (commit `953725a1`):**
- RFQ numbering: `RFQ-YYYY-NNNN` (time-based sequence)
- Date stamps on every RFQ
- Enrichment from EstimatorBridge: resolution (pixelsW × pixelsH), area (sqft), cabinet layout
- Enrichment from ManufacturerProduct: brightness (nits), IP rating, refresh rate (wired as null until product DB enriched)
- Manufacturer list fetched from DB (`ManufacturerProduct` distinct active), fallback to hardcoded [LG, Yaham, Absen, Unilumin]
- `Promise.all()` parallel generation across multiple manufacturers
- Rich styled preview: DisplayCards with 2-column spec grids, colored sections (amber spares, purple requirements), manufacturer pills
- Download filename includes RFQ number: `RFQ-2026-0847_LG.txt`

**API Contract:**
```
POST /api/rfq/generate
Body: {
  answers: {
    clientName, projectName, location,
    displays: Array<{ displayName, widthFt, heightFt, pixelPitch,
      productName, locationType, serviceType, isReplacement, quantity?, installComplexity? }>,
    calcs?: Array<{ pixelsW?, pixelsH?, areaSqFt?, cabinetLayout? }>,
    products?: Array<{ maxNits?, ipRating?, refreshRate?, environment? } | null>
  },
  manufacturer: string,
  options?: { deliveryTimeline?, includeSpares?, contactName?, contactEmail?, specialRequirements? }
}
Response: { rfq: RfqDocument }

GET /api/manufacturers/list
Response: { manufacturers: string[] }
```

**Key Types:**
- `RfqLineItem` — per-display (name, dims, area, pitch, environment, quantity, resolution, brightnessNits, ipRating, installComplexity)
- `RfqDocument` — full document (rfqNumber, date, subject, recipient, lineItems, bodyText, contactInfo, metadata)
- `CalcInput` — enrichment from ScreenCalc (pixelsW, pixelsH, areaSqFt, cabinetLayout)
- `ProductInput` — enrichment from ManufacturerProduct (maxNits, ipRating, refreshRate, environment)

**Integration Points:**
- Enriched with `calcs` (ScreenCalc[]) and `productSpecs` from EstimatorStudio
- DB manufacturers via `/api/manufacturers/list` with graceful fallback
- ToolDescription tooltips on all estimator toolbar buttons
- Wired into EstimatorStudio.tsx via "RFQ" button (cyan) — commit `df727b79`, upgraded `953725a1`

**Known Limitations:**
- Plain text output only (no HTML email or PDF)
- No email sending — copy/download only
- No persistence of generated RFQs
- Product enrichment (brightness, IP) awaiting ManufacturerProduct data population

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

## Infrastructure

### §12 — Kreuzberg OCR Integration

**Purpose:** Universal document extraction backend replacing `unpdf` + `pdf-parse` across all server-side extraction points. Kreuzberg v4.3.2 (Rust core, Tesseract + PaddleOCR) handles 75+ file formats with native OCR for scanned documents.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Client | `services/kreuzberg/kreuzbergClient.ts` | ~214 | Universal extraction client + unpdf-compatible wrapper |

**Connectivity:**
- Docker internal: `http://kreuz:8000` (primary)
- Docker alt: `http://basheer_kreuz:8000` (fallback)
- External: `https://basheer-kreuz.prd42b.easypanel.host` (last resort)
- Health check wired into `/api/health` — shows version + status

**Replaced In (7 files):**
| File | Previous Library |
|------|-----------------|
| `services/rfp/rfpExtractor.ts` | unpdf |
| `services/rfp/pdfProcessor.ts` | unpdf |
| `services/ingest/smart-filter.ts` | unpdf |
| `services/ingest/smart-filter-streaming.ts` | unpdf |
| `app/api/rfp/upload/route.ts` | unpdf |
| `app/api/sow/scan/route.ts` | unpdf + pdf-parse |
| `app/api/vendor/parse/route.ts` | unpdf + pdf-parse |

**Key Exports:**
- `extractText(buffer, filename)` — drop-in unpdf replacement, returns `{ text, totalPages, pages[] }`
- `extractDocument(buffer, filename)` — full Kreuzberg result with tables, OCR elements, metadata
- `healthCheck()` — returns `{ ok, version, url }`

**Gains:**
- Scanned PDFs now extractable (OCR) — previously returned "image-only" errors
- DOCX properly parsed (not raw UTF-8 of zip)
- Single extraction path (no more dual unpdf/pdf-parse fallback)
- 75+ format support (PDF, DOCX, DOC, PPTX, images, etc.)

---

## Phase 10 Features

### §13 — Frankenstein Excel Normalizer

**Purpose:** Handle non-standard "ugly" Excel spreadsheets (Moody Center, Huntington Bank Field, etc.) that don't match ANC's standard parser. Uses a "Map Once, Remember Forever" approach — fingerprint the layout, let the user map columns once, then auto-extract on all future uploads with the same layout.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Prisma Model | `prisma/schema.prisma` (ImportProfile) | ~15 | Stores fingerprint + column mapping |
| Migration | `prisma/migrations/20260215070000_add_import_profile/migration.sql` | ~38 | DDL for ImportProfile table |
| Service | `services/import/excelNormalizer.ts` | ~260 | Fingerprint, extract, normalize, save |
| Column Utils | `services/import/columnUtils.ts` | ~30 | Client-safe col letter ↔ index (no node:crypto) |
| API (normalize) | `app/api/import/normalize/route.ts` | ~58 | `POST /api/import/normalize` |
| API (profile) | `app/api/import/profile/route.ts` | ~90 | `POST /api/import/profile` |
| UI | `app/components/import/MappingWizard.tsx` | ~330 | 4-step mapping wizard |

**How It Works:**
1. **Fingerprint** — SHA-256 hash of sorted sheet names + structural content (headers/labels, not data values) of first 10 rows per sheet
2. **Lookup** — `ImportProfile` table matched by fingerprint
3. **Happy Path** — Profile found → extract data using saved column mapping → auto-import (zero user intervention)
4. **Frankenstein Path** — No profile → return 202 with rawPreview → Mapping Wizard UI launches

**Mapping Wizard (4 Steps):**
1. Select Sheet — "Which tab has the data?" (skipped if only 1 sheet)
2. Select Header Row — Click the row with column headers
3. Map Columns — Click a field (Description, Price, Qty...), then click its column
4. Save & Import — Names the profile, saves to DB, extracts data immediately

**Key Technical Decisions:**
- `cellFormula: false` in xlsx.read() — reads computed values, not formula strings
- Merged cell resolution via `sheet["!merges"]` — finds master cell of merge ranges
- Structural fingerprint excludes numeric values so same-format files with different data match
- Data end strategy: `blank_row` (default), `keyword:<text>`, or `row:<n>`
- `columnUtils.ts` separated from `excelNormalizer.ts` to avoid `node:crypto` in client bundles

**Integration Points:**
- `app/api/proposals/import-excel/route.ts` — normalizer runs as fallback when standard parsers fail
- `contexts/ProposalContext.tsx` — handles 202 `mapping_required` response, surfaces `mappingWizardData`
- `app/components/proposal/form/wizard/steps/Step1Ingestion.tsx` — renders MappingWizard when triggered

---

### §14 — Metric Mirror (Imperial/Metric Bridge)

**Purpose:** Eliminate manual math errors when converting client dimensions (Imperial feet) to LED module arrays (Metric mm). The system accepts target dimensions in feet, snaps to the nearest cabinet/module grid, and returns the *actual* physical dimensions back in Imperial — in real time, as the user types.

**Files:**
| File | Path | Lines | Role |
|------|------|-------|------|
| Imperial Formatting | `lib/imperialFormat.ts` | ~100 | `feetToFeetInches()`, `feetToFeetInchesFraction()`, `formatDeltaInches()`, `mmToFeet()`, `feetToMm()` |

**Modified Existing Files:**
| File | Change |
|------|--------|
| `app/components/estimator/QuestionFlow.tsx` | Added Snap Result Card to dimension input; imports `calculateCabinetLayout` + imperial formatting; accepts `productSpecs` + `phase` props |
| `app/components/estimator/EstimatorStudio.tsx` | Passes `productSpecs` prop to QuestionFlow |

**No New Calculation Engine** — leverages existing `calculateCabinetLayout()` in `EstimatorBridge.ts` which already handles:
- Imperial → mm conversion
- Module vs cabinet granularity (Eric's request via `moduleWidthMm`/`moduleHeightMm`)
- Snap-to-nearest rounding (`Math.round`, minimum 1)
- Actual dimensions back in feet with delta
- Resolution, weight, power calculations

**Snap Result Card (shown in dimension input when product selected):**
- **Actual Width/Height** in Feet'-Inches" format (e.g. `9'-10"`) + decimal feet
- **Color-coded delta**: green (<0.5"), amber (≤2"), red (>2")
- **Module Grid**: columns × rows, total cabinets, actual sqft
- **Footer**: resolution (px), weight (lbs), power (W)
- **Hint text** when no product selected: "Select an LED product to see snap-to-grid dimensions"

**Imperial Formatting Helpers:**
| Function | Example |
|----------|--------|
| `feetToFeetInches(9.84)` | `"9'-10""` |
| `feetToFeetInchesFraction(9.84)` | `"9'-10 1/16""` (1/16" precision) |
| `formatDeltaInches(-0.16)` | `{ text: "-1.97\"", isOver: false }` |
| `mmToFeet(3000)` | `9.8425...` |
| `feetToMm(10)` | `3048` |

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
- `app/components/estimator/QuestionFlow.tsx` (modified for Metric Mirror — snap card is self-contained)
- `app/components/estimator/ExcelPreview.tsx`

---

## Completed Integration Work

- [x] Wire `BundlePanel` into `EstimatorStudio.tsx` — commit `9a0a8fe5`
- [x] Wire `ReverseEngineerPanel` into `EstimatorStudio.tsx` (Budget button, teal) — commit `df727b79`
- [x] Wire `LiabilityPanel` into `EstimatorStudio.tsx` (Risk button, rose) — commit `df727b79`
- [x] Wire `RfqPanel` into `EstimatorStudio.tsx` (RFQ button, cyan) — commit `df727b79`
- [x] Wire `RevisionRadarPanel` into `EstimatorStudio.tsx` (Delta button, amber) — commit `fc27ea76`
- [x] Wire `CutSheetPanel` into `EstimatorStudio.tsx` (Cuts button, indigo) — commit `fc27ea76`
- [x] Replace all `unpdf`/`pdf-parse` with Kreuzberg client — commit `8cb142d6`
- [x] Kreuzberg health check in `/api/health` — commit `c67d902f`
- [x] Wire Frankenstein normalizer fallback into `import-excel/route.ts` — commit `deda528b`
- [x] Wire MappingWizard into `Step1Ingestion.tsx` + ProposalContext 202 handling — commit `deda528b`
- [x] Wire Metric Mirror snap card into `QuestionFlow.tsx` + pass `productSpecs` — commit `8cb142d6`
- [x] RFQ Bot V2 — rich preview, RFQ numbering, DB manufacturers, parallel generation — commit `953725a1`

## Remaining Work

- [ ] Add E2E tests for API endpoints
- [ ] Add product catalog data (waiting on Matt) — reverse engineer returns empty if DB has no products
- [x] RFQ Bot V2 — rich preview, RFQ numbering, parallel generation, DB manufacturers — commit `953725a1`
- [ ] Run ImportProfile migration on production DB (`prisma migrate deploy` or manual SQL)
- [ ] Add rounding mode toggle (ceil/floor) to Metric Mirror for hard architectural constraints
- [ ] Add imperial formatting to PDF proposal output (use `feetToFeetInches()` for actual dims)
- [x] Modern Dialog System — replace all native window.confirm/alert with Radix AlertDialog
- [x] Toolbar Descriptions — rich hover cards for all 8 estimator toolbar buttons
- [x] Liability Scanner Fix — scoring logic for conditional checks + severity-aware icons
- [x] Lux Copilot — proper grid layout (pushes content) + remark-gfm for markdown tables
- [x] Kimi/Puter removal — EstimatorCopilot cleaned of all Puter/Kimi references

---

## Commit History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-02-15 | `9a0a8fe5` | Phase 7: Smart Assembly Bundler (5 files, 767 insertions) |
| 2026-02-15 | `505093d7` | Phase 7+8+9: Reverse Engineer + Liability Hunter + Vendor RFQ Bot (9 files, 2365 lines) |
| 2026-02-15 | `df727b79` | Integration: Wire Reverse Engineer, Liability, RFQ panels into EstimatorStudio |
| 2026-02-15 | `fc27ea76` | Phase 8-9: Revision Radar + Visual Cut-Sheet Automator |
| 2026-02-15 | `8cb142d6` | Kreuzberg OCR: Replace unpdf/pdf-parse across 7 files |
| 2026-02-15 | `c67d902f` | Kreuzberg health check in /api/health |
| 2026-02-15 | `deda528b` | Phase 10: Frankenstein Excel Normalizer — Map Once, Remember Forever (10 files, 1203 insertions) |
| 2026-02-15 | `8cb142d6` | Phase 10: Metric Mirror — Imperial/Metric snap-to-grid bridge (3 files, 477 insertions) |
| 2026-02-15 | `953725a1` | Phase 11: RFQ Bot V2 — rich preview, RFQ numbering, parallel generation, DB manufacturers (5 files, 281 insertions) |
| 2026-02-15 | `dc7efa11` | Phase 12: Liability Scanner fix — conditional scoring + severity icons |
| 2026-02-15 | `faed2e74` | Phase 12: Lux Copilot — grid layout + remark-gfm markdown rendering |
| 2026-02-15 | TBD | Phase 12: Modern Dialog System — replace 28 native dialogs across 8 files |

---

*This document is maintained by AI agents working on the Estimator V2 feature set. If you modify any file listed above, update the relevant section.*
