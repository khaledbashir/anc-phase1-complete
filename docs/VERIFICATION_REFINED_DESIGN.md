# Verification System - Refined Design Document

**Version:** 2.0  
**Date:** 2026-01-30  
**Status:** Design Review - Ready for Implementation  
**Authors:** Kilo Code + User Feedback Integration

---

## Executive Summary

This document refines the 4-layer verification system design based on critical feedback about **single source of truth**, **deterministic verification**, **safe editing**, and **ANC's audit-proof rounding contract**. The system provides "no-human-recheck" verification through automated checks while maintaining financial rigor.

**Key Changes from v1:**
- ✅ Eliminated two-source-of-truth risk - editable preview is a view layer, not a separate state
- ✅ Layer 4 is now deterministic (row-by-row comparison) with AI for explanation, not pixel comparison
- ✅ Removed `contentEditable` for money fields - using click-to-edit modals and controlled inputs
- ✅ **ANC Rounding Contract: ROUND_HALF_EVEN, category totals only, all currency shows cents**
- ✅ Clarified editing scope: line-item inputs (Option B) with optional final-total overrides (Option C)
- ✅ All money comparisons use Decimal.js (never JS number) for deterministic verification
- ✅ Canonical snapshot hashing for long-term integrity (replaces runtime deepEqual)

---

## 1. System Architecture

### 1.1 Single Source of Truth Principle

**Core Rule:** The proposal data model is the ONLY source of truth. Everything else (PDF preview, ugly sheet, share link) is a VIEW derived from that model.

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPOSAL DATA MODEL                       │
│  (Single Source of Truth - Database + Computed State)        │
│                                                              │
│  • ProposalMetadata (client, dates, project info)           │
│  • ScreenConfig[] (display name, quantity, dimensions)      │
│  • CostLineItem[] (unit cost, margin, calculations)         │
│  • Charges (tax rate, bond rate, custom charges)            │
│  • InternalAudit (all computed totals, per-screen math)     │
│  • VerificationManifest (control totals at each stage)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌──────────────┐  ┌─────────────────┐  ┌──────────────┐
│ PDF Preview  │  │  Ugly Sheet     │  │ Share Link   │
│ (Editable    │  │  (Excel export) │  │ (Read-only)  │
│  View Layer) │  │                 │  │              │
└──────────────┘  └─────────────────┘  └──────────────┘
```

**Implication:** When user edits in PDF preview, we update the underlying model and re-render ALL views from that single source.

### 1.2 Editing Scope (Decision: Option B + C)

**Primary Editing (Option B): Line-Item Cost Inputs**

Users can edit these fields through the PDF preview:
- **Screen-level:** Display name, quantity, width, height, pixel pitch
- **Cost-line-item:** Unit cost, margin %, description
- **Charges:** Tax rate, bond rate, custom charge amounts

**Secondary Editing (Option C): Final-Total Overrides (with Audit Trail)**

For special cases (client discount, executive adjustment), users can:
- Override the final proposal total
- Must provide reason code (required field)
- Must provide approver name (required field)
- Creates audit log entry: `{ timestamp, user, oldValue, newValue, reason, approver }`

**What Users CANNOT Edit:**
- Computed subtotals (these recalculate from line items)
- Per-screen totals (these recalculate from quantity × unit cost)
- Rounding-adjusted values (these recalculate deterministically)

**Why This Approach:**
- Line-item editing (B) gives surgical control to fix specific issues
- Final-total override (C) handles rare "executive discount" scenarios
- Prevents random edits that break math (e.g., editing a subtotal directly)
- Maintains audit trail for all manual changes

---

## 2. 4-Layer Verification System (Refined)

### Layer 1: Excel Source vs Natalia Calculated (Deterministic)

**What It Checks:** Does our calculated model match the uploaded Excel totals?

**How It Works (Deterministic):**
```typescript
// For each screen in Excel:
const excelScreenTotal = ExcelParser.getScreenTotal(screenId);
const nataliaScreenTotal = InternalAudit.screens[screenId].finalTotal;

const variance = excelScreenTotal - nataliaScreenTotal;
const percentVariance = variance / excelScreenTotal;

// Check if within threshold
const isMatch = Math.abs(variance) <= 0.01 && Math.abs(percentVariance) <= 0.001;
```

**Control Totals Captured:**
- Screen count (how many displays)
- Per-screen subtotal (before tax/bond) - rounded HALF_EVEN to 2 decimals
- Bond amount (if applicable) - rounded HALF_EVEN to 2 decimals
- B&O Tax amount (if applicable) - rounded HALF_EVEN to 2 decimals
- Sales Tax amount (if applicable) - rounded HALF_EVEN to 2 decimals
- Final total (after all charges) - rounded HALF_EVEN to 2 decimals

**Pass Criteria:** All HALF_EVEN-rounded category totals match within $0.01 and 0.1% (comparing Decimal values, not JS numbers)

### Layer 2: PDF Render vs Ugly Sheet (Deterministic)

**What It Checks:** Does the PDF we generate match the ugly sheet Excel we export?

**How It Works (Deterministic):**
```typescript
// Both PDF and Ugly Sheet are generated from the SAME InternalAudit
// Both must display currency to 2 decimals (cents) - no exceptions

