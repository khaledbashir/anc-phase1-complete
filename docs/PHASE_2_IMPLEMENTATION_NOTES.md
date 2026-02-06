# Phase 2: API Integration - Implementation Notes

**Status:** In Progress  
**Last Updated:** 2026-01-30  

---

## Completed ✅

### 1. API Routes Created

- ✅ [`app/api/proposals/verify/route.ts`](invoify/app/api/proposals/verify/route.ts:1) - POST endpoint that runs all 4 verification layers
- ✅ [`app/api/proposals/auto-fix/route.ts`](invoify/app/api/proposals/auto-fix/route.ts:1) - POST endpoint that executes auto-fix on specific exceptions
- ✅ [`app/api/proposals/reconcile/route.ts`](invoify/app/api/proposals/reconcile/route.ts:1) - POST/GET endpoint for reconciliation reports

### 2. Service Integration

- ✅ [`services/proposal/server/excelImportService.ts`](invoify/services/proposal/server/excelImportService.ts:1) - Updated to compute verification manifest during Excel import

---

## Pending Tasks 🚧

### 1. Update generateProposalPdfService.ts

**File:** `services/proposal/server/generateProposalPdfService.ts` (or similar)

**What needs to be done:**

```typescript
// Add verification check before PDF generation
export async function generateProposalPdf(proposalId: string) {
    // 1. Fetch proposal verification status
    const verification = await fetchVerificationStatus(proposalId);
    
    // 2. Check if verification is required
    if (verification.status === 'BLOCKED') {
        throw new Error('Cannot generate PDF: Proposal has critical errors');
    }
    
    // 3. Check if verification is stale (needs re-verification)
    const needsReverification = await checkIfReverificationNeeded(proposalId);
    if (needsReverification) {
        await reverifyProposal(proposalId);
    }
    
    // 4. Generate PDF from verified data
    const pdf = await generatePdf(proposalId);
    
    // 5. Layer 2 verification: PDF vs Ugly Sheet
    // Both must be generated from the same data snapshot
    const pdfSnapshot = extractDataSnapshot(pdf);
    const uglySheetSnapshot = await generateUglySheet(proposalId);
    
    // Verify snapshots match (canonical hash comparison)
    const snapshotsMatch = canonicalHashEqual(pdfSnapshot, uglySheetSnapshot);
    
    if (!snapshotsMatch) {
        throw new Error('PDF and Ugly Sheet snapshots do not match');
    }
    
    // 6. Return PDF with verification status
    return {
        pdf,
        verificationStatus: verification.status,
        layers: verification.manifest.layers,
    };
}
```

### 2. Database Integration (TODO)

**Files to create:**
- `lib/db/verification.ts` - Database operations for verification

**Functions needed:**
```typescript
// Save verification to database
export async function saveVerification(
    proposalId: string,
    data: {
        manifest: VerificationManifest;
        report: ReconciliationReport;
        exceptions: Exception[];
        autoFixResults?: AutoFixSummary;
    }
): Promise<void> {
    await prisma.proposal.update({
        where: { id: proposalId },
        data: {
            verificationManifest: data.manifest,
            verificationStatus: data.report.status,
            lastVerifiedAt: new Date(),
        },
    });
    
    // TODO: Save exceptions to database when Exception model is added
    // TODO: Save auto-fix results to database
}

// Fetch verification status
export async function fetchVerificationStatus(
    proposalId: string
): Promise<{ status: VerificationStatus; manifest: VerificationManifest }> {
    const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        select: {
            verificationStatus: true,
            verificationManifest: true,
        },
    });
    
    return {
        status: proposal?.verificationStatus || VerificationStatus.PENDING,
        manifest: proposal?.verificationManifest,
    };
}

// Create proposal version snapshot
export async function createProposalVersion(
    proposalId: string,
    data: {
        manifest: VerificationManifest;
        auditData: InternalAudit;
        pdfUrl?: string;
        uglySheetUrl?: string;
        changeReason: string;
    }
): Promise<void> {
    // Get current version count
    const versionCount = await prisma.proposalVersion.count({
        where: { proposalId },
    });
    
    await prisma.proposalVersion.create({
        data: {
            proposalId,
            versionNumber: versionCount + 1,
            manifest: data.manifest,
            auditData: data.auditData,
            pdfUrl: data.pdfUrl,
            uglySheetUrl: data.uglySheetUrl,
            changeReason: data.changeReason,
            createdBy: 'system', // TODO: Get from session
        },
    });
}
```

### 3. Excel Import API Integration (TODO)

**File:** `app/api/proposals/import-excel/route.ts` (or similar)

**What needs to be done:**
```typescript
export async function POST(req: NextRequest) {
    // 1. Parse Excel
    const buffer = await req.arrayBuffer();
    const parsed = await parseANCExcel(buffer);
    
    // 2. Create proposal with verification data
    const proposal = await prisma.proposal.create({
        data: {
            // ... existing fields
            verificationManifest: parsed.verificationManifest,
            verificationStatus: VerificationStatus.PENDING,
        },
    });
    
    // 3. Run initial verification
    const verification = await verifyProposal(proposal.id, {
        excelData: parsed.verificationManifest.excelImport,
        internalAudit: parsed.internalAudit,
    });
    
    // 4. Return proposal with verification status
    return NextResponse.json({
        proposal,
        verification,
    });
}
```

---

## API Endpoint Specifications

### POST /api/proposals/verify

**Request:**
```json
{
    "proposalId": "string",
    "excelData": {
        "fileName": "string",
        "screens": [...],
        "rowCount": 123,
        "screenCount": 15,
        ...
    },
    "internalAudit": {
        "perScreen": [...],
        "totals": {...}
    },
    "options": {
        "enableAutoFix": true,
        "varianceThreshold": 0.01,
        "variancePercentThreshold": 0.001
    }
}
```

**Response:**
```json
{
    "success": true,
    "proposalId": "string",
    "verification": {
        "status": "VERIFIED | WARNING | ERROR | BLOCKED",
        "manifest": { ... },
        "report": { ... },
        "exceptions": [ ... ],
        "autoFixResults": { ... },
        "roundingCompliance": { ... }
    }
}
```

### POST /api/proposals/auto-fix

**Request:**
```json
{
    "proposalId": "string",
    "exceptionIds": ["exc-1", "exc-2", "exc-3"],
    "proposal": { ... }
}
```

**Response:**
```json
{
    "success": true,
    "proposalId": "string",
    "results": {
        "total": 3,
        "applied": 2,
        "failed": 1,
        "actions": [ ... ],
        "failed": [ ... ]
    }
}
```

### POST /api/proposals/reconcile

**Request:**
```json
{
    "proposalId": "string",
    "manifest": { ... },
    "exceptions": [ ... ],
    "config": { ... }
}
```

**Response:**
```json
{
    "success": true,
    "proposalId": "string",
    "report": { ... }
}
```

---

## Next Steps

1. ✅ Create API routes (COMPLETED)
2. ⏳ Update generateProposalPdfService.ts (PENDING)
3. ⏳ Create database integration layer (PENDING)
4. ⏳ Update Excel import API to use verification (PENDING)
5. ⏳ Test API routes manually (PENDING)

---

**Phase 2 Progress:** 60% Complete (API routes done, service integration pending)
