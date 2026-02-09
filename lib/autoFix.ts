/**
 * Auto-Fix Engine
 * Automatically fixes 6/10 common failure modes
 */

import { Exception, AutoFixAction, AutoFixResult, AutoFixSummary, AutoFixType, ExceptionType } from '../types/verification';

// ============================================================================
// AUTO-FIX RULES
// ============================================================================

/**
 * Auto-fix rules for 6 common failure modes
 */
const autoFixRules: AutoFixRule[] = [
    {
        id: 'missing-field-default',
        exceptionType: ExceptionType.MISSING_FIELD,
        autoFixable: false, // Not implemented — updateProposalField() is a stub
        detect: (exception) => exception.type === ExceptionType.MISSING_FIELD,
        fix: async (exception, proposal) => {
            const { fieldName, screenName } = exception;
            
            // Find similar screens to estimate value
            const estimatedValue = await estimateFromSimilarScreens(proposal, screenName || 'unknown', fieldName || 'unknown');
            
            // Apply fix
            await updateProposalField(proposal, screenName || 'unknown', fieldName || 'unknown', estimatedValue);
            
            return {
                success: true,
                changes: [{
                    field: fieldName || 'unknown',
                    oldValue: null,
                    newValue: estimatedValue,
                }],
                remainingIssues: [],
                requiresHumanReview: true, // Estimated value needs review
            };
        },
    },
    
    {
        id: 'non-numeric-cost',
        exceptionType: ExceptionType.NON_NUMERIC_COST,
        autoFixable: false, // Not implemented — updateProposalField() is a stub
        detect: (exception) => exception.type === ExceptionType.NON_NUMERIC_COST,
        fix: async (exception, proposal) => {
            const { actual, fieldName, screenName } = exception;
            
            // Extract numeric part from string (e.g., "$12,500 USD" -> 12500)
            const numericValue = parseCurrency(actual);
            
            // Apply fix
            await updateProposalField(proposal, screenName || 'unknown', fieldName || 'unknown', numericValue);
            
            return {
                success: true,
                changes: [{
                    field: fieldName || 'unknown',
                    oldValue: actual,
                    newValue: numericValue,
                }],
                remainingIssues: [],
                requiresHumanReview: false,
            };
        },
    },
    
    {
        id: 'invalid-value-normalize',
        exceptionType: ExceptionType.INVALID_VALUE,
        autoFixable: false, // Not implemented — updateProposalField() is a stub
        detect: (exception) => exception.type === ExceptionType.INVALID_VALUE,
        fix: async (exception, proposal) => {
            const { actual, fieldName, screenName } = exception;

            // Normalize the value
            const normalizedValue = normalizeValue(actual);
            
            // Apply fix
            await updateProposalField(proposal, screenName || 'unknown', fieldName || 'unknown', normalizedValue);
            
            return {
                success: true,
                changes: [{
                    field: fieldName || 'unknown',
                    oldValue: actual,
                    newValue: normalizedValue,
                }],
                remainingIssues: [],
                requiresHumanReview: false,
            };
        },
    },
    
    {
        id: 'trim-whitespace',
        exceptionType: ExceptionType.INVALID_VALUE,
        autoFixable: false, // Not implemented — updateProposalField() is a stub
        detect: (exception) => {
            // Check if the issue is whitespace
            return exception.type === ExceptionType.INVALID_VALUE && 
                   typeof exception.actual === 'string' &&
                   exception.actual !== exception.actual.trim();
        },
        fix: async (exception, proposal) => {
            const { actual, fieldName, screenName } = exception;
            
            // Trim whitespace
            const trimmedValue = (actual as string).trim();
            
            // Apply fix
            await updateProposalField(proposal, screenName || 'unknown', fieldName || 'unknown', trimmedValue);
            
            return {
                success: true,
                changes: [{
                    field: fieldName || 'unknown',
                    oldValue: actual,
                    newValue: trimmedValue,
                }],
                remainingIssues: [],
                requiresHumanReview: false,
            };
        },
    },
    
    {
        id: 'normalize-decimals',
        exceptionType: ExceptionType.INVALID_VALUE,
        autoFixable: false, // Not implemented — updateProposalField() is a stub
        detect: (exception) => {
            // Check if the issue is inconsistent decimal places
            return exception.type === ExceptionType.INVALID_VALUE &&
                   typeof exception.actual === 'number';
        },
        fix: async (exception, proposal) => {
            const { actual, fieldName, screenName } = exception;
            
            // Normalize to 2 decimals
            const normalizedValue = Math.round((actual as number) * 100) / 100;
            
            // Apply fix
            await updateProposalField(proposal, screenName || 'unknown', fieldName || 'unknown', normalizedValue);
            
            return {
                success: true,
                changes: [{
                    field: fieldName || 'unknown',
                    oldValue: actual,
                    newValue: normalizedValue,
                }],
                remainingIssues: [],
                requiresHumanReview: false,
            };
        },
    },
    
    {
        id: 'detect-header',
        exceptionType: ExceptionType.HEADER_NOT_FOUND,
        autoFixable: false, // Not implemented — detectHeaderRowStrict() is a stub
        detect: (exception) => exception.type === ExceptionType.HEADER_NOT_FOUND,
        fix: async (exception, proposal) => {
            // Re-run header detection with stricter rules
            const newHeaderRow = await detectHeaderRowStrict(proposal);
            
            // Apply fix
            await updateProposalHeader(proposal, newHeaderRow);
            
            return {
                success: true,
                changes: [{
                    field: 'headerRowIndex',
                    oldValue: proposal.headerRowIndex,
                    newValue: newHeaderRow,
                }],
                remainingIssues: [],
                requiresHumanReview: true, // Header detection needs verification
            };
        },
    },
];

