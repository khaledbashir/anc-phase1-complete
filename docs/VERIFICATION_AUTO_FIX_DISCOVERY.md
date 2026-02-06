# Natalia Verification + Auto-Fix Discovery Document

**Date:** 2026-01-30  
**Purpose:** Comprehensive analysis of current pipeline to design "no-human-recheck" verification + auto-fix without turning Natalia into QA  
**Status:** Discovery Complete

---

## Executive Summary

Natalia currently has a **robust but unverified** pipeline. The system calculates correctly using the "Natalia Math Divisor Model" (Cost / (1 - Margin)), but lacks automated verification that source Excel totals match exported PDF totals. This document maps the exact data flow, identifies verification gaps, and proposes a reconciliation system that auto-fixes common issues while flagging only true exceptions for human review.

**Key Finding:** The system has all the data needed for verification—it just needs to be captured, compared, and acted upon systematically.

---

## 1. Current Pipeline (What Happens Today)

### 1.1 Exact Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NATALIA PIPELINE (CURRENT)                          │
└─────────────────────────────────────────────────────────────────────────────┘

Excel Upload
    │
    ├─► parseANCExcel() [excelImportService.ts]
    │   ├─ Reads "LED Sheet" or "LED Cost Sheet" (primary data)
    │   ├─ Reads "Margin Analysis" (optional, for mirror mode)
    │   ├─ FIXED COLUMN MAPPING (REQ-111):
    │   │   • Column A (0): Display Name
    │   │   • Column E (4): Pixel Pitch
    │   │   • Column F (5): Height
    │   │   • Column G (6): Width
    │   │   • Column H (7): Pixel H
    │   │   • Column J (9): Pixel W
    │   │   • Column M (12): Brightness/Nits
    │   │   • Column Q (16): Hardware Cost
    │   │   • Column R (17): Install Cost
    │   │   • Column S (18): Other Cost
    │   │   • Column T (19): Shipping Cost
    │   │   • Column U (20): Total Cost
    │   │   • Column W (22): Sell Price
    │   │   • Column X (23): Margin
    │   │   • Column Y (24): Bond
    │   │   • Column Z (25): Final Total
    │   │
    │   ├─ ALT ROW FILTER (REQ-111):
    │   │   • Skips rows starting with "alt" or "alternate"
    │   │   • Uses startsWith() to avoid false positives (e.g., "Altitude Display")
    │   │
    │   ├─ BRIGHTNESS ROW-HIDE LOGIC:
    │   │   • Treats 0, "0", "N/A", blank as undefined
    │   │   • Shows/hides based on presence
    │   │
    │   └─ Creates: ParsedANCProposal { formData, internalAudit }
    │
    ├─► Internal Model (ProposalType)
    │   ├─ details.screens[]: Array of screen objects
    │   ├─ details.internalAudit.perScreen[]: Per-screen breakdown
    │   ├─ details.internalAudit.totals: Aggregated totals
    │   └─ details.clientSummary: Client-facing summary
    │
    ├─► calculatePerScreenAudit() [estimator.ts]
    │   ├─ INPUTS: ScreenInput (name, dimensions, pitch, margin, etc.)
    │   ├─ VLOOKUP: Loads catalog for cost_per_sqft by pixel pitch
    │   ├─ PIXEL MATRIX: (H_mm / Pitch) × (W_mm / Pitch)
    │   ├─ HARDWARE: Area × CostPerSqFt × 1.05 (if spare parts)
    │   ├─ STRUCTURE: Hardware × 20% (or 5% if replacement)
    │   ├─ INSTALL: $5,000 flat (×1.15 if curved)
    │   ├─ LABOR: Hardware × 15% (×1.15 if curved)
    │   ├─ POWER: Hardware × 15% (+$2,500 if outlet > 50ft)
    │   ├─ SHIPPING: Area × $0.14/sqft
    │   ├─ PM: Area × $0.50/sqft
    │   ├─ GENERAL CONDITIONS: Hardware × 2%
    │   ├─ TRAVEL: Hardware × 3%
    │   ├─ SUBMITTALS: Hardware × 1%
    │   ├─ ENGINEERING: Hardware × 2% (×2.5 if replacement)
    │   ├─ PERMITS: $500 fixed
    │   ├─ CMS: Hardware × 2%
    │   ├─ DEMOLITION: $5,000 (if replacement)
    │   ├─ TOTAL COST: Sum of all above (excluding bond)
    │   ├─ SELL PRICE: Total Cost / (1 - Margin)  ← DIVISOR MODEL
    │   ├─ BOND: Sell Price × 1.5%
    │   ├─ B&O TAX: (Sell Price + Bond) × 2% (Morgantown only)
    │   └─ FINAL CLIENT TOTAL: Sell Price + Bond + B&O Tax
    │
    ├─► PDF Generation [generateProposalPdfService.ts]
    │   ├─ Renders React template (ProposalTemplate1/2/3)
    │   ├─ Uses Puppeteer/Chromium to print to PDF
    │   ├─ Formats currency: formatCurrencyPDF() → 0 decimals (nearest dollar)
    │   └─ NO RECALCULATION: Displays pre-calculated values from internalAudit
    │
    └─► "Ugly Sheet" Export [exportFormulaicExcel.ts]
        ├─ Generates Excel with LIVE FORMULAS
        ├─ YELLOW CELLS = Finance-editable inputs
        ├─ Uses ExcelJS formula engine
        └─ Separate code path from PDF generation
