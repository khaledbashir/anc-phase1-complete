/**
 * Gap Fill Questions Generator
 * 
 * Generates natural language questions for missing or low-confidence fields.
 * Implements Phase 2.1.2: Gap Fill Chat Sidebar logic.
 * 
 * Priority: P0 fields (Pitch, Resolution, Brightness) > P1 fields (Service Type, Location)
 */

export interface GapFillQuestion {
    id: string;
    fieldPath: string;
    fieldName: string;
    screenIndex?: number;
    screenName?: string;
    question: string;
    type: "multiple-choice" | "text" | "number" | "boolean";
    options?: string[];
    priority: "high" | "medium" | "low";
    confidence?: number; // If field exists but has low confidence
}

/**
 * Generate gap fill questions from proposal data
 */
export function generateGapFillQuestions(proposal: any): GapFillQuestion[] {
    const questions: GapFillQuestion[] = [];
    const screens = proposal?.details?.screens || [];
    const aiFilledFields = proposal?.aiFilledFields || [];
    const verifiedFields = proposal?.verifiedFields || {};
    
    // P0 Fields (Critical - must have)
    const p0Fields = [
        { key: "pitchMm", label: "Pixel Pitch", type: "number" as const },
        { key: "widthFt", label: "Width", type: "number" as const },
        { key: "heightFt", label: "Height", type: "number" as const },
        { key: "pixelsW", label: "Resolution Width", type: "number" as const },
        { key: "pixelsH", label: "Resolution Height", type: "number" as const },
    ];
    
    // P1 Fields (Important - should have)
    const p1Fields = [
        { key: "brightness", label: "Brightness", type: "number" as const },
        { key: "serviceType", label: "Service Type", type: "multiple-choice" as const, options: ["Front", "Rear", "Top"] },
        { key: "application", label: "Application", type: "multiple-choice" as const, options: ["Indoor", "Outdoor"] },
    ];
    
    // Check each screen for missing P0 fields
    screens.forEach((screen: any, index: number) => {
        const screenName = screen.name || screen.externalName || `Screen ${index + 1}`;
        const screenPrefix = `details.screens[${index}]`;
        
        // P0 Fields (High Priority)
        p0Fields.forEach(field => {
            const fieldPath = `${screenPrefix}.${field.key}`;
            const value = screen[field.key];
            const isAIFilled = aiFilledFields.includes(fieldPath);
            const isVerified = !!verifiedFields[fieldPath];
            
            // Missing or zero value
            if (!value || value === 0 || value === "") {
                questions.push({
                    id: `gap-${index}-${field.key}`,
                    fieldPath,
                    fieldName: field.label,
                    screenIndex: index,
                    screenName,
                    question: `I found the display "${screenName}", but I cannot find the ${field.label}. ${getContextualQuestion(field.key, screen)}`,
                    type: field.type,
                    priority: "high",
                });
            }
            // Low confidence AI field (not verified)
            else if (isAIFilled && !isVerified) {
                // Check if we have confidence data (would need to store this)
                questions.push({
                    id: `verify-${index}-${field.key}`,
                    fieldPath,
                    fieldName: field.label,
                    screenIndex: index,
                    screenName,
                    question: `I extracted ${field.label} as "${value}" for "${screenName}". Please verify this is correct.`,
                    type: field.type,
                    priority: "high",
                    confidence: 0.75, // Default if not stored
                });
            }
        });
        
        // P1 Fields (Medium Priority)
        p1Fields.forEach(field => {
            const fieldPath = `${screenPrefix}.${field.key}`;
            const value = screen[field.key];
            const isAIFilled = aiFilledFields.includes(fieldPath);
            const isVerified = !!verifiedFields[fieldPath];
            
            if (!value || value === "") {
                questions.push({
                    id: `gap-${index}-${field.key}`,
                    fieldPath,
                    fieldName: field.label,
                    screenIndex: index,
                    screenName,
                    question: `For "${screenName}", I cannot determine the ${field.label}. ${getContextualQuestion(field.key, screen)}`,
                    type: field.type,
                    options: field.options,
                    priority: "medium",
                });
            }
            else if (isAIFilled && !isVerified) {
                questions.push({
                    id: `verify-${index}-${field.key}`,
                    fieldPath,
                    fieldName: field.label,
                    screenIndex: index,
                    screenName,
                    question: `I extracted ${field.label} as "${value}" for "${screenName}". Is this correct?`,
                    type: field.type,
                    options: field.options,
                    priority: "medium",
                });
            }
        });
    });
    
    // Project-level gaps
    if (!proposal?.receiver?.name || proposal?.receiver?.name === "[CLIENT NAME]") {
        questions.push({
            id: "gap-client-name",
            fieldPath: "receiver.name",
            fieldName: "Client Name",
            question: "What is the client name for this proposal?",
            type: "text",
            priority: "high",
        });
    }
    
    if (!proposal?.details?.proposalName) {
        questions.push({
            id: "gap-project-name",
            fieldPath: "details.proposalName",
            fieldName: "Project Name",
            question: "What is the project name or title?",
            type: "text",
            priority: "medium",
        });
    }
    
    // Sort by priority (high first)
    return questions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Generate contextual question based on field type
 */
function getContextualQuestion(fieldKey: string, screen: any): string {
    const contextualQuestions: Record<string, string> = {
        pitchMm: "What is the pixel pitch (e.g., 4mm, 6mm, 10mm)?",
        widthFt: "What is the display width in feet?",
        heightFt: "What is the display height in feet?",
        pixelsW: "What is the horizontal pixel resolution?",
        pixelsH: "What is the vertical pixel resolution?",
        brightness: "What is the required brightness rating (in nits or cd/m²)?",
        serviceType: "Is this Front Service, Rear Service, or Top Service?",
        application: "Is this an Indoor or Outdoor installation?",
    };
    
    return contextualQuestions[fieldKey] || `What is the ${fieldKey}?`;
}

/**
 * Format question for display in sidebar
 */
export function formatGapFillQuestion(question: GapFillQuestion): string {
    let formatted = question.question;
    
    if (question.screenName) {
        formatted = formatted.replace(/"/g, `"${question.screenName}"`);
    }
    
    if (question.options && question.options.length > 0) {
        formatted += `\n\nOptions: ${question.options.join(", ")}`;
    }
    
    return formatted;
}