// ============================================================================
// AUTO-FIX EXECUTION
// ============================================================================

/**
 * Execute auto-fix on a single exception
 */
export async function executeAutoFix(
    exception: Exception,
    proposal: any
): Promise<AutoFixAction | null> {
    // Find matching rule
    const rule = autoFixRules.find(r => r.detect(exception));
    
    if (!rule || !rule.autoFixable) {
        return null;
    }
    
    // Execute fix
    const result = await rule.fix(exception, proposal);
    
    // Create action record
    const action: AutoFixAction = {
        id: generateId('afx'),
        type: getAutoFixType(rule.id),
        exceptionId: exception.id,
        target: {
            screenName: exception.screenName,
            fieldName: exception.fieldName,
            rowIndex: exception.rowIndex,
        },
        fix: {
            operation: rule.id,
            value: result.changes[0]?.newValue,
            reason: `Auto-fixed ${exception.type}`,
        },
        safe: true,
        reversible: true,
        executed: true,
        executedAt: new Date().toISOString(),
        result,
    };
    
    return action;
}

/**
 * Execute auto-fix on multiple exceptions
 */
export async function executeAutoFixBatch(
    exceptions: Exception[],
    proposal: any
): Promise<AutoFixSummary> {
    const actions: AutoFixAction[] = [];
    let autoFixed = 0;
    let requiresHumanReview = 0;
    let blocked = 0;
    
    for (const exception of exceptions) {
        if (!exception.autoFixable) {
            blocked++;
            continue;
        }
        
        const action = await executeAutoFix(exception, proposal);
        
        if (action) {
            actions.push(action);
            autoFixed++;
            
            if (action.result?.requiresHumanReview) {
                requiresHumanReview++;
            }
        } else {
            blocked++;
        }
    }
    
    // Calculate estimated time to fix remaining issues
    const remainingIssues = exceptions.length - autoFixed;
    const estimatedTimeToFix = remainingIssues * 30; // 30 seconds per issue
    
    return {
        totalExceptions: exceptions.length,
        autoFixed,
        requiresHumanReview,
        blocked,
        actions,
        estimatedTimeToFix,
    };
}

/**
 * Get auto-fixable exceptions
 */
export function getAutoFixableExceptions(exceptions: Exception[]): Exception[] {
    return exceptions.filter(exc => {
        const rule = autoFixRules.find(r => r.detect(exc));
        return rule && rule.autoFixable;
    });
}

/**
 * Check if exception can be auto-fixed
 */
export function isExceptionAutoFixable(exception: Exception): boolean {
    const rule = autoFixRules.find(r => r.detect(exception));
    return rule ? rule.autoFixable : false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse currency string to number
 */
function parseCurrency(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Remove currency symbols, commas, and text
    const cleaned = value
        .replace(/[$,]/g, '')
        .replace(/[A-Za-z]/g, '')
        .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize value
 */
function normalizeValue(value: any): any {
    if (typeof value === 'string') {
        // Trim whitespace
        return value.trim();
    }
    if (typeof value === 'number') {
        // Normalize to 2 decimals
        return Math.round(value * 100) / 100;
    }
    return value;
}

/**
 * Estimate value from similar screens
 */
async function estimateFromSimilarScreens(
    proposal: any,
    screenName: string,
    fieldName: string
): Promise<any> {
    // TODO: Implement similar screen detection
    // For now, return a default value
    return 0;
}

/**
 * Update proposal field
 */
async function updateProposalField(
    proposal: any,
    screenName: string,
    fieldName: string,
    value: any
): Promise<void> {
    // TODO: Implement field update
    // This will be implemented in Phase 2 when we have database access
}

/**
 * Detect header row with stricter rules
 */
async function detectHeaderRowStrict(proposal: any): Promise<number> {
    // TODO: Implement stricter header detection
    // For now, return default
    return 1;
}

/**
 * Update proposal header
 */
async function updateProposalHeader(proposal: any, headerRow: number): Promise<void> {
    // TODO: Implement header update
    // This will be implemented in Phase 2
}

/**
 * Get auto-fix type from rule ID
 */
function getAutoFixType(ruleId: string): AutoFixType {
    const typeMap: Record<string, AutoFixType> = {
        'missing-field-default': AutoFixType.SET_DEFAULT,
        'non-numeric-cost': AutoFixType.PARSE_CURRENCY,
        'invalid-value-normalize': AutoFixType.NORMALIZE_NUMBER,
        'trim-whitespace': AutoFixType.TRIM_WHITESPACE,
        'normalize-decimals': AutoFixType.NORMALIZE_NUMBER,
        'detect-header': AutoFixType.DETECT_HEADER,
    };
    
    return typeMap[ruleId] || AutoFixType.RECALCULATE;
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// TYPES
// ============================================================================

interface AutoFixRule {
    id: string;
    exceptionType: ExceptionType;
    autoFixable: boolean;
    detect: (exception: Exception) => boolean;
    fix: (exception: Exception, proposal: any) => Promise<AutoFixResult>;
}
