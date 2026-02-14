# Pricing Intelligence — Decision Log & Architecture Record

> **Date:** February 14, 2026
> **Author:** Ahmad Basheer + AI pair programming
> **Branch:** `phase2/product-database`
> **Commits:** `162a422e`, `ee068428`, `8ca7fb96`

---

## WHY THIS EXISTS

ANC had not yet delivered official pricing data, rate cards, or product catalogs.
The project needed a working estimation engine NOW — not after external dependencies were resolved.

**This entire body of work is a PROACTIVE "get shit done" effort.**
Every number, formula, and rate constant was reverse-engineered from real ANC Excel workbooks we already had in-repo.
**None of this came from Matt, ANC, or any official handoff.**

When official data arrives, everything here is designed to be **swapped in-place** without architectural changes.

---

## WHAT WE EXTRACTED (Source of Truth)

### Excel Specimens Analyzed
| File | Type | Location |
|------|------|----------|
| NBCU 2025 Project 9C | Proposal | `test-fixtures/pricing/` |
| Indiana Fever | Proposal | `test-fixtures/pricing/` |
| USC Williams-Brice | Budget | `test-fixtures/pricing/golden/` |
| Atlanta Pigeons | LOI | `specimens/` |
| NBTEST Audit | Audit | `lib/proposals/` |

### Extraction Tool
- Script: `scripts/extract-excel-intel.mjs` — ExcelJS-based, reads formulas + values
- Analysis: `scripts/analyze-findings.mjs` — statistical analysis of extracted data
- Output: `./out/` — CSVs + findings.json
- Run: `npm run extract:intel`

---

## WHAT WE VALIDATED (And What We Disproved)

### ❌ DISPROVED: Dual Margin Hypothesis
The original assumption was "15% margin for Budget, 38% for Proposal."
**The data killed this.** Margin is NOT driven by document type.

### ✅ CONFIRMED: Tiered Margin Model
Margin varies by **cost category** and **display scale**, not doc type:

| Category | Margin | Source | Confidence |
|----------|--------|--------|------------|
| LED Hardware | 30% | NBCU LED Cost Sheet: `=Cost/(1-0.3)`, all 9 displays | **validated** |
| Services (large displays) | 20% | Indiana Fever (6 sheets), USC, NBCU 9C Install | **validated** |
| Services (small, <100 sqft) | 30% | NBCU Ribbon/History/Lounge Install sheets | **validated** |
| LiveSync/CMS/Software | 35% | NBCU Margin Analysis rows 44-48 | **validated** |

### ✅ CONFIRMED: Universal Constants
| Rate | Value | Formula Hits | Confidence |
|------|-------|-------------|------------|
| Bond Rate | 1.5% | `=W*0.015` — 21 hits across ALL files | **universal** |
| NYC Sales Tax | 8.875% | NBCU Margin Analysis (location-specific) | **location-specific** |
| Default Sales Tax | 9.5% | Used when location unknown | **estimated** |
| Spare Parts (LCD) | 5% | `=D*0.05` Indiana Fever | **validated** |
| Warranty Escalation | 10%/yr | `=C*1.1` chain, years 4-10 | **validated** |

### ✅ CONFIRMED: Install Rates ($/lb structural, $/sqft LED install)
| Complexity | Steel Fab ($/lb) | LED Install ($/sqft) | Source |
|-----------|-----------------|---------------------|--------|
| Simple | $25 | $75 | USC Install(Base) |
| Standard | $35 | $105 | Indiana Fever Locker/Gym |
| Complex | $55 | $145 | Indiana Fever HOE/Round |
| Heavy | $75 | $145 | Indiana Fever Round |

### ✅ CONFIRMED: Other Rates
| Rate | Value | Source |
|------|-------|--------|
| Heavy Equipment | $30/lb | USC Install(Base): `=D19*30` |
| PM/GC/Travel | $5/lb | USC Install(Base): `=D19*5` |
| Electrical Materials | $125/sqft | USC Install(Base): `=D19*125` (budget-stage only) |
| LED Cost 1.2mm | $430/sqft | Indiana Fever: `=M*430` |
| LED Cost 2.5mm | ~$335/sqft | NBCU: $105,120 / 314 sqft (calculated, not formula) |

---

## WHAT WE BUILT

### 1. Rate Card System (Persistent, Admin-Editable)

**Why:** Centralize all extracted rates in one place so they can be updated without code changes.

| Component | File | Purpose |
|-----------|------|---------|
| Prisma Model | `prisma/schema.prisma` → `RateCardEntry` | 27 rate constants with category, key, value, unit, provenance, confidence |
| Audit Model | `prisma/schema.prisma` → `RateCardAudit` | Field-level change history on every edit |
| CRUD API | `app/api/rate-card/route.ts` | GET/POST/PUT/DELETE with cache invalidation |
| Import API | `app/api/rate-card/import/route.ts` | CSV bulk upload with upsert on key |
| Audit API | `app/api/rate-card/audit/route.ts` | Change history queries |
| Template API | `app/api/rate-card/template/route.ts` | CSV template download for correct format |
| Admin UI | `app/admin/rate-card/` | Inline edit, search, filter, CSV import/export, change history panel |
| Seed Script | `scripts/seed-rate-card.mjs` | Populate DB with 27 validated defaults |
| Loader Service | `services/rfp/rateCardLoader.ts` | DB-first resolution, 30s cache, hardcoded fallback |

