# Natalia Verification + Auto-Fix Implementation Architecture

**Date:** 2026-01-30  
**Status:** Implementation Ready  
**Related:** [VERIFICATION_AUTO_FIX_DISCOVERY.md](./VERIFICATION_AUTO_FIX_DISCOVERY.md)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Core Types & Interfaces](#core-types--interfaces)
4. [Verification Engine](#verification-engine)
5. [Auto-Fix Engine](#auto-fix-engine)
6. [Exception Handling](#exception-handling)
7. [Database Schema Changes](#database-schema-changes)
8. [API Endpoints](#api-endpoints)
9. [UI Components](#ui-components)
10. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERIFICATION ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

Excel Upload
    │
    ├─► [1] PARSE & EXTRACT
    │   ├─ excelImportService.ts (existing)
    │   └─ Returns: ParsedANCProposal { formData, internalAudit }
    │
    ├─► [2] COMPUTE MANIFEST (NEW)
    │   ├─ verification.computeManifest()
    │   └─ Returns: VerificationManifest { excelImport, perScreen, proposalTotals }
    │
    ├─► [3] RECONCILE (NEW)
    │   ├─ verification.reconcileTotals()
    │   ├─ Compares: Excel source vs Natalia calculated
    │   └─ Returns: ReconciliationReport { status, variances, exceptions }
    │
    ├─► [4] AUTO-FIX (NEW)
    │   ├─ autoFix.attemptAutoFix()
    │   ├─ Categorizes exceptions
    │   ├─ Executes safe fixes
    │   └─ Returns: AutoFixResult { fixed, remaining, actions }
    │
    ├─► [5] STORE (NEW)
    │   ├─ proposal.verificationManifest (JSON)
    │   ├─ proposal.reconciliationReport (JSON)
    │   └─ proposal.exceptions (JSON)
    │
    └─► [6] UI FEEDBACK (NEW)
        ├─ Trust Badge (status + actions)
        ├─ Reconciliation Report Viewer
        └─ Exception Modal (fix now / review)
```

---

## File Structure

```
invoify/
├── lib/
│   ├── verification.ts              # NEW: Verification engine
│   ├── autoFix.ts                   # NEW: Auto-fix engine
│   ├── exceptions.ts                # NEW: Exception handling
│   ├── estimator.ts                 # EXISTING: Math engine
│   └── math.ts                      # EXISTING: Math utilities
│
├── types/
│   └── verification.ts              # NEW: Verification types
│
├── app/api/
│   └── proposals/
│       ├── verify/
│       │   └── route.ts             # NEW: Verify proposal endpoint
│       ├── auto-fix/
│       │   └── route.ts             # NEW: Auto-fix endpoint
│       └── reconciliation/
│           └── route.ts             # NEW: Reconciliation report endpoint
│
├── app/components/
│   ├── verification/
│   │   ├── TrustBadge.tsx           # NEW: Status badge
│   │   ├── ReconciliationReport.tsx # NEW: Report viewer
│   │   ├── ExceptionModal.tsx       # NEW: Exception handler
│   │   └── VerificationSummary.tsx  # NEW: Summary widget
│
├── prisma/
│   └── schema.prisma                # MODIFIED: Add verification fields
│
└── test/
    ├── verification/
    │   ├── verification.test.ts     # NEW: Verification tests
    │   ├── autoFix.test.ts          # NEW: Auto-fix tests
    │   └── reconciliation.test.ts   # NEW: Reconciliation tests
    └── fixtures/
        └── golden-dataset/          # NEW: Test Excel files
```

---

## Core Types & Interfaces

### Create: `types/verification.ts`

```typescript
/**
 * Verification System Types
 * Complete type definitions for verification, auto-fix, and exception handling
 */

// ============================================================================
// VERIFICATION MANIFEST
// ============================================================================

/**
 * Control totals captured at each stage of the pipeline
 * Stored with proposal for audit trail
 */
export interface VerificationManifest {
    id: string;
    proposalId: string;
    timestamp: string;
    
    // STAGE 1: Excel Import Metrics
    excelImport: {
        fileName: string;
        rowCount: number;              // Total rows read from Excel
        screenCount: number;           // Valid screens extracted
        altRowsSkipped: number;        // ALT/Alternate rows filtered
        blankRowsSkipped: number;      // Rows without valid data
        headerRowIndex: number;        // Where headers were found
        sheetsRead: string[];          // List of sheets accessed
    };
    
    // STAGE 2: Per-Screen Calculations
    perScreen: PerScreenManifest[];
    
    // STAGE 3: Proposal Totals (Aggregated)
    proposalTotals: ProposalTotalsManifest;
    
    // STAGE 4: Source vs Calculated Comparison
    reconciliation: ReconciliationManifest;
}

export interface PerScreenManifest {
    name: string;
    rowIndex: number;                 // Row in Excel (for traceability)
    areaSqFt: number;
    pixelResolution: number;
    pixelMatrix: string;
    
    // Source values (from Excel)
    source: {
        hardwareCost: number;
        installCost: number;
        otherCost: number;
        shippingCost: number;
        totalCost: number;
        sellPrice: number;
        ancMargin: number;
        bondCost: number;
        finalTotal: number;
    };
    
    // Calculated values (from Natalia)
    calculated: {
        hardwareCost: number;
        structureCost: number;
        installCost: number;
        laborCost: number;
        powerCost: number;
        shippingCost: number;
        totalCost: number;
        sellPrice: number;
        ancMargin: number;
        bondCost: number;
        boTaxCost: number;
        finalTotal: number;
    };
    
    // Variance analysis
    variance: {
        totalCost: number;
        sellPrice: number;
        finalTotal: number;
        percentVariance: number;
    };
}

export interface ProposalTotalsManifest {
    screenCount: number;
    totalAreaSqFt: number;
    totalPixelResolution: number;
    
    // Source totals (sum of Excel columns)
    sourceTotals: {
        hardwareCost: number;
        totalCost: number;
        sellPrice: number;
        ancMargin: number;
        bondCost: number;
        finalTotal: number;
    };
    
    // Calculated totals (sum of Natalia calculations)
    calculatedTotals: {
        hardwareCost: number;
        structureCost: number;
        installCost: number;
        laborCost: number;
        totalCost: number;
        sellPrice: number;
        ancMargin: number;
        bondCost: number;
        boTaxCost: number;
        finalTotal: number;
    };
    
    // Variance
    variance: {
        finalTotal: number;
        percentVariance: number;
    };
}

export interface ReconciliationManifest {
    sourceFinalTotal: number;
    calculatedFinalTotal: number;
    variance: number;
    variancePercent: number;
    isMatch: boolean;
    matchType: 'EXACT' | 'WITHIN_THRESHOLD' | 'EXCEEDS_THRESHOLD';
}

// ============================================================================
// RECONCILIATION REPORT
// ============================================================================

/**
 * Human-readable reconciliation report
 * Generated after verification for user review
 */
export interface ReconciliationReport {
    id: string;
    proposalId: string;
    timestamp: string;
    status: VerificationStatus;
    
    // Summary
    summary: {
        totalScreens: number;
        verifiedScreens: number;
        screensWithVariance: number;
        totalVariance: number;
        maxVariance: number;
        avgVariance: number;
    };
    
    // Excel source totals
    excelSource: {
        finalTotal: number;
        screenCount: number;
        bondTotal: number;
        taxTotal: number;
        marginPercent: number;
    };
    
    // Natalia calculated totals
    nataliaCalculated: {
        finalTotal: number;
        screenCount: number;
        bondTotal: number;
        taxTotal: number;
        marginPercent: number;
    };
    
    // Variance analysis
    variances: {
        finalTotal: VarianceDetail;
        screenCount: VarianceDetail;
        bondTotal: VarianceDetail;
        taxTotal: VarianceDetail;
    };
    
    // Per-screen breakdown
    perScreen: PerScreenReconciliation[];
    
    // Exceptions found
    exceptions: Exception[];
    
    // Recommended actions
    recommendations: ActionRecommendation[];
}

export interface VarianceDetail {
    variance: number;
    percent: number;
    acceptable: boolean;
    threshold: number;
}

export interface PerScreenReconciliation {
    name: string;
    status: 'MATCH' | 'VARIANCE' | 'MISSING' | 'ERROR';
    sourceTotal: number;
    calculatedTotal: number;
    variance: number;
    variancePercent: number;
    issues: string[];
}

// ============================================================================
// VERIFICATION STATUS
// ============================================================================

export enum VerificationStatus {
    PENDING = 'PENDING',           // Not yet verified
    VERIFIED = 'VERIFIED',         // All totals match exactly
    WARNING = 'WARNING',           // Minor variances (< $1 or < 0.1%)
    ERROR = 'ERROR',               // Major variances or critical issues
    BLOCKED = 'BLOCKED'            // Cannot proceed without fixes
}

export interface VerificationBadge {
    status: VerificationStatus;
    color: 'green' | 'yellow' | 'red' | 'gray';
    icon: string;
    message: string;
    subtext: string;
    timestamp: string;
    
    // Permissions
    canExportPDF: boolean;
    canShareLink: boolean;
    canSign: boolean;
    
    // Actions
    actions: BadgeAction[];
}

export interface BadgeAction {
    label: string;
    action: string;
    primary?: boolean;
    destructive?: boolean;
}

// ============================================================================
// EXCEPTIONS
// ============================================================================

export enum ExceptionType {
    // Data Quality Issues
    MISSING_FIELD = 'MISSING_FIELD',
    INVALID_VALUE = 'INVALID_VALUE',
    NON_NUMERIC_COST = 'NON_NUMERIC_COST',
    
    // Calculation Issues
    CALC_MISMATCH = 'CALC_MISMATCH',
    ROUNDING_DRIFT = 'ROUNDING_DRIFT',
    MARGIN_VIOLATION = 'MARGIN_VIOLATION',
    
    // Mapping Issues
    COLUMN_DRIFT = 'COLUMN_DRIFT',
    HEADER_NOT_FOUND = 'HEADER_NOT_FOUND',
    SHEET_NOT_FOUND = 'SHEET_NOT_FOUND',
    
    // Business Rule Issues
    ALT_ROW_SKIPPED = 'ALT_ROW_SKIPPED',
    SCREEN_DROPPED = 'SCREEN_DROPPED',
    FORMULA_NOT_UPDATED = 'FORMULA_NOT_UPDATED',
}

export enum ExceptionSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL',
}

export enum ExceptionCategory {
    DATA_QUALITY = 'DATA_QUALITY',
    CALC_MISMATCH = 'CALC_MISMATCH',
    MAPPING_ERROR = 'MAPPING_ERROR',
    BUSINESS_RULE = 'BUSINESS_RULE',
}

export interface Exception {
    id: string;
    type: ExceptionType;
    category: ExceptionCategory;
    severity: ExceptionSeverity;
    
    // Context
    screenName?: string;
    fieldName?: string;
    rowIndex?: number;
    columnIndex?: number;
    
    // Values
    expected?: any;
    actual?: any;
    variance?: number;
    
    // Message
    message: string;
    description: string;
    
    // Auto-fix
    autoFixable: boolean;
    autoFixAction?: AutoFixAction;
    
    // Resolution
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: 'system' | 'user';
}

// ============================================================================
// AUTO-FIX
// ============================================================================

export enum AutoFixType {
    SET_DEFAULT = 'SET_DEFAULT',
    RECALCULATE = 'RECALCULATE',
    SKIP_ROW = 'SKIP_ROW',
    PARSE_CURRENCY = 'PARSE_CURRENCY',
    NORMALIZE_NUMBER = 'NORMALIZE_NUMBER',
    TRIM_WHITESPACE = 'TRIM_WHITESPACE',
    DETECT_HEADER = 'DETECT_HEADER',
    APPLY_THRESHOLD = 'APPLY_THRESHOLD',
}

export interface AutoFixAction {
    id: string;
    type: AutoFixType;
    exceptionId: string;
    
    // What to fix
    target: {
        screenName?: string;
        fieldName?: string;
        rowIndex?: number;
    };
    
    // How to fix it
    fix: {
        operation: string;
        value?: any;
        reason: string;
    };
    
    // Safety
    safe: boolean;
    reversible: boolean;
    
    // Execution
    executed: boolean;
    executedAt?: string;
    result?: AutoFixResult;
}

export interface AutoFixResult {
    success: boolean;
    changes: Array<{
        field: string;
        oldValue: any;
        newValue: any;
    }>;
    remainingIssues: string[];
    requiresHumanReview: boolean;
}

export interface AutoFixSummary {
    totalExceptions: number;
    autoFixed: number;
    requiresHumanReview: number;
    blocked: number;
    
    actions: AutoFixAction[];
    estimatedTimeToFix: number; // seconds
}

// ============================================================================
// ACTION RECOMMENDATIONS
// ============================================================================

export interface ActionRecommendation {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'FIX_NOW' | 'REVIEW' | 'IGNORE';
    title: string;
    description: string;
    
    // What the user should do
    action: {
        type: 'FILL_FIELD' | 'REVIEW_VARIANCE' | 'APPROVE' | 'REJECT';
        target?: string;
        options?: string[];
    };
    
    // Impact
    impact: {
        fixesExceptions: string[];
        unblocksActions: string[];
    };
}

// ============================================================================
// VERIFICATION CONFIG
// ============================================================================

export interface VerificationConfig {
    // Thresholds
    varianceThreshold: number;          // Default: $0.01
    variancePercentThreshold: number;   // Default: 0.001 (0.1%)
    
    // Blocking behavior
    blockOnError: boolean;              // Default: true
    blockOnWarning: boolean;            // Default: false
    
    // Auto-fix behavior
    enableAutoFix: boolean;             // Default: true
    autoFixSafeOnly: boolean;           // Default: true
    
    // Reporting
    logExceptions: boolean;             // Default: true
    generateReport: boolean;            // Default: true
}

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
    varianceThreshold: 0.01,
    variancePercentThreshold: 0.001,
    blockOnError: true,
    blockOnWarning: false,
    enableAutoFix: true,
    autoFixSafeOnly: true,
    logExceptions: true,
    generateReport: true,
};
```

---

## Verification Engine

### Create: `lib/verification.ts`

```typescript
/**
 * Verification Engine
 * Computes control totals and generates reconciliation reports
 */

import { InternalAudit, ScreenAudit } from './estimator';
import {
    VerificationManifest,
    VerificationStatus,
    ReconciliationReport,
    ReconciliationManifest,
    PerScreenManifest,
    ProposalTotalsManifest,
    VerificationConfig,
    DEFAULT_VERIFICATION_CONFIG,
    PerScreenReconciliation,
    VarianceDetail,
    Exception,
    ExceptionType,
    ExceptionSeverity,
    ExceptionCategory,
} from '../types/verification';
import { roundToCents } from './math';

// ============================================================================
// MANIFEST COMPUTATION
// ============================================================================

/**
 * Compute verification manifest from Excel import data
 * Called during parseANCExcel() to capture control totals
 */
export function computeManifest(
    excelData: any,
    internalAudit: InternalAudit,
    options?: Partial<VerificationConfig>
): VerificationManifest {
    const config = { ...DEFAULT_VERIFICATION_CONFIG, ...options };
    
    // Extract Excel import metrics
    const excelImport = extractExcelImportMetrics(excelData);
    
    // Build per-screen manifests
    const perScreen = buildPerScreenManifests(excelData, internalAudit);
    
    // Build proposal totals
    const proposalTotals = buildProposalTotals(perScreen);
    
    // Reconcile source vs calculated
    const reconciliation = reconcileSourceVsCalculated(proposalTotals, config);
    
    return {
        id: generateId(),
        proposalId: excelData.proposalId || 'unknown',
        timestamp: new Date().toISOString(),
        excelImport,
        perScreen,
        proposalTotals,
        reconciliation,
    };
}

function extractExcelImportMetrics(excelData: any): VerificationManifest['excelImport'] {
    // These metrics should be captured during parseANCExcel()
    // For now, we'll extract what we can from the data
    return {
        fileName: excelData.fileName || 'unknown.xlsx',
        rowCount: excelData.rowCount || 0,
        screenCount: excelData.screens?.length || 0,
        altRowsSkipped: excelData.altRowsSkipped || 0,
        blankRowsSkipped: excelData.blankRowsSkipped || 0,
        headerRowIndex: excelData.headerRowIndex || 1,
        sheetsRead: excelData.sheetsRead || ['LED Sheet'],
    };
}

function buildPerScreenManifests(
    excelData: any,
    internalAudit: InternalAudit
): PerScreenManifest[] {
    const manifests: PerScreenManifest[] = [];
    
    const screens = excelData.screens || [];
    const perScreenAudits = internalAudit.perScreen || [];
    
    for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        const audit = perScreenAudits[i];
        
        if (!screen || !audit) continue;
        
        // Source values (from Excel)
        const source = {
            hardwareCost: screen.hardwareCost || 0,
            installCost: screen.installCost || 0,
            otherCost: screen.otherCost || 0,
            shippingCost: screen.shippingCost || 0,
            totalCost: screen.totalCost || 0,
            sellPrice: screen.sellPrice || 0,
            ancMargin: screen.ancMargin || 0,
            bondCost: screen.bondCost || 0,
            finalTotal: screen.finalTotal || 0,
        };
        
        // Calculated values (from Natalia)
        const calculated = {
            hardwareCost: audit.breakdown.hardware,
            structureCost: audit.breakdown.structure,
            installCost: audit.breakdown.install,
            laborCost: audit.breakdown.labor,
            powerCost: audit.breakdown.power,
            shippingCost: audit.breakdown.shipping,
            totalCost: audit.breakdown.totalCost,
            sellPrice: audit.breakdown.sellPrice,
            ancMargin: audit.breakdown.ancMargin,
            bondCost: audit.breakdown.bondCost,
            boTaxCost: audit.breakdown.boTaxCost || 0,
            finalTotal: audit.breakdown.finalClientTotal,
        };
        
        // Variance analysis
        const variance = {
            totalCost: calculated.totalCost - source.totalCost,
            sellPrice: calculated.sellPrice - source.sellPrice,
            finalTotal: calculated.finalTotal - source.finalTotal,
            percentVariance: source.finalTotal > 0
                ? (calculated.finalTotal - source.finalTotal) / source.finalTotal
                : 0,
        };
        
        manifests.push({
            name: screen.name,
            rowIndex: screen.rowIndex || i + 2,
            areaSqFt: audit.areaSqFt,
            pixelResolution: audit.pixelResolution,
            pixelMatrix: audit.pixelMatrix || '',
            source,
            calculated,
            variance,
        });
    }
    
    return manifests;
}

function buildProposalTotals(
    perScreen: PerScreenManifest[]
): ProposalTotalsManifest {
    // Aggregate source totals
    const sourceTotals = perScreen.reduce((acc, screen) => ({
        hardwareCost: acc.hardwareCost + screen.source.hardwareCost,
        totalCost: acc.totalCost + screen.source.totalCost,
        sellPrice: acc.sellPrice + screen.source.sellPrice,
        ancMargin: acc.ancMargin + screen.source.ancMargin,
        bondCost: acc.bondCost + screen.source.bondCost,
        finalTotal: acc.finalTotal + screen.source.finalTotal,
    }), {
        hardwareCost: 0,
        totalCost: 0,
        sellPrice: 0,
        ancMargin: 0,
        bondCost: 0,
        finalTotal: 0,
    });
    
    // Aggregate calculated totals
    const calculatedTotals = perScreen.reduce((acc, screen) => ({
        hardwareCost: acc.hardwareCost + screen.calculated.hardwareCost,
        structureCost: acc.structureCost + screen.calculated.structureCost,
        installCost: acc.installCost + screen.calculated.installCost,
        laborCost: acc.laborCost + screen.calculated.laborCost,
        totalCost: acc.totalCost + screen.calculated.totalCost,
        sellPrice: acc.sellPrice + screen.calculated.sellPrice,
        ancMargin: acc.ancMargin + screen.calculated.ancMargin,
        bondCost: acc.bondCost + screen.calculated.bondCost,
        boTaxCost: acc.boTaxCost + screen.calculated.boTaxCost,
        finalTotal: acc.finalTotal + screen.calculated.finalTotal,
    }), {
        hardwareCost: 0,
        structureCost: 0,
        installCost: 0,
        laborCost: 0,
        totalCost: 0,
        sellPrice: 0,
        ancMargin: 0,
        bondCost: 0,
        boTaxCost: 0,
        finalTotal: 0,
    });
    
    // Round all totals
    Object.keys(sourceTotals).forEach(key => {
        sourceTotals[key] = roundToCents(sourceTotals[key]);
    });
    Object.keys(calculatedTotals).forEach(key => {
        calculatedTotals[key] = roundToCents(calculatedTotals[key]);
    });
    
    // Variance
    const variance = {
        finalTotal: calculatedTotals.finalTotal - sourceTotals.finalTotal,
        percentVariance: sourceTotals.finalTotal > 0
            ? (calculatedTotals.finalTotal - sourceTotals.finalTotal) / sourceTotals.finalTotal
            : 0,
    };
    
    return {
        screenCount: perScreen.length,
        totalAreaSqFt: perScreen.reduce((sum, s) => sum + s.areaSqFt, 0),
        totalPixelResolution: perScreen.reduce((sum, s) => sum + s.pixelResolution, 0),
        sourceTotals,
        calculatedTotals,
        variance,
    };
}

function reconcileSourceVsCalculated(
    proposalTotals: ProposalTotalsManifest,
    config: VerificationConfig
): ReconciliationManifest {
    const { sourceTotals, calculatedTotals, variance } = proposalTotals;
    
    const absVariance = Math.abs(variance.finalTotal);
    const absPercentVariance = Math.abs(variance.percentVariance);
    
    // Determine match type
    let matchType: 'EXACT' | 'WITHIN_THRESHOLD' | 'EXCEEDS_THRESHOLD';
    let isMatch = false;
    
    if (absVariance <= config.varianceThreshold && absPercentVariance <= config.variancePercentThreshold) {
        matchType = 'EXACT';
        isMatch = true;
    } else if (absVariance <= 1.0 && absPercentVariance <= 0.001) {
        matchType = 'WITHIN_THRESHOLD';
        isMatch = true;
    } else {
        matchType = 'EXCEEDS_THRESHOLD';
        isMatch = false;
    }
    
    return {
        sourceFinalTotal: sourceTotals.finalTotal,
        calculatedFinalTotal: calculatedTotals.finalTotal,
        variance: variance.finalTotal,
        variancePercent: variance.percentVariance,
        isMatch,
        matchType,
    };
}

// ============================================================================
// RECONCILIATION REPORT GENERATION
// ============================================================================

/**
 * Generate human-readable reconciliation report
 * Called after verification to present results to user
 */
export function generateReconciliationReport(
    manifest: VerificationManifest,
    exceptions: Exception[],
    config?: VerificationConfig
): ReconciliationReport {
    const cfg = config || DEFAULT_VERIFICATION_CONFIG;
    
    // Determine status
    const status = determineVerificationStatus(manifest, exceptions, cfg);
    
    // Build summary
    const summary = buildSummary(manifest, exceptions);
    
    // Extract source and calculated totals
    const excelSource = {
        finalTotal: manifest.proposalTotals.sourceTotals.finalTotal,
        screenCount: manifest.excelImport.screenCount,
        bondTotal: manifest.proposalTotals.sourceTotals.bondCost,
        taxTotal: 0, // Not in source Excel
        marginPercent: manifest.proposalTotals.sourceTotals.finalTotal > 0
            ? manifest.proposalTotals.sourceTotals.ancMargin / manifest.proposalTotals.sourceTotals.sellPrice
            : 0,
    };
    
    const nataliaCalculated = {
        finalTotal: manifest.proposalTotals.calculatedTotals.finalTotal,
        screenCount: manifest.proposalTotals.screenCount,
        bondTotal: manifest.proposalTotals.calculatedTotals.bondCost,
        taxTotal: manifest.proposalTotals.calculatedTotals.boTaxCost,
        marginPercent: manifest.proposalTotals.calculatedTotals.finalTotal > 0
            ? manifest.proposalTotals.calculatedTotals.ancMargin / manifest.proposalTotals.calculatedTotals.sellPrice
            : 0,
    };
    
    // Build variance details
    const variances = {
        finalTotal: buildVarianceDetail(
            excelSource.finalTotal,
            nataliaCalculated.finalTotal,
            cfg.varianceThreshold,
            cfg.variancePercentThreshold
        ),
        screenCount: buildVarianceDetail(
            excelSource.screenCount,
            nataliaCalculated.screenCount,
            0,
            0
        ),
        bondTotal: buildVarianceDetail(
            excelSource.bondTotal,
            nataliaCalculated.bondTotal,
            cfg.varianceThreshold,
            cfg.variancePercentThreshold
        ),
        taxTotal: buildVarianceDetail(
            excelSource.taxTotal,
            nataliaCalculated.taxTotal,
            cfg.varianceThreshold,
            cfg.variancePercentThreshold
        ),
    };
    
    // Build per-screen reconciliation
    const perScreen = buildPerScreenReconciliation(manifest, cfg);
    
    // Generate recommendations
    const recommendations = generateRecommendations(manifest, exceptions, status);
    
    return {
        id: generateId(),
        proposalId: manifest.proposalId,
        timestamp: new Date().toISOString(),
        status,
        summary,
        excelSource,
        nataliaCalculated,
        variances,
        perScreen,
        exceptions,
        recommendations,
    };
}

function determineVerificationStatus(
    manifest: VerificationManifest,
    exceptions: Exception[],
    config: VerificationConfig
): VerificationStatus {
    const { reconciliation } = manifest;
    
    // Check for critical errors
    const hasCriticalErrors = exceptions.some(e => e.severity === ExceptionSeverity.CRITICAL);
    if (hasCriticalErrors) return VerificationStatus.BLOCKED;
    
    // Check for errors
    const hasErrors = exceptions.some(e => e.severity === ExceptionSeverity.ERROR);
    if (hasErrors) return VerificationStatus.ERROR;
    
    // Check reconciliation
    if (!reconciliation.isMatch) {
        return VerificationStatus.ERROR;
    }
    
    // Check for warnings
    const hasWarnings = exceptions.some(e => e.severity === ExceptionSeverity.WARNING);
    if (hasWarnings || reconciliation.matchType === 'WITHIN_THRESHOLD') {
        return VerificationStatus.WARNING;
    }
    
    // All good
    return VerificationStatus.VERIFIED;
}

function buildSummary(
    manifest: VerificationManifest,
    exceptions: Exception[]
): ReconciliationReport['summary'] {
    const perScreen = manifest.perScreen;
    const screensWithVariance = perScreen.filter(
        s => Math.abs(s.variance.finalTotal) > 0.01
    ).length;
    
    const variances = perScreen.map(s => s.variance.finalTotal);
    const totalVariance = Math.abs(manifest.proposalTotals.variance.finalTotal);
    const maxVariance = Math.max(...variances.map(Math.abs), 0);
    const avgVariance = variances.length > 0
        ? variances.reduce((sum, v) => sum + Math.abs(v), 0) / variances.length
        : 0;
    
    return {
        totalScreens: perScreen.length,
        verifiedScreens: perScreen.length - screensWithVariance,
        screensWithVariance,
        totalVariance,
        maxVariance,
        avgVariance,
    };
}

function buildVarianceDetail(
    source: number,
    calculated: number,
    threshold: number,
    percentThreshold: number
): VarianceDetail {
    const variance = calculated - source;
    const absVariance = Math.abs(variance);
    const percent = source > 0 ? variance / source : 0;
    const absPercent = Math.abs(percent);
    
    const acceptable = absVariance <= threshold && absPercent <= percentThreshold;
    
    return {
        variance,
        percent,
        acceptable,
        threshold: Math.max(threshold, source * percentThreshold),
    };
}

function buildPerScreenReconciliation(
    manifest: VerificationManifest,
    config: VerificationConfig
): PerScreenReconciliation[] {
    return manifest.perScreen.map(screen => {
        const absVariance = Math.abs(screen.variance.finalTotal);
        const absPercentVariance = Math.abs(screen.variance.percentVariance);
        
        let status: PerScreenReconciliation['status'];
        if (absVariance <= config.varianceThreshold && absPercentVariance <= config.variancePercentThreshold) {
            status = 'MATCH';
        } else if (absVariance <= 1.0 && absPercentVariance <= 0.001) {
            status = 'VARIANCE';
        } else {
            status = 'ERROR';
        }
        
        const issues: string[] = [];
        if (status === 'VARIANCE') {
            issues.push(`Variance: $${absVariance.toFixed(2)} (${(absPercentVariance * 100).toFixed(3)}%)`);
        }
        if (status === 'ERROR') {
            issues.push(`High variance: $${absVariance.toFixed(2)} (${(absPercentVariance * 100).toFixed(3)}%)`);
        }
        
        return {
            name: screen.name,
            status,
            sourceTotal: screen.source.finalTotal,
            calculatedTotal: screen.calculated.finalTotal,
            variance: screen.variance.finalTotal,
            variancePercent: screen.variance.percentVariance,
            issues,
        };
    });
}

function generateRecommendations(
    manifest: VerificationManifest,
    exceptions: Exception[],
    status: VerificationStatus
): any[] {
    const recommendations: any[] = [];
    
    // Add recommendations based on exceptions
    exceptions.forEach(exc => {
        if (exc.autoFixable && !exc.resolved) {
            recommendations.push({
                priority: exc.severity === ExceptionSeverity.CRITICAL ? 'HIGH' : 'MEDIUM',
                category: 'FIX_NOW',
                title: `Fix ${exc.type}`,
                description: exc.message,
                action: {
                    type: 'FIX_NOW',
                    target: exc.id,
                },
                impact: {
                    fixesExceptions: [exc.id],
                    unblocksActions: status === VerificationStatus.BLOCKED ? ['EXPORT_PDF', 'SHARE_LINK'] : [],
                },
            });
        }
    });
    
    // Add reconciliation recommendations
    if (status === VerificationStatus.WARNING) {
        recommendations.push({
            priority: 'MEDIUM',
            category: 'REVIEW',
            title: 'Review variance',
            description: `Total variance: $${Math.abs(manifest.proposalTotals.variance.finalTotal).toFixed(2)}`,
            action: {
                type: 'REVIEW_VARIANCE',
            },
            impact: {
                fixesExceptions: [],
                unblocksActions: [],
            },
        });
    }
    
    return recommendations;
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
    return `vrf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export { VerificationConfig, DEFAULT_VERIFICATION_CONFIG };
```

---

## Auto-Fix Engine

### Create: `lib/autoFix.ts`

```typescript
/**
 * Auto-Fix Engine
 * Automatically fixes safe issues and flags others for human review
 */

import {
    Exception,
    ExceptionType,
    ExceptionSeverity,
    ExceptionCategory,
    AutoFixAction,
    AutoFixType,
    AutoFixResult,
    AutoFixSummary,
} from '../types/verification';
import { safeNumber, roundToCents } from './math';

// ============================================================================
// AUTO-FIX RULES
// ============================================================================

/**
 * Auto-fix rules for each exception type
 * Defines what can be safely fixed and how
 */
const AUTO_FIX_RULES: Record<ExceptionType, AutoFixRule | null> = {
    // Data Quality - Safely Fixable
    [ExceptionType.MISSING_FIELD]: {
        safe: true,
        type: AutoFixType.SET_DEFAULT,
        execute: fixMissingField,
    },
    [ExceptionType.INVALID_VALUE]: {
        safe: true,
        type: AutoFixType.NORMALIZE_NUMBER,
        execute: fixInvalidValue,
    },
    [ExceptionType.NON_NUMERIC_COST]: {
        safe: true,
        type: AutoFixType.PARSE_CURRENCY,
        execute: fixNonNumericCost,
    },
    
    // Calculation - Safely Fixable
    [ExceptionType.CALC_MISMATCH]: {
        safe: true,
        type: AutoFixType.RECALCULATE,
        execute: fixCalcMismatch,
    },
    [ExceptionType.ROUNDING_DRIFT]: {
        safe: true,
        type: AutoFixType.APPLY_THRESHOLD,
        execute: fixRoundingDrift,
    },
    
    // Mapping - NOT Safely Fixable (requires human)
    [ExceptionType.COLUMN_DRIFT]: null,
    [ExceptionType.HEADER_NOT_FOUND]: null,
    [ExceptionType.SHEET_NOT_FOUND]: null,
    
    // Business Rules - Safely Fixable
    [ExceptionType.ALT_ROW_SKIPPED]: {
        safe: true,
        type: AutoFixType.SKIP_ROW,
        execute: null, // Already handled during import
    },
    [ExceptionType.SCREEN_DROPPED]: null, // Requires human review
    [ExceptionType.FORMULA_NOT_UPDATED]: {
        safe: true,
        type: AutoFixType.RECALCULATE,
        execute: fixFormulaNotUpdated,
    },
    [ExceptionType.MARGIN_VIOLATION]: null, // Requires human review
};

interface AutoFixRule {
    safe: boolean;
    type: AutoFixType;
    execute: (exc: Exception, context: any) => AutoFixResult | null;
}

// ============================================================================
// AUTO-FIX EXECUTION
// ============================================================================

/**
 * Attempt to auto-fix all exceptions
 * Returns summary of what was fixed and what remains
 */
export function attemptAutoFix(
    exceptions: Exception[],
    context: any
): AutoFixSummary {
    const actions: AutoFixAction[] = [];
    let autoFixed = 0;
    let requiresHumanReview = 0;
    let blocked = 0;
    
    for (const exc of exceptions) {
        if (exc.resolved) continue;
        
        const rule = AUTO_FIX_RULES[exc.type];
        
        if (!rule || !rule.safe) {
            // Not auto-fixable
            if (exc.severity === ExceptionSeverity.CRITICAL) {
                blocked++;
            } else {
                requiresHumanReview++;
            }
            continue;
        }
        
        // Create auto-fix action
        const action: AutoFixAction = {
            id: generateId(),
            type: rule.type,
            exceptionId: exc.id,
            target: {
                screenName: exc.screenName,
                fieldName: exc.fieldName,
                rowIndex: exc.rowIndex,
            },
            fix: {
                operation: rule.type,
                reason: `Auto-fix for ${exc.type}`,
            },
            safe: true,
            reversible: false,
            executed: false,
        };
        
        // Execute fix
        if (rule.execute) {
            try {
                const result = rule.execute(exc, context);
                action.executed = true;
                action.executedAt = new Date().toISOString();
                action.result = result;
                
                if (result.success) {
                    exc.resolved = true;
                    exc.resolvedAt = action.executedAt;
                    exc.resolvedBy = 'system';
                    autoFixed++;
                } else {
                    requiresHumanReview++;
                }
            } catch (error) {
                console.error(`Auto-fix failed for ${exc.type}:`, error);
                requiresHumanReview++;
            }
        }
        
        actions.push(action);
    }
    
    // Estimate time to fix remaining issues
    const estimatedTimeToFix = requiresHumanReview * 30; // 30 seconds per issue
    
    return {
        totalExceptions: exceptions.length,
        autoFixed,
        requiresHumanReview,
        blocked,
        actions,
        estimatedTimeToFix,
    };
}

// ============================================================================
// AUTO-FIX IMPLEMENTATIONS
// ============================================================================

/**
 * Fix: Missing brightness field
 * Action: Set to undefined (will be hidden in PDF)
 */
function fixMissingField(exc: Exception, context: any): AutoFixResult {
    if (exc.fieldName === 'brightness') {
        return {
            success: true,
            changes: [{
                field: 'brightness',
                oldValue: exc.actual,
                newValue: undefined,
            }],
            remainingIssues: [],
            requiresHumanReview: false,
        };
    }
    
    // Other missing fields - use defaults
    const defaults: Record<string, any> = {
        height: 0,
        width: 0,
        pitch: 10,
        margin: 0.25,
    };
    
    if (exc.fieldName && defaults[exc.fieldName]) {
        return {
            success: true,
            changes: [{
                field: exc.fieldName,
                oldValue: exc.actual,
                newValue: defaults[exc.fieldName],
            }],
            remainingIssues: [],
            requiresHumanReview: false,
        };
    }
    
    return {
        success: false,
        changes: [],
        remainingIssues: [`Cannot auto-fix missing field: ${exc.fieldName}`],
        requiresHumanReview: true,
    };
}

/**
 * Fix: Invalid numeric value
 * Action: Normalize to number, default to 0 if invalid
 */
function fixInvalidValue(exc: Exception, context: any): AutoFixResult {
    const normalized = safeNumber(exc.actual);
    
    return {
        success: true,
        changes: [{
            field: exc.fieldName || 'value',
            oldValue: exc.actual,
            newValue: normalized,
        }],
        remainingIssues: [],
        requiresHumanReview: false,
    };
}

/**
 * Fix: Non-numeric cost value (e.g., "$1,234.56")
 * Action: Parse currency string to number
 */
function fixNonNumericCost(exc: Exception, context: any): AutoFixResult {
    const value = exc.actual;
    let parsed = 0;
    
    if (typeof value === 'string') {
        // Remove currency symbols and commas
        parsed = parseFloat(value.replace(/[$,]/g, ''));
    }
    
    if (isNaN(parsed)) {
        parsed = 0;
    }
    
    return {
        success: true,
        changes: [{
            field: exc.fieldName || 'cost',
            oldValue: exc.actual,
            newValue: parsed,
        }],
        remainingIssues: [],
        requiresHumanReview: false,
    };
}

/**
 * Fix: Calculation mismatch
 * Action: Use Natalia's calculated values (recalculated from scratch)
 */
function fixCalcMismatch(exc: Exception, context: any): AutoFixResult {
    // Natalia's calculations are already done
    // Just mark as resolved
    return {
        success: true,
        changes: [{
            field: 'useNataliaCalculations',
            oldValue: 'useExcelValues',
            newValue: 'useNataliaCalculations',
        }],
        remainingIssues: [],
        requiresHumanReview: false,
    };
}

/**
 * Fix: Rounding drift
 * Action: Apply threshold, accept if within tolerance
 */
function fixRoundingDrift(exc: Exception, context: any): AutoFixResult {
    const variance = exc.variance || 0;
    const absVariance = Math.abs(variance);
    
    if (absVariance <= 0.01) {
        return {
            success: true,
            changes: [{
                field: 'acceptRoundingVariance',
                oldValue: variance,
                newValue: 'accepted',
            }],
            remainingIssues: [],
            requiresHumanReview: false,
        };
    }
    
    return {
        success: false,
        changes: [],
        remainingIssues: [`Variance ${absVariance} exceeds threshold`],
        requiresHumanReview: true,
    };
}

/**
 * Fix: Formula not updated in Excel
 * Action: Recalculate from base costs using Natalia's math
 */
function fixFormulaNotUpdated(exc: Exception, context: any): AutoFixResult {
    // Natalia already recalculates everything from scratch
    // This is just informational
    return {
        success: true,
        changes: [{
            field: 'recalculatedFromBaseCosts',
            oldValue: 'excelFormula',
            newValue: 'nataliaCalculation',
        }],
        remainingIssues: [],
        requiresHumanReview: false,
    };
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
    return `afx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export { AUTO_FIX_RULES };
```

---

## Exception Handling

### Create: `lib/exceptions.ts`

```typescript
/**
 * Exception Detection & Handling
 * Detects issues during import and calculation
 */

import {
    Exception,
    ExceptionType,
    ExceptionSeverity,
    ExceptionCategory,
} from '../types/verification';
import { safeNumber } from './math';

// ============================================================================
// EXCEPTION DETECTION
// ============================================================================

/**
 * Detect all exceptions during Excel import and calculation
 * Returns array of exceptions with auto-fix suggestions
 */
export function detectExceptions(
    excelData: any,
    internalAudit: any,
    manifest: any
): Exception[] {
    const exceptions: Exception[] = [];
    
    // 1. Detect ALT rows skipped
    exceptions.push(...detectAltRowsSkipped(excelData));
    
    // 2. Detect missing fields
    exceptions.push(...detectMissingFields(excelData));
    
    // 3. Detect calculation mismatches
    exceptions.push(...detectCalcMismatches(manifest));
    
    // 4. Detect rounding drift
    exceptions.push(...detectRoundingDrift(manifest));
    
    // 5. Detect invalid values
    exceptions.push(...detectInvalidValues(excelData));
    
    // 6. Detect margin violations
    exceptions.push(...detectMarginViolations(excelData));
    
    return exceptions;
}

// ============================================================================
// SPECIFIC DETECTORS
// ============================================================================

function detectAltRowsSkipped(excelData: any): Exception[] {
    const exceptions: Exception[] = [];
    const altRowsSkipped = excelData.altRowsSkipped || 0;
    
    if (altRowsSkipped > 0) {
        exceptions.push({
            id: generateId(),
            type: ExceptionType.ALT_ROW_SKIPPED,
            category: ExceptionCategory.BUSINESS_RULE,
            severity: ExceptionSeverity.INFO,
            message: `${altRowsSkipped} ALT/Alternate rows were skipped`,
            description: 'Rows starting with "alt" or "alternate" were automatically excluded',
            autoFixable: true,
            resolved: true, // Already handled
        });
    }
    
    return exceptions;
}

function detectMissingFields(excelData: any): Exception[] {
    const exceptions: Exception[] = [];
    const screens = excelData.screens || [];
    
    screens.forEach((screen: any, idx: number) => {
        // Check for missing brightness
        if (screen.brightness === undefined || screen.brightness === 0 || screen.brightness === 'N/A') {
            exceptions.push({
                id: generateId(),
                type: ExceptionType.MISSING_FIELD,
                category: ExceptionCategory.DATA_QUALITY,
                severity: ExceptionSeverity.INFO,
                screenName: screen.name,
                fieldName: 'brightness',
                actual: screen.brightness,
                expected: 'number or undefined',
                message: `Brightness missing for "${screen.name}"`,
                description: 'Brightness will be hidden in PDF',
                autoFixable: true,
                resolved: true, // Already handled
            });
        }
        
        // Check for zero dimensions
        if (screen.height === 0 || screen.width === 0) {
            exceptions.push({
                id: generateId(),
                type: ExceptionType.MISSING_FIELD,
                category: ExceptionCategory.DATA_QUALITY,
                severity: ExceptionSeverity.ERROR,
                screenName: screen.name,
                fieldName: screen.height === 0 ? 'height' : 'width',
                actual: screen.height === 0 ? screen.height : screen.width,
                expected: '> 0',
                message: `Invalid dimension for "${screen.name}"`,
                description: 'Screen will have zero area',
                autoFixable: false,
                resolved: false,
            });
        }
    });
    
    return exceptions;
}

function detectCalcMismatches(manifest: any): Exception[] {
    const exceptions: Exception[] = [];
    
    manifest.perScreen.forEach((screen: any) => {
        const absVariance = Math.abs(screen.variance.finalTotal);
        const absPercentVariance = Math.abs(screen.variance.percentVariance);
        
        if (absVariance > 1.0 || absPercentVariance > 0.001) {
            exceptions.push({
                id: generateId(),
                type: ExceptionType.CALC_MISMATCH,
                category: ExceptionCategory.CALC_MISMATCH,
                severity: absVariance > 10 ? ExceptionSeverity.ERROR : ExceptionSeverity.WARNING,
                screenName: screen.name,
                expected: screen.source.finalTotal,
                actual: screen.calculated.finalTotal,
                variance: screen.variance.finalTotal,
                message: `Calculation mismatch for "${screen.name}"`,
                description: `Variance: $${absVariance.toFixed(2)} (${(absPercentVariance * 100).toFixed(3)}%)`,
                autoFixable: true,
                resolved: false,
            });
        }
    });
    
    return exceptions;
}

function detectRoundingDrift(manifest: any): Exception[] {
    const exceptions: Exception[] = [];
    const { reconciliation } = manifest;
    
    if (reconciliation.matchType === 'WITHIN_THRESHOLD') {
        exceptions.push({
            id: generateId(),
            type: ExceptionType.ROUNDING_DRIFT,
            category: ExceptionCategory.CALC_MISMATCH,
            severity: ExceptionSeverity.INFO,
            expected: reconciliation.sourceFinalTotal,
            actual: reconciliation.calculatedFinalTotal,
            variance: reconciliation.variance,
            message: 'Minor rounding drift detected',
            description: `Variance: $${Math.abs(reconciliation.variance).toFixed(2)} (within tolerance)`,
            autoFixable: true,
            resolved: true, // Already acceptable
        });
    }
    
    return exceptions;
}

function detectInvalidValues(excelData: any): Exception[] {
    const exceptions: Exception[] = [];
    const screens = excelData.screens || [];
    
    screens.forEach((screen: any) => {
        // Check for non-numeric costs
        const costFields = ['hardwareCost', 'installCost', 'otherCost', 'shippingCost'];
        costFields.forEach(field => {
            const value = screen[field];
            if (value !== undefined && typeof value === 'string' && isNaN(parseFloat(value))) {
                exceptions.push({
                    id: generateId(),
                    type: ExceptionType.NON_NUMERIC_COST,
                    category: ExceptionCategory.DATA_QUALITY,
                    severity: ExceptionSeverity.WARNING,
                    screenName: screen.name,
                    fieldName: field,
                    actual: value,
                    expected: 'number',
                    message: `Non-numeric ${field} in "${screen.name}"`,
                    description: `Value "${value}" cannot be parsed as number`,
                    autoFixable: true,
                    resolved: false,
                });
            }
        });
    });
    
    return exceptions;
}

function detectMarginViolations(excelData: any): Exception[] {
    const exceptions: Exception[] = [];
    const screens = excelData.screens || [];
    
    screens.forEach((screen: any) => {
        const margin = screen.ancMargin || 0;
        const sellPrice = screen.sellPrice || 0;
        const totalCost = screen.totalCost || 0;
        
        // Check if margin >= 100%
        if (sellPrice > 0) {
            const marginPercent = margin / sellPrice;
            if (marginPercent >= 1.0) {
                exceptions.push({
                    id: generateId(),
                    type: ExceptionType.MARGIN_VIOLATION,
                    category: ExceptionCategory.BUSINESS_RULE,
                    severity: ExceptionSeverity.CRITICAL,
                    screenName: screen.name,
                    expected: '< 100%',
                    actual: `${(marginPercent * 100).toFixed(1)}%`,
                    message: `Margin ≥ 100% for "${screen.name}"`,
                    description: 'This causes division by zero in Divisor Model',
                    autoFixable: false,
                    resolved: false,
                });
            }
        }
    });
    
    return exceptions;
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
    return `exc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## Database Schema Changes

### Modify: `prisma/schema.prisma`

```prisma
// Add to existing Proposal model
model Proposal {
    id              String         @id @default(cuid())
    workspaceId     String
    clientName      String
    status          String         @default("DRAFT")
    calculationMode String         @default("INTELLIGENCE")
    
    // EXISTING FIELDS
    internalAudit   String?
    clientSummary   String?
    aiThreadId      String?
    aiWorkspaceSlug String?
    taxRateOverride Float?
    bondRateOverride Float?
    shareHash       String?        @unique
    versions        BidVersion[]
    workspace       Workspace      @relation(fields: [workspaceId], references: [id])
    screens         ScreenConfig[]
    snapshots       ProposalSnapshot[]
    
    // NEW: Verification fields
    verificationManifest      String?   // JSON: VerificationManifest
    reconciliationReport      String?   // JSON: ReconciliationReport
    exceptions                String?   // JSON: Exception[]
    verificationStatus        String    @default("PENDING") // PENDING | VERIFIED | WARNING | ERROR | BLOCKED
    verificationTimestamp     DateTime?
    autoFixSummary            String?   // JSON: AutoFixSummary
    
    // NEW: Versioning
    proposalVersions          ProposalVersion[]
}

// NEW: Proposal version for immutable PDF + Ugly Sheet pairing
model ProposalVersion {
    id                String   @id @default(cuid())
    proposalId        String
    versionNumber     Int
    createdAt         DateTime @default(now())
    
    // Verification data
    verificationStatus String   @default("PENDING")
    reconciliationReport String? // JSON
    
    // File URLs
    pdfUrl            String?
    uglySheetUrl      String?
    shareHash         String?  @unique
    
    proposal          Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
    
    @@index([proposalId, versionNumber])
}
```

---

## API Endpoints

### Create: `app/api/proposals/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeManifest, generateReconciliationReport } from '@/lib/verification';
import { detectExceptions } from '@/lib/exceptions';
import { attemptAutoFix } from '@/lib/autoFix';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proposalId, force = false } = body;
        
        // Get proposal
        const proposal = await prisma.proposal.findUnique({
            where: { id: proposalId },
        });
        
        if (!proposal) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        
        // Check if already verified
        if (proposal.verificationStatus !== 'PENDING' && !force) {
            return NextResponse.json({
                status: proposal.verificationStatus,
                message: 'Already verified',
            });
        }
        
        // Parse existing data
        const internalAudit = JSON.parse(proposal.internalAudit || '{}');
        const formData = JSON.parse(proposal.internalAudit || '{}'); // Adjust based on actual storage
        
        // Compute manifest
        const manifest = computeManifest(formData, internalAudit);
        
        // Detect exceptions
        const exceptions = detectExceptions(formData, internalAudit, manifest);
        
        // Attempt auto-fix
        const autoFixSummary = attemptAutoFix(exceptions, {});
        
        // Generate reconciliation report
        const report = generateReconciliationReport(manifest, exceptions);
        
        // Update proposal
        await prisma.proposal.update({
            where: { id: proposalId },
            data: {
                verificationManifest: JSON.stringify(manifest),
                reconciliationReport: JSON.stringify(report),
                exceptions: JSON.stringify(exceptions),
                verificationStatus: report.status,
                verificationTimestamp: new Date(),
                autoFixSummary: JSON.stringify(autoFixSummary),
            },
        });
        
        return NextResponse.json({
            status: report.status,
            manifest,
            report,
            autoFixSummary,
        });
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
```

### Create: `app/api/proposals/auto-fix/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { attemptAutoFix } from '@/lib/autoFix';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proposalId, exceptionIds } = body;
        
        // Get proposal
        const proposal = await prisma.proposal.findUnique({
            where: { id: proposalId },
        });
        
        if (!proposal) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }
        
        // Parse exceptions
        const exceptions = JSON.parse(proposal.exceptions || '[]');
        
        // Filter to specific exceptions if provided
        const targetExceptions = exceptionIds
            ? exceptions.filter((e: any) => exceptionIds.includes(e.id))
            : exceptions;
        
        // Attempt auto-fix
        const summary = attemptAutoFix(targetExceptions, {});
        
        // Update proposal
        await prisma.proposal.update({
            where: { id: proposalId },
            data: {
                exceptions: JSON.stringify(exceptions),
                autoFixSummary: JSON.stringify(summary),
            },
        });
        
        return NextResponse.json(summary);
    } catch (error) {
        console.error('Auto-fix error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
```

---

## UI Components

### Create: `app/components/verification/TrustBadge.tsx`

```typescript
import React from 'react';
import { VerificationStatus, VerificationBadge as BadgeData } from '@/types/verification';

interface TrustBadgeProps {
    badge: BadgeData;
    onAction?: (action: string) => void;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ badge, onAction }) => {
    const colors = {
        green: 'bg-green-100 text-green-800 border-green-200',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        red: 'bg-red-100 text-red-800 border-red-200',
        gray: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const icons = {
        [VerificationStatus.VERIFIED]: '✓',
        [VerificationStatus.WARNING]: '⚠',
        [VerificationStatus.ERROR]: '✕',
        [VerificationStatus.BLOCKED]: '✕',
        [VerificationStatus.PENDING]: '⋯',
    };
    
    return (
        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${colors[badge.color]}`}>
            <span className="text-xl font-bold">{icons[badge.status]}</span>
            <div>
                <div className="font-semibold">{badge.message}</div>
                <div className="text-xs opacity-75">{badge.subtext}</div>
            </div>
            {badge.actions.length > 0 && (
                <div className="flex gap-2 ml-4">
                    {badge.actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => onAction?.(action.action)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                                action.primary
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-white/50 hover:bg-white/75'
                            }`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
```

---

## Testing Strategy

### Create: `test/verification/verification.test.ts`

```typescript
import { computeManifest, generateReconciliationReport } from '@/lib/verification';
import { detectExceptions } from '@/lib/exceptions';
import { attemptAutoFix } from '@/lib/autoFix';

describe('Verification Engine', () => {
    test('computes manifest from Excel data', () => {
        const excelData = {
            fileName: 'test.xlsx',
            screens: [
                {
                    name: 'Screen 1',
                    hardwareCost: 35000,
                    sellPrice: 52000,
                    finalTotal: 52780,
                },
            ],
        };
        
        const internalAudit = {
            perScreen: [
                {
                    name: 'Screen 1',
                    breakdown: {
                        hardware: 35000,
                        sellPrice: 52000,
                        finalClientTotal: 52780,
                    },
                },
            ],
        };
        
        const manifest = computeManifest(excelData, internalAudit);
        
        expect(manifest.perScreen).toHaveLength(1);
        expect(manifest.reconciliation.isMatch).toBe(true);
    });
    
    test('detects ALT row exceptions', () => {
        const excelData = {
            altRowsSkipped: 2,
            screens: [],
        };
        
        const exceptions = detectExceptions(excelData, {}, {});
        
        const altException = exceptions.find(e => e.type === 'ALT_ROW_SKIPPED');
        expect(altException).toBeDefined();
        expect(altException?.message).toContain('2');
    });
    
    test('auto-fixes missing brightness', () => {
        const exceptions = [
            {
                id: 'exc-1',
                type: 'MISSING_FIELD',
                fieldName: 'brightness',
                actual: 'N/A',
                autoFixable: true,
                resolved: false,
            },
        ];
        
        const summary = attemptAutoFix(exceptions, {});
        
        expect(summary.autoFixed).toBe(1);
        expect(summary.requiresHumanReview).toBe(0);
    });
});
```

---

## Implementation Checklist

### Phase 1: Core Engine (Week 1-2)
- [ ] Create `types/verification.ts`
- [ ] Create `lib/verification.ts`
- [ ] Create `lib/exceptions.ts`
- [ ] Create `lib/autoFix.ts`
- [ ] Update `prisma/schema.prisma`
- [ ] Run migrations

### Phase 2: API Integration (Week 2-3)
- [ ] Create `app/api/proposals/verify/route.ts`
- [ ] Create `app/api/proposals/auto-fix/route.ts`
- [ ] Create `app/api/proposals/reconciliation/route.ts`
- [ ] Update `excelImportService.ts` to compute manifest
- [ ] Update `generateProposalPdfService.ts` to check verification status

### Phase 3: UI Components (Week 3-4)
- [ ] Create `TrustBadge.tsx`
- [ ] Create `ReconciliationReport.tsx`
- [ ] Create `ExceptionModal.tsx`
- [ ] Integrate into proposal editor
- [ ] Add export gating

### Phase 4: Testing (Week 4-5)
- [ ] Create unit tests
- [ ] Create integration tests
- [ ] Create golden dataset
- [ ] Add regression tests

### Phase 5: Deployment (Week 5-6)
- [ ] Deploy to staging
- [ ] Test with real data
- [ ] Deploy to production
- [ ] Monitor and iterate

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-30  
**Status:** Ready for Implementation