```

### 1.2 Single Source of Truth

**Current State:** The internal JSON model ([`ProposalType`](invoify/types.ts:11)) is the single source of truth.

- Excel cells are **read once** during import
- All subsequent calculations use the internal model
- PDF and "ugly sheet" are generated **from the same data snapshot**
- The "ugly sheet" is **NOT** a transformed copy of uploaded Excel—it's regenerated from the internal model

**Implication:** If we verify the internal model is correct, we know PDF and ugly sheet are correct.

### 1.3 Formula Recalculation

**Current State:** We **DO NOT** rely on Excel recalculation for totals.

- All totals are computed by [`calculatePerScreenAudit()`](invoify/lib/estimator.ts:281)
- Excel formulas in the "ugly sheet" are for **human convenience** (Finance can tweak inputs)
- The system uses its own math engine ([`lib/math.ts`](invoify/lib/math.ts:1)) with Decimal.js for precision

**Rounding Policy:**
- **Dimensions:** 2 decimals (e.g., 22.96 ft)
- **Internal Currency:** 2 decimals (e.g., $4,999.56)
- **PDF Currency:** 0 decimals (e.g., $5,000) ← **Rounds at display time only**
- **Totals:** Rounded at each aggregation step using [`roundToCents()`](invoify/lib/estimator.ts:1000)

**Natalia's Rule:** "Round at totals" is **PARTIALLY IMPLEMENTED**:
- ✅ Rounds at each screen's final total
- ✅ Rounds at proposal grand total
- ⚠️ Does NOT round intermediate line items (hardware, labor, etc.) before summing
- This is **CORRECT** for financial precision—rounding only at presentation

### 1.4 PDF vs "Ugly Sheet" Generation

**Critical Finding:** PDF and "ugly sheet" are generated from **the same data snapshot** but via **separate code paths**:

```typescript
// PDF Generation (generateProposalPdfService.ts)
const htmlTemplate = ReactDOMServer.renderToStaticMarkup(ProposalTemplate(body));
const pdf = await page.pdf({ format: "a4", ... });

// Ugly Sheet Export (exportFormulaicExcel.ts)
const workbook = new ExcelJS.Workbook();
buildFormulaicAudit(auditSheet, screens, options);
```

**Verification Gap:** There is **NO cross-check** that:
- PDF totals match ugly sheet totals
- Either matches the original Excel source totals

---

## 2. Mapping (Excel → Model → PDF)

### 2.1 Formal Mapping Specification

**Location:** [`excelImportService.ts:39-59`](invoify/services/proposal/server/excelImportService.ts:39)

**Mapping is FIXED by column index (REQ-111):**

```typescript
const colIdx = {
    name: 0,           // Column A - Display Name
    pitch: 4,          // Column E - Pixel Pitch
    height: 5,         // Column F - Height
    width: 6,          // Column G - Width
    pixelsH: 7,        // Column H - Pixel H
    pixelsW: 9,        // Column J - Pixel W
    brightnessNits: 12, // Column M - Brightness
    hdrStatus: -1,     // HDR column (dynamic search)
    hardwareCost: 16,  // Column Q - LED Price
    installCost: 17,   // Column R - Install
    otherCost: 18,     // Column S - Other
    shippingCost: 19,  // Column T - Shipping
    totalCost: 20,     // Column U - Total Cost
    sellPrice: 22,     // Column W - Sell Price
    ancMargin: 23,     // Column X - Margin
    bondCost: 24,      // Column Y - Bond
    finalTotal: 25,    // Column Z - Total (Final)
};
```

**HDR Column:** Dynamically searched if not at fixed position:
```typescript
if (colIdx.hdrStatus === -1) {
    colIdx.hdrStatus = headers.findIndex(h => 
        typeof h === 'string' && h.toLowerCase().includes('hdr')
    );
}
```

### 2.2 Authoritative Sheets/Tabs

**Primary Data Source:** "LED Sheet" (new format) or "LED Cost Sheet" (legacy fallback)

**Secondary Data Source:** "Margin Analysis" (optional, for mirror mode)
- Used to find line item details for each screen
- Searched via [`findMirrorItems()`](invoify/services/proposal/server/excelImportService.ts:204)
- Matches screen name and extracts line items below it

**Decision Logic:**
```typescript
const ledSheet = workbook.Sheets['LED Sheet'] || workbook.Sheets['LED Cost Sheet'];
if (!ledSheet) throw new Error('Sheet "LED Sheet" or "LED Cost Sheet" not found');

