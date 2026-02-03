/**
 * SOW Generator Service - REQ-123: Bespoke SOW Generation
 * 
 * Hybrid Implementation: Template + AI
 * - Fixed legal structure (Exhibit A framework)
 * - AI-populated dynamic blocks for Design & Construction sections
 * - Context-aware clause injection (Union, Outdoor, Morgantown, etc.)
 * 
 * "The SOW Sandwich" Pattern:
 * [FIXED HEADER] → [AI DYNAMIC BLOCK 1] → [AI DYNAMIC BLOCK 2] → [FIXED FOOTER]
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

// ============================================================================
// TYPES
// ============================================================================

export interface SOWProjectContext {
    // Project Basics
    venue: string;
    clientName: string;
    projectLocation: string;
    
    // Display Configuration
    displays: Array<{
        name: string;
        type: "Indoor" | "Outdoor" | "Mixed";
        widthFt: number;
        heightFt: number;
        pitchMm: number;
        quantity: number;
    }>;
    
    // AI-Detected Requirements (from RFP parsing)
    specialRequirements: string[];
    rfpText?: string;
    
    // Context Flags
    isUnionLabor?: boolean;
    isOutdoor?: boolean;
    isMorgantown?: boolean;
    includePerformanceBond?: boolean;
    includeSpareParts?: boolean;
    structuralTonnage?: number;
    liquidatedDamagesPerDay?: number;
    
    // Custom overrides
    customDesignNotes?: string;
    customConstructionNotes?: string;
}

export interface SOWSection {
    id: string;
    title: string;
    content: string;
    category: "HEADER" | "DESIGN" | "CONSTRUCTION" | "COMPLIANCE" | "FOOTER";
    isEditable: boolean;
    isAIGenerated: boolean;
}

export interface GeneratedSOW {
    sections: SOWSection[];
    metadata: {
        generatedAt: string;
        projectContext: Partial<SOWProjectContext>;
        aiModel?: string;
    };
}

// ============================================================================
// FIXED LEGAL TEMPLATES (Never AI-generated)
// ============================================================================

const FIXED_TEMPLATES = {
    HEADER: {
        id: "exhibit-a-header",
        title: "EXHIBIT A: STATEMENT OF WORK",
        content: `This Statement of Work ("SOW") is incorporated by reference into the Agreement between ANC Sports Enterprises, LLC ("ANC") and the Client identified in the Sales Quotation.`,
        category: "HEADER" as const,
        isEditable: false,
        isAIGenerated: false,
    },
    
    WARRANTY: {
        id: "warranty-standard",
        title: "WARRANTY",
        content: `ANC warrants all LED display products for a period of ten (10) years from the date of final acceptance. This warranty covers defects in materials and workmanship under normal use conditions. Electronics and control systems are warranted for two (2) years.`,
        category: "COMPLIANCE" as const,
        isEditable: false,
        isAIGenerated: false,
    },
    
    SIGNATURE_BLOCK: {
        id: "signature-block",
        title: "AGREED TO AND ACCEPTED",
        content: `By signing below, the parties acknowledge that they have read, understood, and agree to be bound by the terms of this Statement of Work.`,
        category: "FOOTER" as const,
        isEditable: false,
        isAIGenerated: false,
    },
};

// ============================================================================
// CONDITIONAL CLAUSE LIBRARY (Injected based on context)
// ============================================================================

const CONDITIONAL_CLAUSES = {
    UNION_LABOR: {
        id: "union-labor-ibew",
        title: "LABOR COMPLIANCE (IBEW)",
        content: `All installation labor will be performed by IBEW-certified union electricians in accordance with applicable collective bargaining agreements. A labor compliance surcharge of 15% is included in the pricing to cover union wages, benefits, and certified payroll requirements.`,
        category: "COMPLIANCE" as const,
        isEditable: true,
        isAIGenerated: false,
    },
    
    OUTDOOR_IP65: {
        id: "outdoor-weatherproofing",
        title: "OUTDOOR WEATHERPROOFING (IP65)",
        content: `All outdoor display systems include IP65-rated weatherproofing. Installation includes:
• Integrated HVAC cooling systems rated for -22°F to 122°F operation
• UV-resistant front service access panels
• Lightning protection and surge suppression
• Wind load engineering per local building codes (minimum 90 mph sustained)`,
        category: "CONSTRUCTION" as const,
        isEditable: true,
        isAIGenerated: false,
    },
    
    MORGANTOWN_TAX: {
        id: "morgantown-bo-tax",
        title: "MORGANTOWN B&O TAX",
        content: `This project is subject to Morgantown City Business & Occupation Tax at a rate of 2.0% applied to all labor and materials delivered within city limits.`,
        category: "COMPLIANCE" as const,
        isEditable: false,
        isAIGenerated: false,
    },
    
    PERFORMANCE_BOND: {
        id: "performance-bond",
        title: "PERFORMANCE BOND",
        content: `A Performance Bond equal to 1.5% of the total contract value is included in this proposal. Bond documentation will be provided within 10 business days of contract execution.`,
        category: "COMPLIANCE" as const,
        isEditable: false,
        isAIGenerated: false,
    },
    
    SPARE_PARTS: {
        id: "spare-parts-attic-stock",
        title: "SPARE PARTS INVENTORY (ATTIC STOCK)",
        content: `Per RFP requirements, this proposal includes a minimum 5% spare parts inventory (attic stock) comprising:
• LED modules (matching production lot)
• Power supplies
• Receiving cards
• Critical mounting hardware

Spare parts will be delivered with the main shipment and stored on-site per client direction.`,
        category: "CONSTRUCTION" as const,
        isEditable: true,
        isAIGenerated: false,
    },
    
    LIQUIDATED_DAMAGES: {
        id: "liquidated-damages",
        title: "LIQUIDATED DAMAGES",
        content: `In the event of delay beyond the agreed completion date, liquidated damages of $[AMOUNT]/day will apply, not to exceed 10% of the total contract value.`,
        category: "COMPLIANCE" as const,
        isEditable: true,
        isAIGenerated: false,
    },
    
    WV_PE_STAMP: {
        id: "wv-pe-stamp",
        title: "WEST VIRGINIA ENGINEERING",
        content: `All structural drawings and calculations will be prepared and stamped by a Professional Engineer (PE) licensed in the State of West Virginia.`,
        category: "DESIGN" as const,
        isEditable: false,
        isAIGenerated: false,
    },
};

// ============================================================================
// AI PROMPT TEMPLATES (Constrained generation)
// ============================================================================

const AI_PROMPTS = {
    DESIGN_SERVICES: (ctx: SOWProjectContext) => `
You are a legal proposal assistant for ANC Sports Enterprises writing the "Design Services" section of Exhibit A (Statement of Work).

PROJECT CONTEXT:
- Venue: ${ctx.venue}
- Client: ${ctx.clientName}
- Location: ${ctx.projectLocation}
- Displays: ${ctx.displays.length} LED display system(s)
- Display Details: ${ctx.displays.map(d => `${d.name} (${d.widthFt}'W x ${d.heightFt}'H, ${d.pitchMm}mm pitch, Qty ${d.quantity})`).join("; ")}
- Environment: ${ctx.isOutdoor ? "Outdoor (IP65 Required)" : "Indoor"}
${ctx.isMorgantown ? "- IMPORTANT: Project is in West Virginia - reference WV-licensed PE for stamped drawings" : ""}
${ctx.structuralTonnage ? `- Structural Steel: Approximately ${ctx.structuralTonnage} tons` : ""}

RULES:
1. DO NOT invent warranty terms (standard is 10 years for LED, 2 years for electronics)
2. DO NOT include pricing or financial terms
3. DO include references to "stamped engineering drawings" and "shop drawings"
4. Keep the tone professional and legally precise
5. Maximum 150 words

Write a professional "Design Services" paragraph describing ANC's design-build obligations for this specific project:`,

    CONSTRUCTION_SERVICES: (ctx: SOWProjectContext) => `
You are a legal proposal assistant for ANC Sports Enterprises writing the "Construction Services" section of Exhibit A (Statement of Work).

PROJECT CONTEXT:
- Venue: ${ctx.venue}
- Client: ${ctx.clientName}
- Displays: ${ctx.displays.length} LED display system(s)
- Environment: ${ctx.isOutdoor ? "Outdoor" : "Indoor"}
${ctx.isUnionLabor ? "- IMPORTANT: Union labor required (IBEW)" : "- Standard labor"}
${ctx.structuralTonnage ? `- Structural Steel: Approximately ${ctx.structuralTonnage} tons` : ""}
${ctx.liquidatedDamagesPerDay ? `- Liquidated Damages: $${ctx.liquidatedDamagesPerDay}/day for delays` : ""}

SPECIAL REQUIREMENTS FROM RFP:
${ctx.specialRequirements.length > 0 ? ctx.specialRequirements.map(r => `- ${r}`).join("\n") : "- None specified"}

RULES:
1. DO NOT invent completion dates
2. DO NOT include pricing
3. DO include installation logistics, rigging, and coordination requirements
4. If outdoor, mention weatherproofing and environmental protection during install
5. Maximum 150 words

Write a professional "Construction Services" paragraph describing installation logistics for this specific project:`,
};

// ============================================================================
// "RISK-AWARE" SOW GENERATOR - Scans Filtered RFP Text for Risk Keywords
// ============================================================================

/**
 * Scans the filtered RFP text for risk keywords to generate context-aware SOW sections
 * This is called "Risk-Aware" because it adapts the SOW content based on detected project risks
 */
