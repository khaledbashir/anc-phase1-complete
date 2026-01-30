/**
 * POST /api/proposals/reconcile
 * Generates reconciliation report for a proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReconciliationReport } from '@/lib/verification';
import { detectExceptions } from '@/lib/exceptions';
import { VerificationManifest, VerificationConfig } from '@/types/verification';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proposalId, manifest, exceptions, config } = body;
        
        if (!proposalId || !manifest) {
            return NextResponse.json(
                { error: 'proposalId and manifest are required' },
                { status: 400 }
            );
        }
        
        // Detect exceptions if not provided
        let detectedExceptions = exceptions;
        if (!detectedExceptions) {
            detectedExceptions = detectExceptions(manifest);
        }
        
        // Generate reconciliation report
        const report = generateReconciliationReport(
            manifest,
            detectedExceptions,
            config
        );
        
        return NextResponse.json({
            success: true,
            proposalId,
            report,
        });
    } catch (error) {
        console.error('Reconciliation error:', error);
        return NextResponse.json(
            { 
                error: 'Reconciliation failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/proposals/reconcile
 * Fetches latest reconciliation report for a proposal
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const proposalId = searchParams.get('proposalId');
        
        if (!proposalId) {
            return NextResponse.json(
                { error: 'proposalId is required' },
                { status: 400 }
            );
        }
        
        // TODO: Fetch from database in Phase 2
        // const report = await fetchReconciliationReport(proposalId);
        
        return NextResponse.json({
            success: true,
            proposalId,
            // report, // Uncomment when database integration is complete
            message: 'Database integration pending - will be completed in Phase 2',
        });
    } catch (error) {
        console.error('Fetch reconciliation error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch reconciliation report',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