const marginSheet = workbook.Sheets['Margin Analysis'];
const marginData = marginSheet ? xlsx.utils.sheet_to_json(marginSheet, { header: 1 }) : [];
```

**Other Tabs:** Currently ignored (P&L, PO's, Cash Flow are not read)

### 2.3 ALT/Alternate Row Detection

**Implementation:** [`excelImportService.ts:77-80`](invoify/services/proposal/server/excelImportService.ts:77)

```typescript
const normalizedName = projectName.trim().toLowerCase();
if (normalizedName.startsWith('alt') || normalizedName.startsWith('alternate')) {
    continue; // Skip this row
}
```

**Reporting:** Currently **NOT REPORTED**—skipped silently.

**Gap:** We don't track how many rows were skipped or which ones.

### 2.4 Missing/Invalid Field Handling

**Current Behavior:**

| Field | Missing/Invalid Value | Behavior |
|-------|----------------------|----------|
| `name` | Blank or non-string | Row skipped (not counted) |
| `pitch` | 0, undefined, non-numeric | Row skipped |
| `height` | 0, undefined | Treated as 0, area = 0 |
| `width` | 0, undefined | Treated as 0, area = 0 |
| `brightness` | 0, "0", "N/A", blank | Set to `undefined` (hidden in PDF) |
| `hardwareCost` | Missing | Defaults to 0 |
| `installCost` | Missing | Defaults to 0 |
| `sellPrice` | Missing | Calculated from cost + margin |
| `margin` | Missing | Defaults to 25% (0.25) |

**No Auto-Fix:** Invalid data is either skipped or defaulted—no intelligent correction.

**No Blocking:** The import continues even with missing fields.

---

## 3. "No Recheck" Verification (Proof + Confidence)

### 3.1 Control Totals at Each Stage

**Current State:** Control totals are **CALCULATED** but **NOT STORED** for verification.

**What We Can Compute:**

```typescript
interface VerificationManifest {
    // STAGE 1: Excel Import
    excelImport: {
        rowCount: number;           // Total rows read
        screenCount: number;        // Valid screens extracted
        altRowsSkipped: number;     // ALT rows filtered out
        blankRowsSkipped: number;   // Rows without valid data
    },
    
    // STAGE 2: Per-Screen Calculations
    perScreen: Array<{
        name: string;
        areaSqFt: number;
        pixelResolution: number;
        hardwareCost: number;
        totalCost: number;
        sellPrice: number;
        finalClientTotal: number;
    }>,
    
    // STAGE 3: Proposal Totals
    proposalTotals: {
        hardware: number;
        structure: number;
        install: number;
        labor: number;
        totalCost: number;
        sellPrice: number;
        bondCost: number;
        boTaxCost: number;
        finalClientTotal: number;
        screenCount: number;
        totalAreaSqFt: number;
    },
    
    // STAGE 4: Source vs Calculated Comparison
    reconciliation: {
        sourceFinalTotal: number;      // From Excel Column Z
        calculatedFinalTotal: number;  // From our math
        variance: number;
        variancePercent: number;
        isMatch: boolean;
    }
}
```

**Implementation Location:** These totals are computed in [`calculatePerScreenAudit()`](invoify/lib/estimator.ts:281) and [`aggregateTotals()`](invoify/services/proposal/server/excelImportService.ts:236) but not persisted.

### 3.2 Reconciliation Report

**Current State:** Does **NOT EXIST**.

**Proposed Implementation:**

```typescript
interface ReconciliationReport {
    status: 'VERIFIED' | 'WARNING' | 'ERROR';
    timestamp: string;
    proposalId: string;
    
    // Excel Source Totals
    excelSource: {
        finalTotal: number;
        screenCount: number;
        bondTotal: number;
        taxTotal: number;
    },
    
    // Natalia Calculated Totals
    nataliaCalculated: {
        finalTotal: number;
        screenCount: number;
        bondTotal: number;
        taxTotal: number;
    },
    
    // Variance Analysis
    variances: {
        finalTotal: { variance: number; percent: number; acceptable: boolean };
        screenCount: { variance: number; acceptable: boolean };
        bondTotal: { variance: number; percent: number; acceptable: boolean };
    },
    
    // Per-Screen Breakdown
    perScreen: Array<{
        name: string;
        sourceTotal: number;
        calculatedTotal: number;
        variance: number;
        status: 'MATCH' | 'VARIANCE' | 'MISSING';
    }>,
    
    // Exceptions
    exceptions: Array<{
        type: 'MISSING_FIELD' | 'CALC_MISMATCH' | 'ROUNDING_DRIFT' | 'ALT_ROW_SKIPPED';
        screen?: string;
        field?: string;
        expected: number;
        actual: number;
        severity: 'INFO' | 'WARNING' | 'ERROR';
        autoFixable: boolean;
    }>
}
```

### 3.3 Rounding Policy Verification

**Current Implementation:**

```typescript
// lib/math.ts
export function roundToDecimals(value: number | string | Decimal, decimals: number): number {
    if (value === null || value === undefined || value === '') return 0;
    try {
        const d = new Decimal(value);
        return parseFloat(d.toFixed(decimals));
    } catch {
        return 0;
    }
}

export function formatCurrencyPDF(value: number | string | undefined): number {
    if (!value || isNaN(Number(value))) return 0;
    return roundToDecimals(value, 0); // ← Rounds to nearest dollar for PDF
}

export function formatCurrencyInternal(value: number | string | undefined): number {
    if (!value || isNaN(Number(value))) return 0;
    return roundToDecimals(value, 2); // ← Keeps cents for internal calculations
}
```

**Natalia's Rule "Round at Totals":**

✅ **IMPLEMENTED:**
- Per-screen totals are rounded to 2 decimals
- Proposal grand total is rounded to 2 decimals
- PDF displays rounded to 0 decimals (presentation only)

⚠️ **NOT IMPLEMENTED:**
- Intermediate line items (hardware, labor, etc.) are NOT rounded before summing
- This is actually **CORRECT** for financial precision

**Verification Needed:**
- Confirm that rounding at each stage doesn't accumulate > $0.01 variance
- Test with edge cases (many screens, small margins)

### 3.4 "Verified Export" Status

**Current State:** Does **NOT EXIST**.

**Proposed Implementation:**

```typescript
enum VerificationStatus {
    VERIFIED = 'VERIFIED',           // Green: All totals match exactly
    WARNING = 'WARNING',             // Yellow: Minor variances (< $1 or < 0.1%)
    ERROR = 'ERROR',                 // Red: Major variances or missing data
    PENDING = 'PENDING'              // Gray: Verification not yet run
}