const pdfSnapshot = PDFGenerator.getDataSnapshot(proposalId);
const uglySheetSnapshot = UglySheetGenerator.getDataSnapshot(proposalId);

// Verify snapshots are identical using canonical hash (stable JSON stringify)
const pdfHash = canonicalJsonHash(pdfSnapshot);
const uglySheetHash = canonicalJsonHash(uglySheetSnapshot);
const snapshotsMatch = pdfHash === uglySheetHash;

// Note: "Shows cents" is enforced at render layer (toFixed(2)), not validated here
// The PDF and Ugly Sheet generators must use toFixed(2) when displaying currency

// Verify totals match (using Decimal, not JS number)
const pdfTotal = new Decimal(pdfSnapshot.proposalTotals.finalTotal);
const uglySheetTotal = new Decimal(uglySheetSnapshot.proposalTotals.finalTotal);
const threshold = new Decimal(0.01);
const totalsMatch = pdfTotal.minus(uglySheetTotal).abs().lessThanOrEqualTo(threshold);

// Fail deterministically if rounding differs
const bothUseHalfEven = pdfSnapshot.roundingMode === 'HALF_EVEN' && uglySheetSnapshot.roundingMode === 'HALF_EVEN';
```

**Pass Criteria:** Data snapshots are identical (canonical hash matches), both show cents (2 decimals), both use HALF_EVEN rounding, and totals match within $0.01 (using Decimal comparison)

### Layer 3: Rounding Consistency (Deterministic with Contract)

**What It Checks:** Are we following ANC's rounding contract (round only at category totals, HALF_EVEN, 2 decimals)?

**Rounding Contract (Audit-Proof):**

```typescript
/**
 * ANC ROUNDING CONTRACT
 *
 * INTERNAL STORAGE: Always use Decimal.js with 20 decimal places
 * INTERMEDIATE VALUES: No rounding during calculation steps
 * DISPLAY: All currency displays to 2 decimals (cents) - no exceptions
 * PERSISTENCE: Store money as Prisma Decimal or integer cents (never Float)
 *
 * Rounding Points (Category Totals Only):
 * 1. Subtotal: round( sum of all screen totals, 2 ) - HALF_EVEN
 * 2. Bond: round( subtotal × bondRate, 2 ) - HALF_EVEN
 * 3. B&O Tax: round( (subtotal + bond) × boRate, 2 ) - HALF_EVEN
 * 4. Sales Tax: round( (subtotal + bond + B&O) × taxRate, 2 ) - HALF_EVEN
 * 5. Final Total: round( subtotal + bond + B&O + salesTax, 2 ) - HALF_EVEN
 *
 * Calculation Flow (No Intermediate Rounding):
 * Cost Basis → Selling Price → Bond → B&O → Sales Tax
 * (All kept at full Decimal precision until category totals)
 *
 * Rounding Mode: ROUND_HALF_EVEN (banker's rounding)
 * - Reduces systematic bias across repeated rounding decisions
 * - At the rounding digit, 0.5 rounds to nearest EVEN digit
 * - Example (rounding to 2 decimals):
 *   - 2.345 → 2.34 (4 is even)
 *   - 2.355 → 2.36 (6 is even)
 *   - 12500.005 → 12500.00 (0 is even)
 *   - 12500.015 → 12500.02 (2 is even)
 *
 * Audit Trail: Every rounding operation logs:
 * - { stage, input, rounded, delta, roundingMode, timestamp }
 *
 * Display Enforcement (Not Validation):
 * - PDF/Ugly Sheet: always use toFixed(2) at render layer
 * - Never validate "shows cents" by inspecting raw numeric strings
 * - Trailing zeros are a display concern, not a storage concern
 *
 * Example:
 * - Input: 12500.005 (Subtotal before rounding)
 * - Rounded: 12500.00 (HALF_EVEN - third decimal is 5, second decimal 0 is even)
 * - Delta: -0.005
 * - Logged for audit trail
 * - Displayed: "$12,500.00" (toFixed(2) at render)
 */
```

**How It Works (Deterministic):**
```typescript
// Verify rounding only happens at category totals
const roundingOperations = RoundingAudit.getOperations();
const intermediateRounding = roundingOperations.filter(op =>
    !['Subtotal', 'Bond', 'B&O', 'Sales Tax', 'Final Total'].includes(op.stage)
);
const noIntermediateRounding = intermediateRounding.length === 0;

// Verify all rounding uses HALF_EVEN
const allHalfEven = roundingOperations.every(op =>
    op.roundingMode === 'ROUND_HALF_EVEN'
);

// Verify all displayed totals are 2 decimals
const allTwoDecimals = roundingOperations.every(op =>
    op.rounded.toString().split('.')[1]?.length === 2
);

// Verify rounding deltas are explainable (no unexpected drift)
const maxDrift = Math.max(...roundingOperations.map(op => Math.abs(op.delta)));
const driftExplainable = maxDrift < 0.01; // Max 1 cent drift

