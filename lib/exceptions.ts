/**
 * Exception Detection Engine
 * Detects and categorizes verification exceptions
 */

import { VerificationManifest, Exception, ExceptionType, ExceptionSeverity, ExceptionCategory } from '../types/verification';

// ============================================================================
// EXCEPTION DETECTION
// ============================================================================

/**
 * Detect all exceptions in verification manifest
 */
export function detectExceptions(manifest: VerificationManifest): Exception[] {
    const exceptions: Exception[] = [];
    
    // Detect Layer 1 exceptions (Excel vs Calculated)
    exceptions.push(...detectLayer1Exceptions(manifest));
    
    // Detect Layer 2 exceptions (PDF vs Ugly Sheet)
    exceptions.push(...detectLayer2Exceptions(manifest));
    
    // Detect Layer 3 exceptions (Rounding)
    exceptions.push(...detectLayer3Exceptions(manifest));
    
    // Detect Layer 4 exceptions (AI Visual)
    exceptions.push(...detectLayer4Exceptions(manifest));
    
    return exceptions;
}

function detectLayer1Exceptions(manifest: VerificationManifest): Exception[] {
    const exceptions: Exception[] = [];
    const { reconciliation, perScreen } = manifest;
    
    // Check if totals match
    if (!reconciliation.isMatch) {
        exceptions.push({
            id: generateId('exc'),
            type: ExceptionType.CALC_MISMATCH,
            severity: ExceptionSeverity.ERROR,
            category: ExceptionCategory.CALC_MISMATCH,
            autoFixable: false,
            resolved: false,
            message: `Excel total ($${reconciliation.sourceFinalTotal.toFixed(2)}) differs from calculated ($${reconciliation.calculatedFinalTotal.toFixed(2)}) by $${Math.abs(reconciliation.variance).toFixed(2)}`,
            description: `Variance: $${Math.abs(reconciliation.variance).toFixed(2)} (${(Math.abs(reconciliation.variancePercent) * 100).toFixed(2)}%)`,
            expected: reconciliation.sourceFinalTotal,
            actual: reconciliation.calculatedFinalTotal,
            variance: reconciliation.variance,
        });
    }
    
    // Check per-screen variances
    perScreen.forEach(screen => {
        const absVariance = Math.abs(screen.variance.finalTotal);
        if (absVariance > 1.0) {
            exceptions.push({
                id: generateId('exc'),
                type: ExceptionType.CALC_MISMATCH,
                severity: absVariance > 10 ? ExceptionSeverity.CRITICAL : ExceptionSeverity.ERROR,
                category: ExceptionCategory.CALC_MISMATCH,
                autoFixable: false,
                resolved: false,
                screenName: screen.name,
                rowIndex: screen.rowIndex,
                message: `Screen "${screen.name}" has high variance: $${absVariance.toFixed(2)} (${(Math.abs(screen.variance.percentVariance) * 100).toFixed(2)}%)`,
                description: `Source: $${screen.source.finalTotal.toFixed(2)}, Calculated: $${screen.calculated.finalTotal.toFixed(2)}`,
                expected: screen.source.finalTotal,
                actual: screen.calculated.finalTotal,
                variance: screen.variance.finalTotal,
            });
        }
    });
    
    return exceptions;
}

function detectLayer2Exceptions(manifest: VerificationManifest): Exception[] {
    const exceptions: Exception[] = [];
    
    // Layer 2 exceptions will be detected when PDF and Ugly Sheet are generated
    // For now, we'll add placeholder checks
    
    // Check if snapshots match (will be implemented in Phase 2)
    if (!manifest.layers.layer2 || manifest.layers.layer2.status === 'PENDING') {
        exceptions.push({
            id: generateId('exc'),
            type: ExceptionType.CALC_MISMATCH,
            severity: ExceptionSeverity.INFO,
            category: ExceptionCategory.CALC_MISMATCH,
            autoFixable: false,
            resolved: false,
            message: 'PDF and Ugly Sheet snapshots have not been compared yet',
            description: 'Layer 2 verification will run when PDF and Ugly Sheet are generated',
        });
    }
    
    return exceptions;
}