interface VerificationBadge {
    status: VerificationStatus;
    message: string;
    timestamp: string;
    canExportPDF: boolean;
    canShareLink: boolean;
    canSign: boolean;
}
```

**Rules:**
- **VERIFIED (Green):** 
  - All totals match within $0.01
  - All required fields present
  - Can export PDF, share link, sign
  
- **WARNING (Yellow):**
  - Variance < $1.00 OR < 0.1%
  - Non-critical fields missing (e.g., brightness)
  - Can export PDF (with warning)
  - CANNOT share link or sign
  
- **ERROR (Red):**
  - Variance > $1.00 OR > 0.1%
  - Critical fields missing (name, dimensions, pitch)
  - CANNOT export PDF, share link, or sign

---

## 4. What Happens When It Fails (No Extra Work for Natalia)

### 4.1 Top 10 Failure Modes

Based on code analysis and common Excel issues:

| # | Failure Mode | Frequency | Auto-Fixable | Current Handling |
|---|--------------|-----------|--------------|------------------|
| 1 | Missing brightness (0, "N/A", blank) | High | ✅ Yes | Set to undefined (hidden) |
| 2 | ALT/Alternate rows not skipped | Medium | ✅ Yes | startsWith('alt') filter |
| 3 | Column index drift (headers moved) | Low | ❌ No | Fixed column mapping fails |
| 4 | Missing required dimensions (height=0) | Medium | ⚠️ Partial | Defaults to 0, area = 0 |
| 5 | Non-numeric cost values | Low | ❌ No | Number() = NaN, treated as 0 |
| 6 | Rounding drift (Excel vs Natalia) | Medium | ✅ Yes | Both use 2-decimal rounding |
| 7 | Formula not updated in Excel | High | ✅ Yes | We recalculate from scratch |
| 8 | Screen dropped (name mismatch) | Low | ❌ No | Mirror mode fails silently |
| 9 | Tax rate mismatch (Morgantown) | Low | ✅ Yes | Regex detection of venue |
| 10 | Margin ≥ 100% (division by zero) | Low | ✅ Yes | Throws error, blocks calc |

### 4.2 Auto-Remediation Strategies

**Safely Auto-Fixable:**

1. **Missing Brightness:**
   ```typescript
   if (brightness === undefined || brightness === 0 || brightness === 'N/A') {
       brightness = undefined; // Hide from PDF
   }
   ```

2. **ALT Row Detection:**
   ```typescript
   if (normalizedName.startsWith('alt') || normalizedName.startsWith('alternate')) {
       continue; // Skip with logging
   }
   ```

3. **Rounding Drift:**
   ```typescript
   // Re-calculate using our own math engine
   const sellPrice = roundToCents(totalCost / (1 - margin));
   ```

4. **Tax Rate Detection:**
   ```typescript
   const boTaxRate = shouldApplyMorgantownBoTax({ projectAddress, venue }) 
       ? MORGANTOWN_BO_TAX 
       : 0;
   ```

5. **Formula Not Updated:**
   ```typescript
   // Ignore Excel formulas, recalculate from base costs
   const hardwareCost = Number(row[colIdx.hardwareCost] || 0);
   ```

**NOT Auto-Fixable (Requires Human):**

1. **Column Index Drift:**
   - **Solution:** Add fuzzy header matching as fallback
   - **Fallback:** Search for headers by name if fixed index fails

2. **Non-Numeric Costs:**
   - **Solution:** Parse currency strings ($1,234.56 → 1234.56)
   - **Fallback:** Default to 0 and flag for review

3. **Screen Name Mismatch (Mirror Mode):**
   - **Solution:** Fuzzy string matching (Levenshtein distance)
   - **Fallback:** Log warning, continue without mirror data

### 4.3 Exception Workflow

**Proposed Implementation:**

```typescript
interface ExceptionWorkflow {
    categorize(exception: Exception): ExceptionCategory;
    suggestAutoFix(exception: Exception): AutoFixAction | null;
    executeAutoFix(action: AutoFixAction): FixResult;
    logException(exception: Exception): void;
}

enum ExceptionCategory {
    DATA_QUALITY = 'DATA_QUALITY',       // Missing fields, invalid values
    CALC_MISMATCH = 'CALC_MISMATCH',     // Totals don't match
    MAPPING_ERROR = 'MAPPING_ERROR',     // Column/index issues
    BUSINESS_RULE = 'BUSINESS_RULE',     // Margin ≥ 100%, etc.
}