// Use Decimal for all comparisons (not JS number)
const threshold = new Decimal(0.01);
const isConsistent = new Decimal(maxDrift).lessThanOrEqualTo(threshold);
```

**Pass Criteria:** All displayed totals equal HALF_EVEN-rounded category totals to 2 decimals, and rounding deltas are explainable from the contract (no unexpected drift)

### Layer 4: AI Visual Verification (Deterministic + Assistive AI)

**What It Checks:** Row-by-row comparison of Excel vs PDF with AI explanation

**What It Is NOT:** Pixel-by-pixel image comparison (brittle, expensive)

**How It Works (Deterministic Core + AI Explanation):**

```typescript
// Step 1: Deterministic row-by-row comparison
const excelRows = ExcelParser.getRows();
const pdfRows = PDFParser.getRows();

const rowComparisons = excelRows.map(excelRow => {
    const pdfRow = pdfRows.find(r => r.rowId === excelRow.rowId);
    
    if (!pdfRow) {
        return { rowId: excelRow.rowId, status: 'MISSING_IN_PDF' };
    }
    
    // Compare all fields deterministically
    const fieldComparisons = [
        { field: 'displayName', excel: excelRow.displayName, pdf: pdfRow.displayName },
        { field: 'quantity', excel: excelRow.quantity, pdf: pdfRow.quantity },
        { field: 'unitCost', excel: excelRow.unitCost, pdf: pdfRow.unitCost },
        { field: 'subtotal', excel: excelRow.subtotal, pdf: pdfRow.subtotal },
    ];
    
    const mismatches = fieldComparisons.filter(f => f.excel !== f.pdf);
    
    return {
        rowId: excelRow.rowId,
        status: mismatches.length > 0 ? 'MISMATCH' : 'MATCH',
        mismatches,
    };
});

// Step 2: AI explains mismatches (only when deterministic check finds issues)
const aiExplanations = await AI.explainMismatches(rowComparisons.filter(r => r.status === 'MISMATCH'));

// Step 3: AI locates source in Excel/PDF (only for ambiguous mismatches)
const aiLocations = await AI.locateMismatchSources(rowComparisons);
```

**AI Role (Assistive, Not Primary):**
- **Explain:** "Screen 110660 subtotal differs because Excel has tax included but PDF shows pre-tax"
- **Locate:** "The mismatch is in Excel cell E45, which has a manual override"
- **Propose:** "Fix by updating unit cost from $12,500 to $12,450 to match Excel"

**Pass Criteria:** All rows match deterministically OR AI explains mismatches and user accepts

---

## 3. Editable PDF Preview (Safe Implementation)

### 3.1 What "Editable" Means

**Definition:** Users can edit proposal data THROUGH the PDF preview interface, but we're editing the underlying model, not the PDF itself.

**Flow:**
```
User clicks "Edit" on a field in PDF preview
    ↓
Show editing UI (modal or inline input) based on field type
    ↓
User changes value and clicks "Save"
    ↓
Update underlying proposal data in database
    ↓
Recalculate all totals from single source of truth
    ↓
Re-run verification (all 4 layers)
    ↓
Re-render PDF preview with new values
    ↓
Show "Verified" or "Warning" status
```

### 3.2 Editing Techniques by Field Type

**Technique 1: Click-to-Edit Modal (for Money Values)**

```typescript
// Screen total, unit cost, margin % - use modal
<EditableCurrency 
    value={screen.unitCost}
    onSave={(newValue) => {
        // Update underlying model
        await updateScreenCost(screen.id, { unitCost: newValue });
        
        // Recalculate everything
        const newAudit = await recalculateProposal(proposalId);
        
        // Re-verify
        const verification = await verifyProposal(proposalId);
        
        // Re-render
        renderPDFPreview(newAudit);
    }}
/>
```

**Modal UI:**
- Clean, focused editing (one field at a time)
- Currency formatting enforced ($12,345.67)
- Validation on save (must be number, must be positive)
- Shows current value, allows edit, cancel, or save
- After save: shows spinner, then updates preview

**Technique 2: Inline Controlled Input (for Non-Money Fields)**

```typescript
// Display name, quantity, dimensions - use inline input
<EditableText
    value={screen.displayName}
    onSave={(newValue) => {
        // Update underlying model
        await updateScreenMetadata(screen.id, { displayName: newValue });
        
        // Recalculate (if needed)
        const newAudit = await recalculateProposal(proposalId);
        
        // Re-render
        renderPDFPreview(newAudit);
    }}
/>
```

**Inline UI:**
- Text becomes input on click
- Press Enter or click away to save
- Press Escape to cancel
- Shows validation errors inline

**Technique 3: Read-Only with Override (for Computed Values)**

```typescript
// Per-screen subtotal, final total - show override button
<ComputedValueWithOverride
    value={screen.subtotal}
    onOverride={(overrideValue, reason, approver) => {
        // Create override record with audit trail
        await createManualOverride({
            proposalId,
            field: 'screen.subtotal',
            screenId: screen.id,
            originalValue: screen.subtotal,
            overrideValue,
            reason,
            approver,
            timestamp: new Date(),
        });
        
        // Recalculate with override applied
        const newAudit = await recalculateProposal(proposalId);
        
        // Re-verify (will show warning about manual override)
        const verification = await verifyProposal(proposalId);
        
        // Re-render
        renderPDFPreview(newAudit);
    }}