**Replaceability:** When Matt delivers official rates:
1. Open `/admin/rate-card`
2. Upload his CSV or edit inline
3. Confidence flips to "official"
4. No code changes needed

### 2. Hardcoded Rate Constants (Swap-Ready)

**Why:** The estimator needs values immediately, even before DB is populated.

| File | What Changed |
|------|-------------|
| `services/rfp/productCatalog.ts` | Full rewrite with provenance comments on every constant |
| `lib/estimator.ts` | `DEFAULT_MARGIN` updated from 0.25 → 0.30 (validated) |
| `services/pricing/intelligenceMathEngine.ts` | `MARGIN_PRESETS` updated to tiered model |

**Replaceability:** Every constant has a provenance comment like:
```
// NBCU LED Cost Sheet: column V=0.3, ALL 9 displays. Universal.
```
When official data arrives, update the value and change the comment. That's it.

### 3. Estimator Studio (Split-Screen UI)

**Why:** Intelligence Mode needs the same split-screen experience as Mirror Mode.
Mirror Mode = form + PDF preview. Intelligence Mode = questions + Excel preview.

| Component | File | Purpose |
|-----------|------|---------|
| Question Definitions | `app/components/estimator/questions.ts` | 3-phase flow: Project → Display (loop) → Financial |
| Question UI | `app/components/estimator/QuestionFlow.tsx` | Typeform-style, one question at a time, keyboard nav |
| Excel Preview | `app/components/estimator/ExcelPreview.tsx` | Spreadsheet view with sheet tabs, green title bar |
| Calculation Bridge | `app/components/estimator/EstimatorBridge.ts` | Client-side calc engine using validated rates |
| Studio Wrapper | `app/components/estimator/EstimatorStudio.tsx` | 50/50 split layout, export button |
| Page Route | `app/estimator/page.tsx` | Auth-gated entry point |

**Replaceability:** The `EstimatorBridge.ts` client-side engine mirrors server-side `estimator.ts`.
When the rate card loader is fully wired to the estimator, both will read from the same DB-backed rates.

### 4. Product Catalog + Sidebar Integration

**Why:** The existing Product Catalog admin (`/admin/products`) was built but not linked in navigation.

| What | Change |
|------|--------|
| Sidebar | Added Rate Card, Products, and Estimator links to `DashboardSidebar.tsx` |

---

## ARCHITECTURAL DECISIONS

### Decision 1: Hardcoded Fallback + DB Override
**Why not just DB?** The system must work even when DB is empty or unreachable.
**Pattern:** `rateCardLoader.ts` reads DB first → falls back to `productCatalog.ts` constants.

### Decision 2: Client-Side Calculation in EstimatorBridge
**Why not call server?** The Excel preview must update in real-time as the user types.
Server round-trips would make it laggy. The client-side engine uses the same rates and formulas.

### Decision 3: CSV Import with Upsert on Key
**Why upsert?** Matt might send updated rates multiple times. Re-uploading should update existing entries, not create duplicates. The `key` field (e.g., `margin.led_hardware`) is the merge key.

### Decision 4: Provenance + Confidence Tracking
**Why?** When official data replaces extracted data, we need to know what changed and who did it.
Every rate entry has: `provenance` (where it came from), `confidence` (extracted/validated/official), and `RateCardAudit` rows for field-level history.

### Decision 5: Tiered Margin (Not Flat, Not Dual)
**Why?** The data disproved both "flat margin" and "budget vs proposal" hypotheses.
Reality: margin varies by cost category (LED vs services vs software) and display scale (<100 sqft gets higher services margin).

---

## WHAT'S NOT DONE (Pending External Data)

| Item | Waiting On | Current State |
|------|-----------|--------------|
| Official rate card | Matt | Using extracted rates, swap-ready |
| Complete product catalog | Matt / Eric | Partial — have some $/sqft by pitch, missing many |
| Electrical estimator formula | ANC | Only budget-stage rate ($125/sqft) found. No universal formula. |
| LED cost for 1.875mm, 10mm | Matt | No formula found in Excel, appears to be vendor quotes |
| Generated Excel → Mirror Mode loop | Us (next phase) | Export works, auto-feed into Mirror not wired yet |
| Rate card loader → estimator wiring | Us (next phase) | Loader built, not yet called from estimator functions |

---

## FOR THE AI READING THIS LATER

When it's time to replace extracted rates with official data:

1. **DO NOT** refactor the architecture. It's designed for this exact swap.
2. **DO** use `/admin/rate-card` to upload Matt's CSV or edit inline.
3. **DO** update the `confidence` field from "extracted"/"validated" to "official".
4. **DO** update the `provenance` field to reference the delivery (e.g., "Matt delivery 2026-03-15").
5. **DO NOT** delete extracted rates — deactivate them (`isActive = false`) so we keep the history.
6. The `rateCardLoader.ts` cache auto-invalidates on every admin edit. No restart needed.
7. The `RateCardAudit` table tracks every change. You can always see what was extracted vs. what Matt sent.
8. If a rate doesn't exist in the DB, the hardcoded fallback in `productCatalog.ts` kicks in. Update both if you want belt-and-suspenders.

**The goal was never perfection. The goal was a working system that's easy to correct.**