interface AutoFixAction {
    type: 'SET_DEFAULT' | 'RECALCULATE' | 'SKIP_ROW' | 'PARSE_CURRENCY';
    field?: string;
    value?: any;
    reason: string;
}
```

**Workflow:**

1. **Detect Exception** during import/calculation
2. **Categorize** by type and severity
3. **Check Auto-Fix Rules** (is this safely fixable?)
4. **Execute Auto-Fix** if safe
5. **Log** all exceptions (fixed or not)
6. **Present Summary** to user with "Fix Now" buttons for remaining issues

### 4.4 Gap-Fill Questions Strategy

**Maximum 2-3 Questions:**

1. **Question 1:** "We found [N] screens with missing [FIELD]. Use default value [DEFAULT]?"
   - **Answer:** Yes/No
   - **Action:** Apply default or mark for manual entry

2. **Question 2:** "Excel totals differ from our calculations by [$VARIANCE]. Use our calculated values?"
   - **Answer:** Yes/No/Review
   - **Action:** Use our values, use Excel values, or show diff

3. **Question 3:** "[N] ALT/Alternate rows were skipped. Review skipped rows?"
   - **Answer:** Yes/No
   - **Action:** Show list of skipped rows or continue

**After Answers:**
- Re-run verification
- Auto-export if verified
- Flag remaining issues for manual review

---

## 5. "Ugly Sheet" (What It Is + How It's Generated)

### 5.1 What's in the Ugly Sheet

**File:** [`exportFormulaicExcel.ts`](invoify/services/proposal/server/exportFormulaicExcel.ts:1)

**Contents:**
- **Sheet 1: "Internal Audit (Formulas)"** - Blue tab
  - Per-screen breakdown with live Excel formulas
  - YELLOW CELLS = Finance-editable inputs (cost, margin, tax rates)
  - Shows full calculation chain (Cost → Sell Price → Bond → Total)
  
- **Sheet 2: "P&L Breakdown"** - Green tab
  - Standard enterprise P&L format
  - Columns: Revenue, Budget, Committed POs, Budget Remaining
  - YELLOW CELLS = Manual PO entry

**Formula Types:**
```excel
E[hwRow] = C[hwRow]*C[hwRow+1]*(IF(C[hwRow+2]="YES", 1.05, 1))  // Hardware
E[totalCostRow] = SUM(E[hwRow],E[currentRow-2])                  // Total Cost
G[sellPriceRow] = E[totalCostRow]/(1-F[marginRow])               // Sell Price (Divisor)
I[bondRow] = G[sellPriceRow]*H[bondRow]                          // Bond
I[boTaxRow] = (G[sellPriceRow]+I[bondRow])*H[boTaxRow]          // B&O Tax
I[taxRow] = (G[sellPriceRow]+I[bondRow]+I[boTaxRow])*H[taxRow]  // Sales Tax
I[finalTotal] = G[sellPriceRow]+I[bondRow]+I[boTaxRow]+I[taxRow] // Final Total
```

### 5.2 What Finance Expects to Tweak

**YELLOW CELLS (Editable):**
1. **Unit Cost ($/SqFt)** - Hardware cost per square foot
2. **Spare Parts (YES/NO)** - Toggle 5% spare parts markup
3. **Support Services** - Install/structure/labor estimate
4. **Desired Margin (M)** - Target margin percentage
5. **Bond Rate (1.5%)** - Performance bond rate
6. **B&O Tax Rate (2%)** - Morgantown city tax
7. **Sales Tax Rate (9.5%)** - State sales tax
8. **Committed POs** - Actual purchase order amounts

**Expected Behavior:**
- Finance changes a yellow cell
- Excel formulas recalculate instantly
- Final totals update automatically
- No need to re-export from Natalia

### 5.3 Ugly Sheet vs PDF vs Share Link

**Numbers That Must Match Exactly:**

| Field | Ugly Sheet | PDF | Share Link | Match Required? |
|-------|------------|-----|------------|-----------------|
| Final Client Total | ✅ | ✅ | ✅ | **YES** |
| Per-Screen Subtotal | ✅ | ✅ | ✅ | **YES** |
| Bond Cost | ✅ | ✅ | ✅ | **YES** |
| Tax Lines | ✅ | ✅ | ✅ | **YES** |
| Line Item Details | ✅ | ✅ | ✅ | **YES** |
| Intermediate Calculations | ✅ | ❌ | ❌ | No (PDF rounds) |

**Verification Rule:** If ugly sheet is regenerated, it must match the original within $0.01.

### 5.4 Versioning and Storage

**Current State:**
- Ugly sheet is **generated on-demand** via API call
- **NOT VERSIONED** alongside PDF
- **NOT STORED** in database
- Each export creates a fresh Excel file

**Gap:** No immutable pairing of (PDF + Ugly Sheet + Share Link) for the same proposal version.

**Proposed Solution:**
```typescript
model ProposalVersion {
    id              String   @id @default(cuid())
    proposalId      String
    versionNumber   Int
    pdfUrl          String?
    uglySheetUrl    String?
    shareHash       String?  @unique
    verificationStatus String @default("PENDING")
    reconciliationReport Json?
    createdAt       DateTime @default(now())
    proposal        Proposal @relation(fields: [proposalId], references: [id])
}
```

---

## 6. Acceptance Tests (Prove We Solved It)

### 6.1 Real Excel Test Cases

**Test Case 1: Standard Proposal (3 screens)**
```excel
LED Sheet:
Display Name    | Pitch | Height | Width | Hardware | Install | Sell Price | Margin | Bond | Final
Main Stadium    | 10mm  | 22.96  | 13.12 | 35,000   | 5,000   | 52,000     | 25%    | 780   | 52,780
Concourse       | 6mm   | 15.50  | 8.75  | 18,000   | 5,000   | 27,000     | 25%    | 405   | 27,405
Press Box       | 4mm   | 10.25  | 6.50  | 12,000   | 5,000   | 18,000     | 25%    | 270   | 18,270