/>
```

**Override UI:**
- Shows computed value (read-only)
- "Override" button opens modal
- Modal requires: new value, reason (dropdown), approver (text)
- Shows warning: "This will create a manual override logged for audit"
- After save: shows "Manual Override" badge next to value

### 3.3 What We NEVER Do

- ❌ Use `contentEditable` for money fields (validation nightmare)
- ❌ Allow editing computed values directly without override flow
- ❌ Create a separate "preview state" that diverges from model
- ❌ Allow editing without recalculation and re-verification
- ❌ Allow editing without audit trail

---

## 4. Auto-Fix Engine (6/10 Failure Modes)

### 4.1 Failure Modes We Auto-Fix

| # | Failure Mode | Auto-Fix | Detection | Fix Action |
|---|--------------|----------|-----------|------------|
| 1 | Missing required field | ✅ | Field is blank or null | Fill with default or estimate from similar screens |
| 2 | Wrong data type | ✅ | "N/A" in number field | Strip non-numeric, parse as number |
| 3 | Extra units in value | ✅ | "$12,500 USD" instead of 12500 | Extract numeric part, parse |
| 4 | Trailing/leading whitespace | ✅ | " 110660 " instead of "110660" | Trim whitespace |
| 5 | Inconsistent decimal places | ✅ | Mix of 12500 and 12500.00 | Normalize to 2 decimals |
| 6 | Wrong header row detected | ✅ | ALT rows included as screens | Re-run header detection with stricter rules |

### 4.2 Failure Modes We Flag for Human Review

| # | Failure Mode | Auto-Fix | Why Not Auto-Fix |
|---|--------------|----------|------------------|
| 7 | Screen dropped entirely | ❌ | Could be legitimate (client removed screen) |
| 8 | Formula not updated | ❌ | Requires judgment (is formula wrong or data changed?) |
| 9 | Rounding drift > $0.01 | ❌ | Indicates deeper math issue |
| 10 | Mapping error (wrong column) | ❌ | Requires human to verify correct mapping |

### 4.3 Auto-Fix Implementation

```typescript
const autoFixRules: AutoFixRule[] = [
    {
        id: 'missing-field-default',
        type: 'MISSING_FIELD',
        severity: 'WARNING',
        autoFixable: true,
        detect: (exception) => exception.type === 'MISSING_FIELD',
        fix: async (exception, proposal) => {
            const { field, screenId } = exception.context;
            
            // Find similar screens to estimate value
            const similarScreens = await findSimilarScreens(proposal, screenId);
            const estimatedValue = estimateFromSimilar(similarScreens, field);
            
            // Apply fix
            await updateScreenField(screenId, field, estimatedValue);
            
            return {
                applied: true,
                action: 'DEFAULT_VALUE',
                description: `Filled missing ${field} with estimated value ${estimatedValue}`,
            };
        },
    },
    
    {
        id: 'strip-non-numeric',
        type: 'INVALID_TYPE',
        severity: 'WARNING',
        autoFixable: true,
        detect: (exception) => exception.type === 'INVALID_TYPE',
        fix: async (exception, proposal) => {
            const { field, rawValue } = exception.context;
            
            // Extract numeric part
            const numericValue = parseCurrency(rawValue);
            
            // Apply fix
            await updateScreenField(exception.context.screenId, field, numericValue);
            
            return {
                applied: true,
                action: 'NORMALIZE_NUMBER',
                description: `Converted "${rawValue}" to ${numericValue}`,
            };
        },
    },
    
    // ... 4 more rules
];
```

---

## 5. Data Model Implications

### 5.1 Decimal.js Configuration

**Global Setup (Required):**

```typescript
import Decimal from 'decimal.js';

// Configure Decimal.js globally for ANC rounding contract
Decimal.set({
    precision: 20,              // 20 decimal places for intermediate calculations
    rounding: Decimal.ROUND_HALF_EVEN,  // Banker's rounding (reduces systematic bias)
    toExpNeg: -7,               // Exponential notation threshold
    toExpPos: 21,
    maxE: 9e15,
    minE: -9e15,
    crypto: false,
    modulo: Decimal.ROUND_HALF_EVEN,
});