export class RiskAwareSOWGenerator {
    
    /**
     * SCAN FOR RISK KEYWORDS
     * Scans filtered RFP text for risk categories that impact cost and compliance:
     * 1. Union / Prevailing Wage / IBEW / Davis-Bacon (Triggers Labor Clause)
     * 2. Outdoor / IP65 (Triggers Weatherproofing Clause)
     * 3. Liquidated Damages (Triggers Schedule Adherence Clause)
     * 4. Performance Bond - detects 100% bond requirements (Triggers cost override)
     * 5. Spare Parts / Attic Stock - detects 5% vs 2% requirements (Triggers cost adjustment)
     */
    static scanForRiskKeywords(filteredRfpText: string): {
        hasUnionRequirement: boolean;
        hasOutdoorRequirement: boolean;
        hasLiquidatedDamages: boolean;
        hasPerformanceBond: boolean;
        has100PercentBond: boolean;
        hasSpareParts: boolean;
        has5PercentSpareParts: boolean;
        detectedKeywords: string[];
        financialTriggers: {
            bondRateOverride?: number; // 1.5% default, 100% if detected
            sparePartsPercentage?: number; // 2% default, 5% if detected
        };
    } {
        const textLower = filteredRfpText.toLowerCase();
        
        // Union and labor compliance
        const unionKeywords = ['union', 'prevailing wage', 'collective bargaining', 'ibew', 'davis-bacon', 'wage determination'];
        
        // Outdoor and weatherproofing
        const outdoorKeywords = ['outdoor', 'ip65', 'weatherproof', 'weather resistant', 'ip67', 'exterior'];
        
        // Liquidated damages
        const damagesKeywords = ['liquidated damages', 'liquidated damage', 'penalties per day', 'delay damages'];
        
        // Performance bond - detect both standard and 100% requirements
        const bondKeywords = ['performance bond', 'surety bond', 'contract bond'];
        const hundredPercentBondKeywords = ['100% performance bond', '100% contract bond', 'full performance bond', '100% surety'];
        
        // Spare parts / Attic stock - detect both generic and 5% specific
        const sparePartsKeywords = ['spare parts', 'attic stock', 'spare inventory', 'replacement parts'];
        const fivePercentSpareKeywords = ['5% spare', '5% attic', 'five percent spare', '5% replacement'];
        
        const hasUnionRequirement = unionKeywords.some(keyword => textLower.includes(keyword));
        const hasOutdoorRequirement = outdoorKeywords.some(keyword => textLower.includes(keyword));
        const hasLiquidatedDamages = damagesKeywords.some(keyword => textLower.includes(keyword));
        
        // Performance bond detection
        const hasPerformanceBond = bondKeywords.some(keyword => textLower.includes(keyword));
        const has100PercentBond = hundredPercentBondKeywords.some(keyword => textLower.includes(keyword));
        
        // Spare parts detection
        const hasSpareParts = sparePartsKeywords.some(keyword => textLower.includes(keyword));
        const has5PercentSpareParts = fivePercentSpareKeywords.some(keyword => textLower.includes(keyword));
        
        // Build detected keywords for UI
        const detectedKeywords = [
            ...(hasUnionRequirement ? ['Union/Prevailing Wage'] : []),
            ...(hasOutdoorRequirement ? ['Outdoor/IP65'] : []),
            ...(hasLiquidatedDamages ? ['Liquidated Damages'] : []),
            ...(hasPerformanceBond ? [`Performance Bond ${has100PercentBond ? '(100%)' : ''}`] : []),
            ...(hasSpareParts ? [`Spare Parts ${has5PercentSpareParts ? '(5%)' : ''}`] : [])
        ];
        
        // Financial triggers for cost calculations
        const financialTriggers = {
            // Default 1.5%, but 100% if detected (Alfond Arena requirement)
            bondRateOverride: has100PercentBond ? 1.0 : hasPerformanceBond ? 0.015 : undefined,
            // Default 2%, but 5% if explicitly required
            sparePartsPercentage: has5PercentSpareParts ? 0.05 : hasSpareParts ? 0.02 : undefined
        };
        
        return {
            hasUnionRequirement,
            hasOutdoorRequirement,
            hasLiquidatedDamages,
            hasPerformanceBond,
            has100PercentBond,
            hasSpareParts,
            has5PercentSpareParts,
            detectedKeywords,
            financialTriggers
        };
    }
    
