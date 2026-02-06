# Verification System Implementation Checklist

**Purpose:** Use this checklist after completing each phase and before beginning the next phase to ensure quality, consistency, and alignment with ANC's rounding contract.

**Usage:** Run through this checklist at the end of every phase (Phase 1-5) and at the beginning of every new phase.

---

## Part 1: Post-Phase Completion Checklist

**Run this AFTER completing each phase.**

### ✅ ANC Rounding Contract Compliance

- [ ] **HALF_EVEN Rounding Mode**
  - [ ] All rounding uses `Decimal.ROUND_HALF_EVEN` (never `ROUND_HALF_UP`)
  - [ ] Global Decimal.js configured with `rounding: Decimal.ROUND_HALF_EVEN`
  - [ ] No rounding during intermediate calculations (full precision maintained)

- [ ] **Category Totals Only**
  - [ ] Rounding ONLY happens at: Subtotal, Bond, B&O, Sales Tax, Final Total
  - [ ] No rounding of per-screen unit prices or intermediate values
  - [ ] All category totals rounded to 2 decimals (cents)

- [ ] **Tax Base Calculations**
  - [ ] Bond calculated on: `subtotal × bondRate`
  - [ ] B&O calculated on: `(subtotal + bond) × boRate`
  - [ ] Sales Tax calculated on: `(subtotal + bond + B&O) × taxRate`
  - [ ] Final Total is sum of all rounded category totals

- [ ] **Display Enforcement**
  - [ ] All currency displays use `toFixed(2)` at render layer
  - [ ] PDF shows cents (e.g., "$12,500.00" not "$12,500")
  - [ ] Ugly Sheet shows cents
  - [ ] Share Link shows cents

### ✅ Decimal.js Usage (Never JS Number)

- [ ] **Money Comparisons**
  - [ ] All variance calculations use `Decimal.minus().abs()`
  - [ ] All threshold comparisons use `Decimal.lessThanOrEqualTo()`
  - [ ] No `Math.abs()` for money (use `Decimal.abs()`)
  - [ ] No `<` or `>` for money (use `Decimal.lessThan()`, `Decimal.greaterThan()`)

- [ ] **Type Consistency**
  - [ ] All money variables typed as `Decimal` (not `number`)
  - [ ] Prisma schema uses `Decimal` type for money fields (not `Float`)
  - [ ] No implicit number conversions (always `new Decimal(value)`)

- [ ] **Precision Preservation**
  - [ ] Decimal.js configured with `precision: 20`
  - [ ] Intermediate calculations keep full precision
  - [ ] Rounding only at explicit category total points

### ✅ Single Source of Truth

- [ ] **No Two-State Problem**
  - [ ] PDF preview is a view layer only (not separate state)
  - [ ] Edits update underlying model, then re-render all views
  - [ ] No "preview state" that can diverge from model

- [ ] **Canonical Snapshots**
  - [ ] `canonicalJsonHash()` recursively sorts keys
  - [ ] Layer 2 uses hash comparison (not `deepEqual`)
  - [ ] Decimal values serialized as strings in hash

- [ ] **Edit Flow**
  - [ ] Edit → Update Model → Recalculate → Re-verify → Re-render
  - [ ] Every edit creates audit log entry
  - [ ] Every edit creates version snapshot

### ✅ Safe Editing Implementation

- [ ] **No contentEditable for Money**
  - [ ] Money fields use click-to-edit modals
  - [ ] Currency validation enforced ($12,345.67 format)
  - [ ] No raw `contentEditable` on any money field

- [ ] **Override Flow**
  - [ ] Computed values show override button (not direct edit)
  - [ ] Override requires: value + reason + approver
  - [ ] Override creates audit log entry
  - [ ] Override shows "Manual Override" badge

- [ ] **Field Type Mapping**
  - [ ] Money values → Click-to-edit modal
  - [ ] Text values → Inline controlled input
  - [ ] Computed values → Read-only with override button

### ✅ 4-Layer Verification

- [ ] **Layer 1: Excel vs Calculated**
  - [ ] Compares HALF_EVEN-rounded category totals
  - [ ] Uses Decimal for all comparisons
  - [ ] Thresholds: $0.01 and 0.1% (configurable)

- [ ] **Layer 2: PDF vs Ugly Sheet**
  - [ ] Uses canonical hash comparison
  - [ ] Both show cents (enforced at render)
  - [ ] Both use HALF_EVEN rounding
  - [ ] Fails if rounding modes differ

- [ ] **Layer 3: Rounding Consistency**
  - [ ] Verifies no intermediate rounding
  - [ ] Verifies all rounding uses HALF_EVEN
  - [ ] Verifies rounding only at category totals
  - [ ] Logs all rounding deltas for audit

