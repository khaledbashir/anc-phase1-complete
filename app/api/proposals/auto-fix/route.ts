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
        
        // Get exceptions from proposal or database
        // TODO: Implement in Phase 2 - fetch exceptions from database
        const exceptions: Exception[] = proposal?.exceptions || [];
        
        // Filter exceptions to auto-fix
        const exceptionsToFix = exceptions.filter(exc => exceptionIds.includes(exc.id));
        
        // Execute auto-fix on each exception
        const actions = [];
        const failed = [];
        
        for (const exception of exceptionsToFix) {
            try {
                const action = await executeAutoFix(exception, proposal);
                
                if (action) {
                    actions.push(action);
                } else {
                    failed.push({
                        exceptionId: exception.id,
                        reason: 'No auto-fix rule found or not auto-fixable',
                    });
                }
            } catch (error) {
                failed.push({
                    exceptionId: exception.id,
                    reason: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        
        return NextResponse.json({
            success: true,
            proposalId,
            results: {
                total: exceptionIds.length,
                applied: actions.length,
                failed: failed.length,
                actions,
                failedActions: failed,
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