// Helper function for consistent rounding
export function roundToCents(value: Decimal | number | string): Decimal {
    const decimal = new Decimal(value);
    return decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

// Helper function for category totals
export function roundCategoryTotal(value: Decimal | number | string, category: string): Decimal {
    const rounded = roundToCents(value);
    
    // Log for audit trail
    RoundingAudit.log({
        stage: category,
        input: new Decimal(value),
        rounded: rounded,
        delta: rounded.minus(value),
        roundingMode: 'ROUND_HALF_EVEN',
        timestamp: new Date().toISOString(),
    });
    
    return rounded;
}
```

**Critical Rule:** Never use JS `number` type for money comparisons. Always use `Decimal` type.

```typescript
// ❌ WRONG - uses JS number (flaky)
const isMatch = Math.abs(total1 - total2) < 0.01;

// ✅ CORRECT - uses Decimal (deterministic)
const isMatch = new Decimal(total1).minus(total2).abs().lessThanOrEqualTo(new Decimal(0.01));
```

### 5.2 Canonical Snapshot Hash

**Purpose:** Replace runtime `deepEqual` with stable, hash-based comparison for long-term integrity.

```typescript
// Canonical JSON stringify (stable key ordering with recursive sort)
export function canonicalJsonHash(obj: any): string {
    // Recursively sort object keys for true canonical representation
    function stableStringify(obj: any): string {
        if (obj === null || typeof obj !== 'object') {
            if (obj instanceof Decimal) {
                return obj.toString(); // Serialize Decimal as string
            }
            return JSON.stringify(obj);
        }
        
        if (Array.isArray(obj)) {
            return '[' + obj.map(stableStringify).join(',') + ']';
        }
        
        // Sort keys recursively for deterministic ordering
        const sortedKeys = Object.keys(obj).sort();
        return '{' + sortedKeys.map(key =>
            JSON.stringify(key) + ':' + stableStringify(obj[key])
        ).join(',') + '}';
    }
    
    const canonical = stableStringify(obj);
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

// Usage in Layer 2 verification
const pdfHash = canonicalJsonHash(pdfSnapshot);
const uglySheetHash = canonicalJsonHash(uglySheetSnapshot);
const snapshotsMatch = pdfHash === uglySheetHash;
```

### 5.3 Database Schema Changes

```prisma
// Existing models
model Proposal {
    id              String   @id
    // ... existing fields
    
    // NEW: Verification fields
    verificationManifest   Json?
    reconciliationReport   Json?
    verificationStatus     VerificationStatus @default(PENDING)
    lastVerifiedAt         DateTime?
    
    // NEW: Manual overrides
    manualOverrides       ManualOverride[]
    
    // NEW: Proposal versions (immutable)
    versions              ProposalVersion[]
}

model ManualOverride {
    id              String   @id
    proposalId      String
    proposal        Proposal @relation(fields: [proposalId], references: [id])
    
    // What was overridden
    entityType      String   // "screen", "charge", "proposalTotal"
    entityId        String   // screen ID or "proposal"
    field           String   // "unitCost", "subtotal", "finalTotal"
    
    // Override details (Decimal or integer cents - never Float)
    originalValue   Decimal  // Use Decimal type for money
    overrideValue   Decimal  // Use Decimal type for money
    reason          String   // "Client discount", "Executive adjustment"
    approver        String   // Who approved
    
    // Audit trail
    createdBy       String   // User ID
    createdAt       DateTime @default(now())
    
    @@index([proposalId])
}

model ProposalVersion {
    id              String   @id
    proposalId      String
    proposal        Proposal @relation(fields: [proposalId], references: [id])
    
    // Immutable snapshot
    versionNumber   Int
    manifest        Json     // VerificationManifest snapshot
    auditData       Json     // InternalAudit snapshot
    pdfUrl          String?
    uglySheetUrl    String?
    
    // Version metadata
    createdAt       DateTime @default(now())
    createdBy       String
    changeReason    String   // "Initial import", "Manual edit", "Auto-fix"
    
    @@index([proposalId])
}
```

### 5.2 Type Definitions

```typescript
// Already created in types/verification.ts
// These types support the refined design:

interface VerificationManifest {
    // Control totals at each stage
    excelSource: SourceTotals;
    nataliaCalculated: CalculatedTotals;
    pdfRender: PDFTotals;
    uglySheet: UglySheetTotals;
    
    // Reconciliation results
    reconciliation: ReconciliationReport;
    
    // Per-screen verification
    perScreen: PerScreenManifest[];
    
    // All 4 layers
    layers: {
        layer1: LayerVerification;  // Excel vs Calculated
        layer2: LayerVerification;  // PDF vs Ugly Sheet
        layer3: LayerVerification;  // Rounding
        layer4: LayerVerification;  // AI Visual
    };
}

interface ManualOverride {
    id: string;
    entityType: 'screen' | 'charge' | 'proposalTotal';
    entityId: string;
    field: string;
    originalValue: number;
    overrideValue: number;
    reason: string;
    approver: string;
    createdBy: string;
    createdAt: string;
}
```

---

## 6. API Endpoints

### 6.1 Verification Endpoints

```typescript
// POST /api/proposals/verify
// Runs all 4 layers, returns verification report
async function verifyProposal(req, res) {
    const { proposalId } = req.body;
    
    // Compute manifest
    const manifest = await computeManifest(proposalId);
    
    // Detect exceptions
    const exceptions = await detectExceptions(manifest);
    
    // Run auto-fix
    const autoFixResults = await runAutoFix(proposalId, exceptions);
    
    // Generate reconciliation report
    const report = await generateReconciliationReport(manifest, exceptions);
    
    // Save to database
    await saveVerification(proposalId, {
        manifest,
        report,
        exceptions,
        autoFixResults,
    });
    
    return { manifest, report, exceptions, autoFixResults };
}

// POST /api/proposals/auto-fix
// Runs auto-fix on specific exceptions
async function runAutoFix(req, res) {
    const { proposalId, exceptionIds } = req.body;
    
    const results = await executeAutoFix(proposalId, exceptionIds);
    
    return { results };
}

// POST /api/proposals/reconcile
// Generates reconciliation report
async function reconcileProposal(req, res) {
    const { proposalId } = req.body;
    
    const report = await generateReconciliationReport(proposalId);
    
    return report;
}
```

### 6.2 Editing Endpoints

```typescript
// PATCH /api/proposals/:proposalId/screens/:screenId
// Updates screen data, recalculates, re-verifies
async function updateScreen(req, res) {
    const { proposalId, screenId } = req.params;
    const updates = req.body; // { displayName, quantity, unitCost, margin }
    
    // Update screen
    const updatedScreen = await updateScreenData(screenId, updates);
    
    // Recalculate proposal
    const newAudit = await recalculateProposal(proposalId);
    
    // Re-verify
    const verification = await verifyProposal(proposalId);
    
    // Create version snapshot
    await createProposalVersion(proposalId, {
        manifest: verification.manifest,
        auditData: newAudit,
        changeReason: 'Manual edit',
    });
    
    return { screen: updatedScreen, audit: newAudit, verification };
}

// POST /api/proposals/:proposalId/overrides
// Creates manual override with audit trail
async function createOverride(req, res) {
    const { proposalId } = req.params;
    const { entityType, entityId, field, overrideValue, reason, approver } = req.body;
    
    // Get current value
    const currentValue = await getCurrentValue(proposalId, entityType, entityId, field);
    
    // Create override record
    const override = await prisma.manualOverride.create({
        data: {
            proposalId,
            entityType,
            entityId,
            field,
            originalValue: currentValue,
            overrideValue,
            reason,
            approver,
            createdBy: req.user.id,
        },
    });
    
    // Recalculate with override
    const newAudit = await recalculateProposal(proposalId);
    
    // Re-verify
    const verification = await verifyProposal(proposalId);
    
    return { override, audit: newAudit, verification };
}
```

---

## 7. UI Components

### 7.1 Trust Badge Component

```typescript
<TrustBadge 
    status={verification.status} // VERIFIED | WARNING | ERROR | BLOCKED
    layers={verification.manifest.layers}
    onClick={() => setShowVerificationDetails(true)}
/>

// Renders:
// ✅ VERIFIED (All 4 layers passed)
// ⚠️ WARNING (3/4 layers passed, 1 auto-fixed)
// ❌ ERROR (2/4 layers failed, manual fix needed)
// 🚫 BLOCKED (Critical error, cannot export)
```

### 7.2 Reconciliation Report Viewer

```typescript
<ReconciliationReportViewer 
    report={verification.report}
    exceptions={verification.exceptions}
    onFixException={(exceptionId) => fixException(exceptionId)}
    onAutoFix={(exceptionIds) => runAutoFix(exceptionIds)}
/>

// Shows:
// - Summary: 15 screens verified, 0 with variance
// - Per-screen breakdown with variance details
// - Exceptions list with fix buttons
// - Auto-fix summary
```

### 7.3 Editable PDF Preview

```typescript
<EditablePDFPreview 
    proposal={proposal}
    audit={audit}
    verification={verification}
    onEditField={(field, value) => handleEdit(field, value)}
    onCreateOverride={(field, value, reason, approver) => handleOverride(field, value, reason, approver)}
/>

// Features:
// - Renders PDF preview with edit buttons on editable fields
// - Click to edit: shows modal or inline input
// - Real-time recalculation after save
// - Shows verification status after each edit
// - Highlights fields with manual overrides
```

### 7.4 AI Verification Progress

```typescript
<AIVerificationProgress 
    progress={aiVerification.progress} // 0-100
    currentRow={aiVerification.currentRow} // "Screen 110660"
    status={aiVerification.status} // "Verifying row 15 of 20..."
    findings={aiVerification.findings} // Array of mismatches found
/>

// Shows:
// - Progress bar with percentage
// - Current row being verified
// - Real-time status updates
// - List of findings as they're discovered
// - "View Details" button for each finding
```

---

## 8. Acceptance Criteria

### 8.1 Functional Requirements

**FR-1: Single Source of Truth**
- [ ] All views (PDF, ugly sheet, share link) render from same proposal model
- [ ] Editing in PDF preview updates model and re-renders all views
- [ ] No separate "preview state" exists

**FR-2: 4-Layer Verification**
- [ ] Layer 1: Excel vs Calculated HALF_EVEN-rounded totals match within $0.01 and 0.1%
- [ ] Layer 2: PDF and Ugly Sheet use identical data snapshots (canonical hash), both show cents
- [ ] Layer 3: All rounding uses ROUND_HALF_EVEN at category totals only, max drift < $0.01
- [ ] Layer 4: Row-by-row comparison with AI explanation for mismatches

**FR-3: Auto-Fix**
- [ ] Auto-fixes 6/10 common failure modes automatically
- [ ] Flags remaining 4/10 for human review
- [ ] Creates audit log for all auto-fix actions

**FR-4: Manual Overrides**
- [ ] Users can override computed values with reason + approver
- [ ] All overrides logged in audit trail
- [ ] Overrides shown in verification report

**FR-5: Editing Safety**
- [ ] No contentEditable for money fields
- [ ] All edits go through model update → recalculation → re-verification flow
- [ ] Currency validation enforced for all money inputs

### 8.2 Non-Functional Requirements

**NFR-1: Performance**
- [ ] Verification completes in < 5 seconds for 20-screen proposal
- [ ] PDF preview re-renders in < 2 seconds after edit
- [ ] AI verification completes in < 10 seconds

**NFR-2: Accuracy**
- [ ] Zero false positives in verification (99.9% precision)
- [ ] Zero false negatives for critical errors (100% recall)
- [ ] Rounding errors < $0.01 across all calculations (HALF_EVEN, category totals only)
- [ ] All money comparisons use Decimal type (never JS number)
- [ ] All currency displays show 2 decimals (cents) - no exceptions

**NFR-3: Audit Trail**
- [ ] Every edit logged with user, timestamp, before/after values
- [ ] Every override logged with reason, approver, timestamp
- [ ] Every auto-fix logged with action, result, timestamp

**NFR-4: Usability**
- [ ] Verification status visible at all times (trust badge)
- [ ] One-click access to detailed reconciliation report
- [ ] Clear error messages with actionable fix suggestions

---

## 9. Testing Strategy

### 9.1 Rounding Contract Tests

```typescript
// Test HALF_EVEN rounding behavior (at 2 decimals)
describe('Rounding Contract', () => {
    it('should round 2.345 to 2.34 (4 is even)', () => {
        const result = roundToCents(2.345);
        expect(result.toNumber()).toBe(2.34);
    });
    
    it('should round 2.355 to 2.36 (6 is even)', () => {
        const result = roundToCents(2.355);
        expect(result.toNumber()).toBe(2.36);
    });
    
    it('should round 12500.005 to 12500.00 (0 is even)', () => {
        const result = roundToCents(12500.005);
        expect(result.toNumber()).toBe(12500.00);
    });
    
    it('should round 12500.015 to 12500.02 (2 is even)', () => {
        const result = roundToCents(12500.015);
        expect(result.toNumber()).toBe(12500.02);
    });
    
    it('should keep full precision for intermediate calculations', () => {
        const cost = new Decimal(10000);
        const margin = new Decimal(0.20);
        const sellingPrice = cost.div(new Decimal(1).minus(margin)); // Exactly 12500
        
        // Even exact values maintain Decimal precision internally
        expect(sellingPrice instanceof Decimal).toBe(true);
        expect(sellingPrice.precision()).toBeGreaterThan(0);
    });
    
    it('should create repeating decimals for certain margins', () => {
        const cost = new Decimal(10000);
        const margin = new Decimal(0.19); // Creates repeating decimal
        const sellingPrice = cost.div(new Decimal(1).minus(margin)); // 12345.679012345...
        
        // Should keep full precision (not rounded)
        expect(sellingPrice.decimalPlaces()).toBeGreaterThan(2);
    });
    
    it('should round only at category totals', () => {
        const operations = RoundingAudit.getOperations();
        const categories = ['Subtotal', 'Bond', 'B&O', 'Sales Tax', 'Final Total'];
        
        operations.forEach(op => {
            expect(categories).toContain(op.stage);
            expect(op.roundingMode).toBe('ROUND_HALF_EVEN');
        });
    });
});

// Test Decimal usage (no JS numbers for money)
describe('Decimal Usage', () => {
    it('should use Decimal for all money comparisons', () => {
        const total1 = new Decimal(12500.00);
        const total2 = new Decimal(12500.01);
        const threshold = new Decimal(0.01);
        
        const isMatch = total1.minus(total2).abs().lessThanOrEqualTo(threshold);
        expect(isMatch).toBe(true);
    });
    
    it('should not use JS number for variance calculation', () => {
        const excelTotal = new Decimal(12500.00);
        const pdfTotal = new Decimal(12500.01);
        
        // ❌ This would be wrong:
        // const variance = Math.abs(excelTotal - pdfTotal);
        
        // ✅ Correct:
        const variance = excelTotal.minus(pdfTotal).abs();
        expect(variance.toNumber()).toBe(0.01);
    });
});
```

### 9.2 Unit Tests

```typescript
// Test manifest computation
describe('computeManifest', () => {
    it('should capture control totals from Excel source', () => {
        const manifest = computeManifest(mockProposal);
        expect(manifest.excelSource.finalTotal).toBe(125000);
    });
    
    it('should capture control totals from calculated audit', () => {
        const manifest = computeManifest(mockProposal);
        expect(manifest.nataliaCalculated.finalTotal).toBe(125000);
    });
});

// Test reconciliation
describe('reconcileSourceVsCalculated', () => {
    it('should detect variance when totals differ', () => {
        const result = reconcileSourceVsCalculated(manifest);
        expect(result.isMatch).toBe(false);
        expect(result.variances.finalTotal).toBe(100);
    });
    
    it('should match when totals are within threshold', () => {
        const result = reconcileSourceVsCalculated(manifest);
        expect(result.isMatch).toBe(true);
    });
});

// Test auto-fix
describe('autoFixEngine', () => {
    it('should auto-fix missing field with default value', async () => {
        const result = await autoFixEngine.fix(proposal, [missingFieldException]);
        expect(result[0].applied).toBe(true);
        expect(result[0].action).toBe('DEFAULT_VALUE');
    });
});
```

### 9.3 Integration Tests

```typescript
// Test full verification flow
describe('Verification Flow', () => {
    it('should verify proposal from Excel import', async () => {
        // Import Excel
        const proposal = await importExcel(testFile);
        
        // Compute manifest
        const manifest = await computeManifest(proposal.id);
        
        // Verify
        const verification = await verifyProposal(proposal.id);
        
        // Assert
        expect(verification.status).toBe('VERIFIED');
        expect(verification.manifest.layers.layer1.status).toBe('PASS');
    });
});

// Test editing flow
describe('Edit and Re-verify Flow', () => {
    it('should update model and re-verify after edit', async () => {
        // Edit screen
        await updateScreen(proposal.id, screenId, { unitCost: 13000 });
        
        // Re-verify
        const verification = await verifyProposal(proposal.id);
        
        // Assert
        expect(verification.manifest.nataliaCalculated.screens[screenId].unitCost).toBe(13000);
    });
});
```

### 9.4 Golden Dataset Tests

```typescript
// Create 3 test Excel files
const testFiles = [
    { name: 'standard.xlsx', expectedTotal: 125000 },
    { name: 'with-alt-rows.xlsx', expectedTotal: 98000 },
    { name: 'messy-formatting.xlsx', expectedTotal: 142500 },
];

// Test each file
testFiles.forEach(file => {
    it(`should import ${file.name} and verify total is ${file.expectedTotal}`, async () => {
        const proposal = await importExcel(file.name);
        const verification = await verifyProposal(proposal.id);
        
        expect(verification.manifest.nataliaCalculated.finalTotal).toBe(file.expectedTotal);
        expect(verification.status).toBe('VERIFIED');
    });
});
```

---

## 10. Implementation Phases

### Phase 1: Core Verification Engine (Week 1-2) ✅

- [x] Create types/verification.ts
- [ ] Fix TypeScript errors in lib/verification.ts (use Decimal, not JS number)
- [ ] Create lib/exceptions.ts
- [ ] Create lib/autoFix.ts
- [ ] Create lib/roundingAudit.ts (HALF_EVEN, category totals only)
- [ ] Create lib/canonicalHash.ts (stable JSON stringify)
- [ ] Update prisma/schema.prisma
- [ ] Configure Decimal.js globally (ROUND_HALF_EVEN, precision 20)

### Phase 2: API Integration (Week 2-3)

- [ ] Create /api/proposals/verify endpoint
- [ ] Create /api/proposals/auto-fix endpoint
- [ ] Create /api/proposals/reconcile endpoint
- [ ] Update excelImportService.ts to compute manifest
- [ ] Update generateProposalPdfService.ts to check verification

### Phase 3: UI Components (Week 3-4)

- [ ] Create TrustBadge.tsx
- [ ] Create ReconciliationReportViewer.tsx
- [ ] Create ExceptionModal.tsx
- [ ] Create AIVerificationProgress.tsx
- [ ] Create EditablePDFPreview.tsx
- [ ] Integrate into proposal editor
- [ ] Add export gating

### Phase 4: Testing (Week 4-5)

- [ ] Create 3 real Excel test files
- [ ] Write unit tests for verification engine
- [ ] Write integration tests
- [ ] Create golden dataset
- [ ] Add CI/CD integration

### Phase 5: Deployment (Week 5-6)

- [ ] Deploy to staging
- [ ] Test with real ANC proposals
- [ ] Train users
- [ ] Deploy to production
- [ ] Monitor and iterate

---

## 11. Design Decisions (Resolved)

1. **Editing Scope:** ✅ Option B (line-item inputs) + Option C (final-total overrides with audit) - restrict C to privileged roles, force visible "Manual Override" badge everywhere

2. **AI Verification Cost:** On-demand by default; auto-run only when Layers 1-3 fail or before export if status isn't VERIFIED

3. **Override Approval:** Require second-person approval for final-total overrides (and changes beyond configurable threshold); self-attestation sufficient for low-risk edits (labels, typos)

4. **Version Retention:** Keep all exported/shared/signed versions indefinitely; keep last 10 drafts plus any version containing overrides/auto-fixes

5. **Verification Thresholds:** $0.01 and 0.1% as defaults, configurable per client/project, applied only to category totals (not intermediate values)

---

## 12. Next Steps

1. **Review this document** - Confirm alignment on refined design
2. **Answer open questions** - Resolve the 5 questions above
3. **Approve for implementation** - Green light to start Phase 1
4. **Create PRD-ready spec** - If needed, I can create a more formal spec with requirements, acceptance criteria, and test cases

---

**Document Status:** Ready for Review  
**Last Updated:** 2026-01-30  
**Next Review:** After user feedback