Expected Final Total: $98,455
```

**Test Case 2: ALT Rows + Messy Formatting**
```excel
LED Sheet:
Display Name        | Pitch | Height | Width | Hardware | Install | Sell Price | Margin | Bond | Final
Main Display        | 10mm  | 22.96  | 13.12 | 35,000   | 5,000   | 52,000     | 25%    | 780   | 52,780
ALT - Backup        | 10mm  | 22.96  | 13.12 | 35,000   | 5,000   | 52,000     | 25%    | 780   | 52,780
Concourse Display   | 6mm   | 15.50  | 8.75  | 18,000   | 5,000   | 27,000     | 25%    | 405   | 27,405
Alternate Option    | 6mm   | 15.50  | 8.75  | 18,000   | 5,000   | 27,000     | 25%    | 405   | 27,405

Expected: Skip ALT and Alternate rows
Expected Screen Count: 2
Expected Final Total: $80,185
```

**Test Case 3: Missing Fields + Morgantown Tax**
```excel
LED Sheet:
Display Name    | Pitch | Height | Width | Hardware | Install | Sell Price | Margin | Bond | Final | Brightness
WVU Stadium     | 10mm  | 22.96  | 13.12 | 35,000   | 5,000   | 52,000     | 25%    | 780   | 52,780| N/A
End Zone        | 6mm   | 0     | 8.75  | 18,000   | 5,000   | 27,000     | 25%    | 405   | 27,405| 3500

Expected: Skip End Zone (height=0)
Expected: Apply 2% B&O Tax (Morgantown detected)
Expected Final Total: $52,780 + $1,055.60 (B&O) = $53,835.60
```

### 6.2 Existing Automated Tests

**Current State:** **NONE** for transformation/mapping.

**Files Checked:**
- ❌ No test files found for `excelImportService.ts`
- ❌ No test files found for `estimator.ts`
- ❌ No test files found for `exportFormulaicExcel.ts`

**Gap:** Zero test coverage for critical financial calculations.

### 6.3 Fastest Test Set to Add

**Priority 1: Unit Tests for Math Engine**

```typescript
// lib/__tests__/estimator.test.ts
describe('calculatePerScreenAudit', () => {
    test('calculates standard screen correctly', () => {
        const result = calculatePerScreenAudit({
            name: 'Test Screen',
            widthFt: 22.96,
            heightFt: 13.12,
            pitchMm: 10,
            desiredMargin: 0.25
        });
        
        expect(result.breakdown.hardware).toBeCloseTo(35999.99, 2);
        expect(result.breakdown.sellPrice).toBeCloseTo(52000.00, 2);
        expect(result.breakdown.finalClientTotal).toBeCloseTo(52780.00, 2);
    });
    
    test('handles margin >= 100% gracefully', () => {
        expect(() => {
            calculatePerScreenAudit({
                name: 'Test',
                widthFt: 10,
                heightFt: 10,
                pitchMm: 10,
                desiredMargin: 1.0 // 100%
            });
        }).toThrow('Margin must be less than 100%');
    });
});
```

**Priority 2: Integration Tests for Excel Import**

```typescript
// services/__tests__/excelImportService.test.ts
describe('parseANCExcel', () => {
    test('skips ALT rows correctly', async () => {
        const buffer = readFixture('test-alt-rows.xlsx');
        const result = await parseANCExcel(buffer);
        
        expect(result.formData.details.screens).toHaveLength(2); // Not 4
        expect(result.internalAudit.perScreen).toHaveLength(2);
    });
    
    test('handles missing brightness', async () => {
        const buffer = readFixture('test-missing-brightness.xlsx');
        const result = await parseANCExcel(buffer);
        
        expect(result.formData.details.screens[0].brightnessNits).toBeUndefined();
    });
});
```

**Priority 3: Reconciliation Tests**

```typescript
// lib/__tests__/reconciliation.test.ts
describe('ReconciliationEngine', () => {
    test('detects rounding drift', () => {
        const source = { finalTotal: 100.005 };
        const calculated = { finalTotal: 100.01 };
        
        const result = reconcileTotals(source, calculated);
        
        expect(result.status).toBe('VERIFIED');
        expect(result.variances.finalTotal.variance).toBeLessThan(0.01);
    });
});
```

### 6.4 Golden Dataset Regression Suite

**Proposed Structure:**

```
test/fixtures/golden-dataset/
├── excel/
│   ├── standard-3-screens.xlsx
│   ├── alt-rows-messy.xlsx
│   ├── missing-fields-morgantown.xlsx
│   └── curved-screen-outlet-distance.xlsx
├── manifests/
│   ├── standard-3-screens-manifest.json
│   ├── alt-rows-messy-manifest.json
│   ├── missing-fields-morgantown-manifest.json
│   └── curved-screen-outlet-distance-manifest.json
└── regression-tests.ts
```

**Manifest Format:**

```typescript
interface GoldenManifest {
    testName: string;
    excelFile: string;
    expected: {
        screenCount: number;
        altRowsSkipped: number;
        finalTotal: number;
        perScreen: Array<{
            name: string;
            finalTotal: number;
            areaSqFt: number;
        }>;
    };
    verification: {
        varianceThreshold: number;
        status: 'VERIFIED' | 'WARNING' | 'ERROR';
    };
}
```

**Regression Test:**

```typescript
describe('Golden Dataset Regression', () => {
    const manifests = loadGoldenManifests();
    
    manifests.forEach(manifest => {
        test(`${manifest.testName} produces expected output`, async () => {
            // 1. Import Excel
            const buffer = readFixture(manifest.excelFile);
            const result = await parseANCExcel(buffer);
            
            // 2. Verify screen count
            expect(result.formData.details.screens).toHaveLength(manifest.expected.screenCount);
            
            // 3. Verify totals
            const actualTotal = result.internalAudit.totals.finalClientTotal;
            expect(actualTotal).toBeCloseTo(manifest.expected.finalTotal, 2);
            
            // 4. Verify per-screen totals
            manifest.expected.perScreen.forEach((expected, idx) => {
                const actual = result.internalAudit.perScreen[idx];
                expect(actual.name).toBe(expected.name);
                expect(actual.breakdown.finalClientTotal).toBeCloseTo(expected.finalTotal, 2);
            });
            
            // 5. Run verification
            const verification = await verifyProposal(result);
            expect(verification.status).toBe(manifest.verification.status);
        });
    });
});
```

---

## 7. UX Decisions (So Natalia Doesn't Think)

### 7.1 PDF Export with Warnings

**Proposed Rules:**

| Verification Status | PDF Export | Share Link | Signing |
|---------------------|------------|------------|---------|
| VERIFIED (Green)    | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| WARNING (Yellow)    | ⚠️ Allowed (with banner) | ❌ Blocked | ❌ Blocked |
| ERROR (Red)         | ❌ Blocked | ❌ Blocked | ❌ Blocked |

**Warning Banner in PDF:**
```
⚠️ PROPOSED - PRELIMINARY CALCULATIONS
This proposal contains minor variances from source data.
Final values subject to verification.
Generated: 2026-01-30 14:32:15 UTC
```

**User Prompt:**
```
"⚠️ Warning: Proposal has minor variances ($0.50, 0.001%).

