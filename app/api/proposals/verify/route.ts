/**
 * POST /api/proposals/verify
 * Runs all 4 verification layers and returns verification report
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeManifest, generateReconciliationReport } from '@/lib/verification';
import { detectExceptions } from '@/lib/exceptions';
// import { executeAutoFixBatch } from '@/lib/autoFix'; // Disabled — auto-fix stubs not implemented
import { getRoundingAuditSummary } from '@/lib/roundingAudit';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proposalId, excelData, internalAudit, options } = body;
        
        if (!proposalId) {
            return NextResponse.json(
                { error: 'proposalId is required' },
                { status: 400 }
            );
        }
        
        // Step 1: Compute verification manifest
        const manifest = computeManifest(excelData, internalAudit, options);
        
        // Step 2: Detect exceptions
        let exceptions = detectExceptions(manifest);
        
        // Step 3: Auto-fix is disabled — all fix rules are stubs (no real field updates)
        // TODO: Re-enable when updateProposalField() and related stubs are implemented
        const autoFixResults = null;
        
        // Step 4: Generate reconciliation report
        const report = generateReconciliationReport(manifest, exceptions, options);
        
        // Step 5: Verify rounding contract
        const roundingCompliance = getRoundingAuditSummary();
        
        // Step 6: Save to database (TODO: Implement in Phase 2)
        // await saveVerification(proposalId, { manifest, report, exceptions, autoFixResults });
        
        return NextResponse.json({
            success: true,
            proposalId,
            verification: {
                status: report.status,
                manifest,
                report,
                exceptions,
                autoFixResults,
                roundingCompliance,
            },
        });
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { 
                error: 'Verification failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
