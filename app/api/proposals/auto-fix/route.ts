/**
 * POST /api/proposals/auto-fix
 * Runs auto-fix on specific exceptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeAutoFix } from '@/lib/autoFix';
import { Exception } from '@/types/verification';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proposalId, exceptionIds, proposal } = body;
        
        if (!proposalId || !exceptionIds || !Array.isArray(exceptionIds)) {
            return NextResponse.json(
                { error: 'proposalId and exceptionIds array are required' },
                { status: 400 }
            );
        }

        // Auto-fix is not yet implemented — all rules have stub implementations
        // (updateProposalField, estimateFromSimilarScreens, detectHeaderRowStrict are no-ops)
        // TODO: Implement real auto-fix when database-backed field updates are built
        return NextResponse.json({
            success: true,
            proposalId,
            results: {
                total: exceptionIds.length,
                applied: 0,
                failed: exceptionIds.length,
                actions: [],
                failedActions: exceptionIds.map((id: string) => ({
                    exceptionId: id,
                    reason: 'Auto-fix not yet implemented. Manual resolution required.',
                })),
            },
        });
    } catch (error) {
        console.error('Auto-fix error:', error);
        return NextResponse.json(
            { 
                error: 'Auto-fix failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