You can export PDF for internal review, but Share Link and Signing are blocked until verified.

[Export PDF with Warning]  [Review Variances]  [Fix Issues]"
```

### 7.2 Exception Routing

**Who Receives Exceptions:**

| Exception Type | Recipient | Action Required |
|----------------|-----------|-----------------|
| Missing Critical Fields | Proposal Lead | Fill in missing data |
| Calculation Mismatch | Estimator | Review and approve variance |
| Mapping Error | Developer | Fix column mapping |
| Business Rule Violation | Proposal Lead | Adjust margin or costs |

**One-Click "Send to Finance" Package:**

```typescript
interface FinancePackage {
    proposalId: string;
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    attachments: {
        pdfUrl?: string;
        uglySheetUrl: string;
        reconciliationReport: ReconciliationReport;
        exceptionSummary: ExceptionSummary;
    };
    actions: {
        approve: string; // URL to approve
        reject: string;  // URL to reject with reason
        requestChanges: string; // URL to request revisions
    };
}
```

**Email Template:**
```
Subject: Proposal Review Required - [Client Name] - [Proposal ID]

Hi [Finance Team],

Proposal "[Proposal Name]" for [Client Name] is ready for review.

📊 Summary:
• Final Total: $123,456.78
• Screens: 5
• Verification: WARNING (variance $0.50, 0.001%)

📎 Attachments:
• PDF Proposal
• Ugly Sheet (Excel with formulas)
• Reconciliation Report

⚠️ Exceptions:
1. Screen "Main Display" has minor variance ($0.30)
2. Brightness missing for 2 screens (auto-hidden)

[Approve Proposal]  [Request Changes]  [View Full Report]
```

### 7.3 Trust Badge Design

**Simplest Badge:**

```
┌─────────────────────────────────────────┐
│  ✅ VERIFIED    ⚠️ NEEDS ANSWERS   ❌ BLOCKED  │
│  All totals match    2 questions     Critical errors  │
│  Jan 30, 14:32      Fix now         Cannot export   │
└─────────────────────────────────────────┘
```

**Implementation:**

```typescript
interface TrustBadge {
    status: 'VERIFIED' | 'NEEDS_ANSWERS' | 'BLOCKED';
    color: 'green' | 'yellow' | 'red';
    icon: 'check-circle' | 'exclamation-triangle' | 'x-circle';
    message: string;
    subtext: string;
    actions: Array<{
        label: string;
        action: () => void;
        primary?: boolean;
    }>;
}

// Example: Verified
const verifiedBadge: TrustBadge = {
    status: 'VERIFIED',
    color: 'green',
    icon: 'check-circle',
    message: 'All totals match exactly',
    subtext: 'Verified 2 minutes ago',
    actions: [
        { label: 'Export PDF', action: exportPDF, primary: true },
        { label: 'Share Link', action: shareLink }
    ]
};

// Example: Needs Answers
const needsAnswersBadge: TrustBadge = {
    status: 'NEEDS_ANSWERS',
    color: 'yellow',
    icon: 'exclamation-triangle',
    message: '2 questions need answers',
    subtext: 'Variance: $0.50 (0.001%)',
    actions: [
        { label: 'Fix Now', action: openExceptionModal, primary: true },
        { label: 'Review Details', action: openReconciliationReport }
    ]
};