    /**
     * GENERATE RISK-AWARE SOW JSON
     * Generates the 3-section JSON object for Exhibit A based on detected risks
     * Includes financial triggers for bond rates and spare parts percentages
     */
    static generateRiskAwareSOW(filteredRfpText: string, projectContext: any): {
        designServices: string;
        constructionLogistics: string;
        constraints: string;
        riskFlags: {
            union: boolean;
            outdoor: boolean;
            liquidatedDamages: boolean;
            performanceBond: boolean;
            hundredPercentBond: boolean;
            spareParts: boolean;
            fivePercentSpareParts: boolean;
        };
        financialTriggers: {
            bondRateOverride?: number;
            sparePartsPercentage?: number;
        };
    } {
        const risks = this.scanForRiskKeywords(filteredRfpText);
        
        // Design Services: Summarize design-build obligations from RFP
        let designServices = "ANC acts as the primary design-build contractor for the complete video, sound, and lighting systems as specified in the RFP. ANC will provide all engineering, shop drawings, and technical documentation required for permit submission and installation.";
        
        // Add PE stamp mention for certain project types
        if (filteredRfpText.toLowerCase().includes('university') || 
            filteredRfpText.toLowerCase().includes('college') ||
            filteredRfpText.toLowerCase().includes('stadium')) {
            designServices += " All structural drawings will be stamped by a licensed Professional Engineer (PE).";
        }
        
        // Construction Logistics: Conditional based on risk detection
        let constructionLogistics = "ANC will provide all labor, materials, and equipment for installation.";
        
        if (risks.hasUnionRequirement) {
            constructionLogistics += " All installation labor will be performed by IBEW-certified union electricians in accordance with applicable collective bargaining agreements. A labor compliance surcharge is included in the pricing.";
        }
        
        if (risks.hasOutdoorRequirement) {
            constructionLogistics += " All outdoor display systems include IP65-rated weatherproofing to withstand environmental conditions including rain, dust, and temperature extremes as specified in the RFP.";
        }
        
        if (risks.hasLiquidatedDamages) {
            constructionLogistics += " A strict project schedule will be maintained to avoid liquidated damages penalties as specified in the contract terms.";
        }
        
        // Spare parts mention in construction logistics
        if (risks.hasSpareParts) {
            const sparePercent = risks.has5PercentSpareParts ? "5%" : "2%";
            constructionLogistics += ` A ${sparePercent} spare parts inventory (attic stock) will be provided for long-term serviceability.`;
        }
        
        // Constraints: Summarize access rules and commercial terms from RFP
        const constraints: string[] = [];
        
        // Performance bond constraint
        if (risks.hasPerformanceBond) {
            if (risks.has100PercentBond) {
                constraints.push("100% Performance Bond required - Cost basis adjusted accordingly.");
            } else {
                constraints.push("Performance Bond (1.5% default) required per standard terms.");
            }
        }
        
        // Spare parts constraint
        if (risks.hasSpareParts) {
            const sparePercent = risks.has5PercentSpareParts ? "5%" : "2%";
            constraints.push(`${sparePercent} Spare Parts (Attic Stock) required - Included in pricing.`);
        }
        
        // Common constraints to look for
        if (filteredRfpText.toLowerCase().includes('7am') || filteredRfpText.toLowerCase().includes('7am-5pm')) {
            constraints.push("Work limited to 7:00 AM - 5:00 PM standard working hours.");
        }
        
        if (filteredRfpText.toLowerCase().includes('crane') && filteredRfpText.toLowerCase().includes('occupied')) {
            constraints.push("No crane lifts over occupied spaces during business hours.");
        }
        
        if (filteredRfpText.toLowerCase().includes('access') && filteredRfpText.toLowerCase().includes('limited')) {
            constraints.push("Site access limited to specified hours to maintain building operations.");
        }
        
        if (constraints.length === 0) {
            constraints.push("Installation scheduling coordinated with facility operations to minimize disruption.");
        }
        
        return {
            designServices,
            constructionLogistics,
            constraints: constraints.join(" "),
            riskFlags: {
                union: risks.hasUnionRequirement,
                outdoor: risks.hasOutdoorRequirement,
                liquidatedDamages: risks.hasLiquidatedDamages,
                performanceBond: risks.hasPerformanceBond,
                hundredPercentBond: risks.has100PercentBond,
                spareParts: risks.hasSpareParts,
                fivePercentSpareParts: risks.has5PercentSpareParts
            },
            financialTriggers: risks.financialTriggers
        };
    }
}