- [ ] **Layer 4: AI Visual Verification**
  - [ ] Deterministic row-by-row comparison first
  - [ ] AI only explains mismatches (not primary check)
  - [ ] AI locates source of mismatches
  - [ ] AI proposes fixes

### ✅ Auto-Fix Engine

- [ ] **6 Auto-Fixable Modes**
  - [ ] Missing required field → Fill with default/estimate
  - [ ] Wrong data type → Strip non-numeric, parse
  - [ ] Extra units in value → Extract numeric part
  - [ ] Trailing/leading whitespace → Trim
  - [ ] Inconsistent decimal places → Normalize to 2 decimals
  - [ ] Wrong header row → Re-run detection

- [ ] **4 Flag-for-Human Modes**
  - [ ] Screen dropped entirely → Flag for review
  - [ ] Formula not updated → Flag for review
  - [ ] Rounding drift > $0.01 → Flag for review
  - [ ] Mapping error → Flag for review

- [ ] **Audit Trail**
  - [ ] Every auto-fix logged with action + result
  - [ ] Auto-fix summary in verification report
  - [ ] User can undo auto-fixes

### ✅ Testing Requirements

- [ ] **Rounding Contract Tests**
  - [ ] `2.345 → 2.34` (4 is even)
  - [ ] `2.355 → 2.36` (6 is even)
  - [ ] `12500.005 → 12500.00` (0 is even)
  - [ ] `12500.015 → 12500.02` (2 is even)
  - [ ] Repeating decimals test (margin 0.19)

- [ ] **Decimal Usage Tests**
  - [ ] All money comparisons use Decimal
  - [ ] No JS number for variance
  - [ ] Threshold comparisons use Decimal

- [ ] **Golden Dataset**
  - [ ] 3 real Excel test files
  - [ ] Expected totals verified
  - [ ] All 4 layers pass

### ✅ Code Quality

- [ ] **TypeScript**
  - [ ] No TypeScript errors
  - [ ] All money types are `Decimal`
  - [ ] No `any` types for money

- [ ] **Error Handling**
  - [ ] All async functions have try-catch
  - [ ] Meaningful error messages
  - [ ] Errors logged with context

- [ ] **Performance**
  - [ ] Verification < 5 seconds (20 screens)
  - [ ] PDF re-render < 2 seconds after edit
  - [ ] AI verification < 10 seconds

---

## Part 2: Pre-Phase Beginning Checklist

**Run this BEFORE beginning each new phase.**

### ✅ Prerequisites Verified

- [ ] **Previous Phase Complete**
  - [ ] All tasks from previous phase done
  - [ ] Post-phase checklist passed
  - [ ] No blocking issues

- [ ] **Dependencies Ready**
  - [ ] Required libraries installed (decimal.js, etc.)
  - [ ] Database schema updated (if needed)
  - [ ] Environment variables configured

- [ ] **Design Alignment**
  - [ ] Read VERIFICATION_REFINED_DESIGN.md
  - [ ] Understand ANC rounding contract
  - [ ] Know which files to create/modify

### ✅ Phase-Specific Setup

**Phase 1: Core Verification Engine**
- [ ] `types/verification.ts` exists and is complete
- [ ] Decimal.js global config in place
- [ ] Prisma schema updated with Decimal types

**Phase 2: API Integration**
- [ ] All lib files from Phase 1 exist
- [ ] Database migrations run
- [ ] API route structure planned

**Phase 3: UI Components**
- [ ] All API endpoints from Phase 2 working
- [ ] Component architecture planned
- [ ] Mock data ready for testing

**Phase 4: Testing**
- [ ] All UI components from Phase 3 done
- [ ] Test environment configured
- [ ] Golden dataset files ready

**Phase 5: Deployment**
- [ ] All tests from Phase 4 passing
- [ ] Staging environment ready
- [ ] Deployment checklist prepared

### ✅ Risk Mitigation

- [ ] **Backup Current State**
  - [ ] Git commit before starting
  - [ ] Branch created for phase
  - [ ] Rollback plan documented

- [ ] **Test Strategy**
  - [ ] Know what tests to write
  - [ ] Have test data ready
  - [ ] Know acceptance criteria

- [ ] **Communication**
  - [ ] Stakeholders notified of phase start
  - [ ] Expected timeline communicated
  - [ ] Success criteria defined

---

## Part 3: Continuous Verification (During Development)

**Run these checks DURING development, not just at phase boundaries.**

### ✅ Every Time You Touch Money Code

- [ ] Am I using `Decimal` type? (not `number`)
- [ ] Am I using `Decimal.ROUND_HALF_EVEN`? (not `ROUND_HALF_UP`)
- [ ] Am I rounding only at category totals? (not intermediate)
- [ ] Am I displaying cents with `toFixed(2)`? (not raw value)
- [ ] Am I using Decimal comparison methods? (not `<`, `>`, `Math.abs`)