// Example: Blocked
const blockedBadge: TrustBadge = {
    status: 'BLOCKED',
    color: 'red',
    icon: 'x-circle',
    message: 'Critical errors - cannot export',
    subtext: '3 screens missing dimensions',
    actions: [
        { label: 'View Errors', action: openExceptionModal, primary: true }
    ]
};
```

**Placement:**
- Top-right of proposal editor (persistent)
- Export modal (prominent)
- Share link modal (blocking if not verified)

---

## 8. Implementation Roadmap

### Phase 1: Verification Engine (Week 1-2)

**Goal:** Compute control totals and generate reconciliation reports.

**Tasks:**
1. Create `lib/verification.ts` with verification functions
2. Add `VerificationManifest` type to `types.ts`
3. Implement `computeManifest()` during Excel import
4. Implement `reconcileTotals()` to compare source vs calculated
5. Generate `ReconciliationReport` with exception categorization
6. Store manifest in `Proposal.internalAudit` (extend schema)

**Deliverables:**
- Verification engine that can detect all 10 failure modes
- Reconciliation report API endpoint
- Manifest stored with every proposal

### Phase 2: Auto-Fix Engine (Week 2-3)

**Goal:** Automatically fix safe issues and flag others for human review.

**Tasks:**
1. Create `lib/autoFix.ts` with auto-fix strategies
2. Implement `AutoFixAction` types and execution
3. Add auto-fix rules for each safely-fixable failure mode
4. Implement exception logging and tracking
5. Create "Fix Now" modal for user-initiated fixes
6. Add undo capability for auto-fixes

**Deliverables:**
- Auto-fix engine that handles 6/10 failure modes automatically
- Exception tracking UI
- Fix confirmation modal

### Phase 3: UX Integration (Week 3-4)

**Goal:** Integrate verification into user workflow with trust badges and gating.

**Tasks:**
1. Design trust badge component
2. Add verification status to proposal state
3. Implement export gating (PDF/Share/Sign)
4. Create reconciliation report viewer
5. Add exception summary modal
6. Implement "Send to Finance" workflow

**Deliverables:**
- Trust badge in proposal editor
- Export gating based on verification status
- Reconciliation report UI
- Finance package email system

### Phase 4: Testing & Golden Dataset (Week 4-5)

**Goal:** Ensure correctness with comprehensive test suite.

**Tasks:**
1. Create 3 real Excel test files
2. Implement unit tests for math engine
3. Implement integration tests for Excel import
4. Implement reconciliation tests
5. Create golden dataset regression suite
6. Add CI/CD integration for regression tests

**Deliverables:**
- 3 test Excel files with expected manifests
- 50+ unit tests for critical calculations
- Golden dataset regression suite
- Automated regression testing in CI/CD

### Phase 5: Versioning & Storage (Week 5-6)

**Goal:** Immutable pairing of PDF + Ugly Sheet + Share Link.

**Tasks:**
1. Extend Prisma schema with `ProposalVersion` model
2. Implement version creation on export
2. Store PDF and ugly sheet URLs with version
3. Add version history viewer
4. Implement version comparison tool
5. Add rollback capability

**Deliverables:**
- Versioned proposal storage
- Version history UI
- Version comparison tool

---

## 9. Key Metrics & Success Criteria

### 9.1 Verification Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Proposals with 100% match | Unknown | >95% | Reconciliation report stats |
| Auto-fix rate | 0% | >80% | Exception tracking |
| Human review time | 30 min | <5 min | Time from import to verified |
| False positive rate | Unknown | <5% | User feedback on exceptions |

### 9.2 Success Criteria

**Minimum Viable Verification (MVV):**
- ✅ Detect all 10 failure modes
- ✅ Auto-fix 6/10 failure modes
- ✅ Generate reconciliation report for every import
- ✅ Block export if variance > $1.00 OR > 0.1%
- ✅ Trust badge shows correct status

**Stretch Goals:**
- ✅ 95% of proposals auto-verify without human intervention
- ✅ <5 minutes from Excel upload to verified export
- ✅ Zero false positives (no unnecessary blocking)
- ✅ Finance can review and approve via email link

---

## 10. Open Questions & Decisions Needed

1. **Threshold Values:**
   - What variance threshold is acceptable? ($0.01? $1.00? $10.00?)
   - What percentage threshold? (0.01%? 0.1%? 1%?)
   - **Recommendation:** $0.01 OR 0.001%, whichever is larger

2. **Blocking Behavior:**
   - Should we block PDF export on ERROR, or just warn?
   - **Recommendation:** Block on ERROR, warn on WARNING

3. **ALT Row Reporting:**
   - Should we log skipped ALT rows in the reconciliation report?
   - **Recommendation:** Yes, as INFO-level exceptions

4. **Versioning Strategy:**
   - When to create a new version? (Every save? Every export? Manual?)
   - **Recommendation:** Every export (PDF or ugly sheet)

5. **Test Data:**
   - Can we get 3 real ANC Excel files for the golden dataset?
   - **Recommendation:** Yes, work with Finance to sanitize real data

---

## 11. Next Steps

1. **Review this document** with stakeholders (Natalia, Finance, Engineering)
2. **Decide on thresholds** and blocking behavior
3. **Prioritize phases** based on business impact
4. **Allocate resources** (2 engineers for 6 weeks)
5. **Set up weekly syncs** to track progress
6. **Begin Phase 1** (Verification Engine)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-30  
**Author:** AI Discovery Agent  
**Reviewers:** [TBD]