// Export the original SOWGenerator class which will now use RiskAwareSOWGenerator internally
export class SOWGenerator {
    private anythingLLMUrl: string;
    private anythingLLMKey: string;
    
    constructor() {
        this.anythingLLMUrl = ANYTHING_LLM_BASE_URL || "";
        this.anythingLLMKey = ANYTHING_LLM_KEY || "";
    }
    
    /**
     * Detect context flags from RFP text and special requirements
     */
    detectContextFlags(ctx: SOWProjectContext): SOWProjectContext {
        const rfpLower = (ctx.rfpText || "").toLowerCase();
        const reqsLower = ctx.specialRequirements.map(r => r.toLowerCase()).join(" ");
        const combined = `${rfpLower} ${reqsLower}`;
        
        // Union Labor Detection
        if (!ctx.isUnionLabor) {
            ctx.isUnionLabor = combined.includes("union") || 
                              combined.includes("ibew") || 
                              combined.includes("prevailing wage") ||
                              combined.includes("davis-bacon");
        }
        
        // Morgantown / WVU Detection
        if (!ctx.isMorgantown) {
            const loc = (ctx.projectLocation || "").toLowerCase();
            const venue = (ctx.venue || "").toLowerCase();
            ctx.isMorgantown = loc.includes("morgantown") || 
                              loc.includes("wvu") || 
                              venue.includes("puskar") ||
                              venue.includes("coliseum") && venue.includes("wvu");
        }
        
        // Outdoor Detection
        if (ctx.isOutdoor === undefined) {
            ctx.isOutdoor = ctx.displays.some(d => d.type === "Outdoor") ||
                           combined.includes("outdoor") ||
                           combined.includes("ip65") ||
                           combined.includes("weatherproof");
        }
        
        // Performance Bond Detection
        if (!ctx.includePerformanceBond) {
            ctx.includePerformanceBond = combined.includes("performance bond") ||
                                        combined.includes("surety bond");
        }
        
        // Spare Parts Detection
        if (!ctx.includeSpareParts) {
            ctx.includeSpareParts = combined.includes("spare part") ||
                                   combined.includes("attic stock") ||
                                   combined.includes("spare inventory");
        }
        
        // Liquidated Damages Detection (try to extract amount)
        if (!ctx.liquidatedDamagesPerDay) {
            const ldMatch = combined.match(/liquidated damages.*?\$?([\d,]+)/i);
            if (ldMatch) {
                ctx.liquidatedDamagesPerDay = parseInt(ldMatch[1].replace(",", ""));
            }
        }
        
        return ctx;
    }
    