### ✅ Every Time You Create an Edit Flow

- [ ] Does this edit the underlying model? (not just view)
- [ ] Does this recalculate after edit? (all totals)
- [ ] Does this re-verify after edit? (all 4 layers)
- [ ] Does this create audit log? (who, when, what, why)
- [ ] Does this create version snapshot? (immutable)

### ✅ Every Time You Write a Test

- [ ] Does this test HALF_EVEN rounding? (2.345 → 2.34)
- [ ] Does this test Decimal usage? (not JS number)
- [ ] Does this test category totals rounding? (not intermediate)
- [ ] Does this use realistic data? (golden dataset)
- [ ] Does this verify audit trail? (logs exist)

### ✅ Every Time You Implement a Layer

- [ ] Layer 1: Excel vs Calculated (HALF_EVEN totals)
- [ ] Layer 2: PDF vs Ugly Sheet (canonical hash)
- [ ] Layer 3: Rounding (HALF_EVEN, category totals only)
- [ ] Layer 4: AI (deterministic first, AI explains)

---

## Part 4: Phase Completion Sign-Off

**Use this to formally complete each phase.**

### Phase 1: Core Verification Engine ✅

- [ ] `types/verification.ts` created
- [ ] `lib/verification.ts` created (no TS errors)
- [ ] `lib/exceptions.ts` created
- [ ] `lib/autoFix.ts` created
- [ ] `lib/roundingAudit.ts` created
- [ ] `lib/canonicalHash.ts` created
- [ ] Prisma schema updated (Decimal for money)
- [ ] Decimal.js global config in place
- [ ] All post-phase checks passed
- [ ] Ready for Phase 2

### Phase 2: API Integration ✅

- [ ] `/api/proposals/verify` endpoint created
- [ ] `/api/proposals/auto-fix` endpoint created
- [ ] `/api/proposals/reconcile` endpoint created
- [ ] `excelImportService.ts` updated
- [ ] `generateProposalPdfService.ts` updated
- [ ] All endpoints tested manually
- [ ] All post-phase checks passed
- [ ] Ready for Phase 3

### Phase 3: UI Components ✅

- [ ] `TrustBadge.tsx` created
- [ ] `ReconciliationReportViewer.tsx` created
- [ ] `ExceptionModal.tsx` created
- [ ] `AIVerificationProgress.tsx` created
- [ ] `EditablePDFPreview.tsx` created
- [ ] Components integrated into proposal editor
- [ ] Export gating implemented
- [ ] All post-phase checks passed
- [ ] Ready for Phase 4

### Phase 4: Testing ✅

- [ ] 3 real Excel test files created
- [ ] Unit tests written (passing)
- [ ] Integration tests written (passing)
- [ ] Golden dataset tests passing
- [ ] CI/CD integration done
- [ ] All post-phase checks passed
- [ ] Ready for Phase 5

### Phase 5: Deployment ✅

- [ ] Deployed to staging
- [ ] Tested with real ANC proposals
- [ ] Users trained
- [ ] Deployed to production
- [ ] Monitoring in place
- [ ] All post-phase checks passed
- [ ] **PROJECT COMPLETE** 🎉

---

## Part 5: Quick Reference (Cheat Sheet)

### ANC Rounding Contract (One-Liner)

**"HALF_EVEN, category totals only, all cents everywhere, Decimal always"**

### Decimal.js Usage Pattern

```typescript
// ❌ WRONG
const variance = Math.abs(total1 - total2);
if (variance < 0.01) { /* ... */ }

// ✅ CORRECT
const variance = new Decimal(total1).minus(total2).abs();
if (variance.lessThanOrEqualTo(new Decimal(0.01))) { /* ... */ }
```

### Rounding Points (Only These 5)

1. Subtotal: `round(sum of screen totals, 2)`
2. Bond: `round(subtotal × bondRate, 2)`
3. B&O: `round((subtotal + bond) × boRate, 2)`
4. Sales Tax: `round((subtotal + bond + B&O) × taxRate, 2)`
5. Final Total: `round(subtotal + bond + B&O + salesTax, 2)`

### Edit Flow (Always This)

```
Edit → Update Model → Recalculate → Re-verify → Re-render
```

### 4 Layers (Always These)

1. Excel vs Calculated (HALF_EVEN totals)
2. PDF vs Ugly Sheet (canonical hash)
3. Rounding (HALF_EVEN, category totals)
4. AI (deterministic + explain)

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-01-30  
**Purpose:** Ensure ANC rounding contract compliance and implementation quality