function detectLayer3Exceptions(manifest: VerificationManifest): Exception[] {
    const exceptions: Exception[] = [];
    
    // Check for rounding inconsistencies
    // This will be implemented with roundingAudit.ts in Phase 1
    
    // Rounding audit not yet implemented — always returns INFO
    exceptions.push({
        id: generateId('exc'),
        type: ExceptionType.ROUNDING_DRIFT,
        severity: ExceptionSeverity.INFO,
        category: ExceptionCategory.CALC_MISMATCH,
        autoFixable: false,
        resolved: false,
        message: 'Rounding audit not yet implemented',
        description: 'Will be added when roundingAudit.ts detection is built',
    });
    
    return exceptions;
}

function detectLayer4Exceptions(manifest: VerificationManifest): Exception[] {
    const exceptions: Exception[] = [];
    
    // Layer 4 exceptions will be detected when AI verification runs
    // For now, we'll add placeholder checks
    
    if (!manifest.layers.layer4 || manifest.layers.layer4.status === 'PENDING') {
        exceptions.push({
            id: generateId('exc'),
            type: ExceptionType.CALC_MISMATCH,
            severity: ExceptionSeverity.INFO,
            category: ExceptionCategory.CALC_MISMATCH,
            autoFixable: false,
            resolved: false,
            message: 'AI visual verification has not been run yet',
            description: 'Layer 4 verification will run when AI verification is triggered',
        });
    }
    
    return exceptions;
}

// ============================================================================
// EXCEPTION CATEGORIZATION
// ============================================================================

/**
 * Categorize exception by type and severity
 */
export function categorizeException(exception: Exception): {
    canAutoFix: boolean;
    requiresHumanReview: boolean;
    blocksExport: boolean;
} {
    const canAutoFix = exception.autoFixable;
    const requiresHumanReview = !exception.autoFixable || exception.severity === ExceptionSeverity.CRITICAL;
    const blocksExport = exception.severity === ExceptionSeverity.CRITICAL;
    
    return {
        canAutoFix,
        requiresHumanReview,
        blocksExport,
    };
}

/**
 * Get exception priority for sorting
 */
export function getExceptionPriority(exception: Exception): number {
    const severityPriority = {
        [ExceptionSeverity.CRITICAL]: 100,
        [ExceptionSeverity.ERROR]: 50,
        [ExceptionSeverity.WARNING]: 10,
        [ExceptionSeverity.INFO]: 1,
    };
    
    return severityPriority[exception.severity];
}

/**
 * Sort exceptions by priority
 */
export function sortExceptionsByPriority(exceptions: Exception[]): Exception[] {
    return [...exceptions].sort((a, b) => getExceptionPriority(b) - getExceptionPriority(a));
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Filter exceptions by category
 */
export function filterExceptionsByCategory(
    exceptions: Exception[],
    category: ExceptionCategory
): Exception[] {
    return exceptions.filter(exc => exc.category === category);
}

/**
 * Filter exceptions by severity
 */
export function filterExceptionsBySeverity(
    exceptions: Exception[],
    severity: ExceptionSeverity
): Exception[] {
    return exceptions.filter(exc => exc.severity === severity);
}

/**
 * Get exception summary
 */
export function getExceptionSummary(exceptions: Exception[]): {
    total: number;
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    autoFixable: number;
    resolved: number;
    unresolved: number;
} {
    return {
        total: exceptions.length,
        critical: exceptions.filter(e => e.severity === ExceptionSeverity.CRITICAL).length,
        errors: exceptions.filter(e => e.severity === ExceptionSeverity.ERROR).length,
        warnings: exceptions.filter(e => e.severity === ExceptionSeverity.WARNING).length,
        info: exceptions.filter(e => e.severity === ExceptionSeverity.INFO).length,
        autoFixable: exceptions.filter(e => e.autoFixable).length,
        resolved: exceptions.filter(e => e.resolved).length,
        unresolved: exceptions.filter(e => !e.resolved).length,
    };
}