    /**
     * Call AnythingLLM to generate a specific section
     */
    private async callLLM(prompt: string, workspaceSlug?: string): Promise<string> {
        if (!this.anythingLLMUrl || !this.anythingLLMKey) {
            console.warn("[SOWGenerator] AnythingLLM not configured, using fallback");
            return "[AI content generation unavailable - please edit manually]";
        }
        
        try {
            // Use the chat endpoint
            const endpoint = workspaceSlug 
                ? `${this.anythingLLMUrl}/workspace/${workspaceSlug}/chat`
                : `${this.anythingLLMUrl}/chat`;
            
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.anythingLLMKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: prompt,
                    mode: "chat",
                }),
            });
            
            if (!res.ok) {
                throw new Error(`LLM API error: ${res.status}`);
            }
            
            const data = await res.json();
            return data.textResponse || data.response || "[No response from AI]";
        } catch (err) {
            console.error("[SOWGenerator] LLM call failed:", err);
            return "[AI generation failed - please edit manually]";
        }
    }
    
    /**
     * Generate complete SOW with hybrid template + AI approach
     */
    async generateSOW(context: SOWProjectContext, workspaceSlug?: string): Promise<GeneratedSOW> {
        // 1. Detect and enrich context flags
        const enrichedContext = this.detectContextFlags({ ...context });
        
        const sections: SOWSection[] = [];
        
        // 2. FIXED HEADER (Never AI)
        sections.push(FIXED_TEMPLATES.HEADER);
        
        // 3. AI DYNAMIC BLOCK 1: Design Services
        const designPrompt = AI_PROMPTS.DESIGN_SERVICES(enrichedContext);
        const designContent = await this.callLLM(designPrompt, workspaceSlug);
        sections.push({
            id: "design-services-ai",
            title: "1. DESIGN SERVICES",
            content: enrichedContext.customDesignNotes || designContent,
            category: "DESIGN",
            isEditable: true,
            isAIGenerated: !enrichedContext.customDesignNotes,
        });
        
        // 4. WV PE Stamp (if Morgantown)
        if (enrichedContext.isMorgantown) {
            sections.push(CONDITIONAL_CLAUSES.WV_PE_STAMP);
        }
        
        // 5. AI DYNAMIC BLOCK 2: Construction Services
        const constructionPrompt = AI_PROMPTS.CONSTRUCTION_SERVICES(enrichedContext);
        const constructionContent = await this.callLLM(constructionPrompt, workspaceSlug);
        sections.push({
            id: "construction-services-ai",
            title: "2. CONSTRUCTION SERVICES",
            content: enrichedContext.customConstructionNotes || constructionContent,
            category: "CONSTRUCTION",
            isEditable: true,
            isAIGenerated: !enrichedContext.customConstructionNotes,
        });
        
        // 6. CONDITIONAL CLAUSES (Based on detected context)
        if (enrichedContext.isOutdoor) {
            sections.push(CONDITIONAL_CLAUSES.OUTDOOR_IP65);
        }
        
        if (enrichedContext.isUnionLabor) {
            sections.push(CONDITIONAL_CLAUSES.UNION_LABOR);
        }
        
        if (enrichedContext.includeSpareParts) {
            sections.push(CONDITIONAL_CLAUSES.SPARE_PARTS);
        }
        
        if (enrichedContext.includePerformanceBond) {
            sections.push(CONDITIONAL_CLAUSES.PERFORMANCE_BOND);
        }
        
        if (enrichedContext.isMorgantown) {
            sections.push(CONDITIONAL_CLAUSES.MORGANTOWN_TAX);
        }
        
        if (enrichedContext.liquidatedDamagesPerDay) {
            sections.push({
                ...CONDITIONAL_CLAUSES.LIQUIDATED_DAMAGES,
                content: CONDITIONAL_CLAUSES.LIQUIDATED_DAMAGES.content.replace(
                    "[AMOUNT]",
                    enrichedContext.liquidatedDamagesPerDay.toLocaleString()
                ),
            });
        }
        
        // 7. FIXED WARRANTY (Never AI)
        sections.push(FIXED_TEMPLATES.WARRANTY);
        
        // 8. FIXED FOOTER (Never AI)
        sections.push(FIXED_TEMPLATES.SIGNATURE_BLOCK);
        
        return {
            sections,
            metadata: {
                generatedAt: new Date().toISOString(),
                projectContext: {
                    venue: enrichedContext.venue,
                    clientName: enrichedContext.clientName,
                    isUnionLabor: enrichedContext.isUnionLabor,
                    isOutdoor: enrichedContext.isOutdoor,
                    isMorgantown: enrichedContext.isMorgantown,
                },
                aiModel: "AnythingLLM",
            },
        };
    }
    
    /**
     * Generate SOW without AI (template-only fallback)
     */
    generateTemplateOnlySOW(context: SOWProjectContext): GeneratedSOW {
        const enrichedContext = this.detectContextFlags({ ...context });
        const sections: SOWSection[] = [];
        
        // Header
        sections.push(FIXED_TEMPLATES.HEADER);
        
        // Design placeholder
        sections.push({
            id: "design-services-manual",
            title: "1. DESIGN SERVICES",
            content: `ANC will provide complete design-build services for the LED display system at ${enrichedContext.venue}, including:
• Preliminary design and layout drawings
• Structural engineering calculations
• Electrical load analysis
• Shop drawings for approval
• PE-stamped structural drawings for permit submission`,
            category: "DESIGN",
            isEditable: true,
            isAIGenerated: false,
        });
        
        // Construction placeholder
        sections.push({
            id: "construction-services-manual",
            title: "2. CONSTRUCTION SERVICES",
            content: `ANC will provide all labor, materials, and equipment necessary to install the LED display system(s), including:
• Structural steel fabrication and installation
• LED module installation and alignment
• Power distribution and data cabling
• Control system integration
• Testing and commissioning`,
            category: "CONSTRUCTION",
            isEditable: true,
            isAIGenerated: false,
        });
        
        // Conditional clauses
        if (enrichedContext.isOutdoor) sections.push(CONDITIONAL_CLAUSES.OUTDOOR_IP65);
        if (enrichedContext.isUnionLabor) sections.push(CONDITIONAL_CLAUSES.UNION_LABOR);
        if (enrichedContext.includeSpareParts) sections.push(CONDITIONAL_CLAUSES.SPARE_PARTS);
        if (enrichedContext.includePerformanceBond) sections.push(CONDITIONAL_CLAUSES.PERFORMANCE_BOND);
        if (enrichedContext.isMorgantown) {
            sections.push(CONDITIONAL_CLAUSES.WV_PE_STAMP);
            sections.push(CONDITIONAL_CLAUSES.MORGANTOWN_TAX);
        }
        
        // Fixed sections
        sections.push(FIXED_TEMPLATES.WARRANTY);
        sections.push(FIXED_TEMPLATES.SIGNATURE_BLOCK);
        
        return {
            sections,
            metadata: {
                generatedAt: new Date().toISOString(),
                projectContext: {
                    venue: enrichedContext.venue,
                    clientName: enrichedContext.clientName,
                },
            },
        };
    }
}

// Singleton export
export const sowGenerator = new SOWGenerator();
