/**
 * SOW (Statement of Work) Template - Page 7
 * REQ-123: Bespoke SOW Generation based on RFP analysis
 * 
 * Standard legal language for ANC proposals.
 * Based on Standard Enterprise Gold Standard document.
 */

// Document Header Types (LOI, Hard Quote, Budget)
export const DOCUMENT_HEADERS = {
    LOI: {
        title: "LETTER OF INTENT",
        subtitle: "Non-Binding Preliminary Estimate",
        disclaimer: "This Letter of Intent represents a preliminary, non-binding estimate for budgetary purposes only. Final pricing will be provided upon receipt of complete project specifications."
    },
    HARD_QUOTE: {
        title: "SALES QUOTATION",
        subtitle: "Firm Fixed Price Proposal",
        disclaimer: "This quotation represents a firm fixed price valid for 30 days from the date of issue. Pricing is subject to change after the validity period."
    },
    BUDGET: {
        title: "BUDGET ESTIMATE",
        subtitle: "ROM (Rough Order of Magnitude)",
        disclaimer: "This Budget Estimate is provided for planning purposes and represents a ROM (±15%) based on preliminary specifications. Final pricing requires complete design documentation."
    }
};

// Environment-Specific Sections (Indoor vs Outdoor)
export const ENVIRONMENT_SECTIONS = {
    INDOOR: {
        title: "Indoor Display Environment",
        content: `Indoor Installation Requirements:
• Climate-controlled environment (65-80°F, <80% humidity)
• Minimum 500 lux ambient lighting compensation
• Fire suppression system compatibility verification
• ADA compliance for viewing distances
• Acoustic considerations for fan noise (<35dB at 10ft)

ANC indoor displays are optimized for controlled environments with typical brightness of 800-1500 nits.`
    },
    OUTDOOR: {
        title: "Outdoor Display Environment", 
        content: `Outdoor Installation Requirements:
• IP65 or higher weatherproofing rating
• Operating temperature range: -22°F to 122°F (-30°C to 50°C)
• Direct sunlight compensation (minimum 5,000 nits brightness)
• Wind load engineering per local building codes
• Lightning protection and surge suppression
• UV-resistant front service access

ANC outdoor displays include integrated HVAC and are designed for 24/7 operation in extreme conditions.`
    }
};

export const SOW_SECTIONS = {
    physicalInstallation: {
        title: "Physical Installation",
        content: `ANC will provide all labor and materials necessary to install the LED display system(s) in accordance with manufacturer specifications and applicable building codes. Installation includes:
• Mounting hardware and structural brackets
• LED modules and cabinets
• Power distribution units (PDUs)
• Data cabling and signal distribution
• Control system hardware

All installation work will be performed by trained ANC technicians or authorized contractors.`
    },

    electricalData: {
        title: "Electrical & Data",
        content: `Client is responsible for providing:
• Dedicated electrical circuits to display locations (specifications TBD based on final design)
• Network connectivity to control room location
• Climate-controlled environment meeting manufacturer specifications

ANC will provide:
• All internal power distribution within the display system
• Data network switches and distribution as required
• Integration with client's existing control infrastructure`
    },

    controlSystem: {
        title: "Control System",
        content: `ANC will provide a complete content management and display control system including:
• Content Management Software (CMS) license
• Display control processor(s)
• Remote monitoring and diagnostics capability
• Initial content templates and configuration
• Operator training (up to 8 hours on-site)

Annual software maintenance and support is included for the first year. Subsequent years are available under separate maintenance agreement.`
    },

    generalConditions: {
        title: "General Conditions",
        content: `Standard Terms:
• Payment terms: Net 30 from proposal date
• Lead time: 12-16 weeks from deposit receipt (subject to manufacturing capacity)
• Warranty: 5-year manufacturer warranty on LED modules; 2-year warranty on electronics
• All prices quoted in USD

Exclusions (unless specifically noted above):
• Permits and inspections
• Structural modifications to building
• Electrical service upgrades
• Scenic/decorative finishes around display
• Content creation beyond initial templates`
    },

    // Dynamic clauses based on AI detection
    unionLaborClause: `Union Labor Surcharge: Where required by local jurisdiction or client specification, installation will be performed by IBEW-certified union labor in accordance with applicable collective bargaining agreements. A 15% surcharge applies to all labor costs to cover union wages, benefits, and certified payroll requirements.`,

    replacementClause: `Replacement Equipment: This proposal includes removal and disposal of existing display equipment. Disposal will be performed in accordance with applicable environmental regulations. Client is responsible for providing access and any required permits for removal operations.`,

    prevailingWageClause: `Prevailing Wage: Installation labor rates are based on applicable prevailing wage requirements for the project jurisdiction as published by the Department of Labor. Certified payroll documentation will be provided upon request.`,
    
    sparePartsClause: `Spare Parts Inventory: Per RFP requirements, this proposal includes a minimum 5% spare parts inventory (attic stock) for LED modules and critical components. Spare parts will be delivered with the main shipment and stored on-site per client direction.`,
    
    performanceBondClause: `Performance Bond: A 1.5% Performance Bond is included in this proposal as required by the RFP. Bond documentation will be provided upon contract execution.`,
    
    structuralEngineeringClause: `Structural Engineering: This proposal includes structural engineering services by a licensed Professional Engineer (PE). Structural calculations and stamped drawings will be provided for permit submission. Steel tonnage estimates are based on preliminary analysis and subject to final engineering.`,
};

export interface SOWOptions {
    // Document type (determines header)
    documentType?: "LOI" | "HARD_QUOTE" | "BUDGET";
    pricingRound?: "First Round" | "Final" | "Revision";
    
    // Environment (Indoor vs Outdoor)
    environment?: "INDOOR" | "OUTDOOR" | "MIXED";
    
    // AI-detected requirements from RFP
    includeUnionLabor?: boolean;
    includeReplacement?: boolean;
    includePrevailingWage?: boolean;
    includeSpareParts?: boolean;
    includePerformanceBond?: boolean;
    includeStructuralEngineering?: boolean;
    
    // Custom content
    customExclusions?: string[];
    customInclusions?: string[];
    projectSpecificNotes?: string;
    
    // Client/Project info for personalization
    clientName?: string;
    venueName?: string;
    projectLocation?: string;
}

/**
 * Get document header based on type
 */
export function getDocumentHeader(type: "LOI" | "HARD_QUOTE" | "BUDGET" = "BUDGET"): {
    title: string;
    subtitle: string;
    disclaimer: string;
} {
    return DOCUMENT_HEADERS[type] || DOCUMENT_HEADERS.BUDGET;
}

/**
 * REQ-123: Generate bespoke SOW based on RFP analysis and AI detection
 * 
 * Customizes the Statement of Work based on:
 * - Document type (LOI, Hard Quote, Budget)
 * - Environment (Indoor vs Outdoor)
 * - AI-detected requirements (Union Labor, Spare Parts, etc.)
 */
export function generateSOWContent(options: SOWOptions | string = {}): { title: string, content: string }[] {
    const sections: { title: string, content: string }[] = [];
    const opts = typeof options === 'string' ? { projectSpecificNotes: options } : options;

    // 1. Add environment-specific section FIRST (Indoor vs Outdoor)
    if (opts.environment === "OUTDOOR") {
        sections.push(ENVIRONMENT_SECTIONS.OUTDOOR);
    } else if (opts.environment === "INDOOR") {
        sections.push(ENVIRONMENT_SECTIONS.INDOOR);
    } else if (opts.environment === "MIXED") {
        sections.push({
            title: "Mixed Environment Installation",
            content: `This project includes both indoor and outdoor display installations. Each display type will be specified with appropriate environmental ratings:\n\n` +
                ENVIRONMENT_SECTIONS.INDOOR.content + `\n\n` + ENVIRONMENT_SECTIONS.OUTDOOR.content
        });
    }

    // 2. Add standard sections
    sections.push({
        title: SOW_SECTIONS.physicalInstallation.title,
        content: SOW_SECTIONS.physicalInstallation.content
    });
    
    sections.push({
        title: SOW_SECTIONS.electricalData.title,
        content: SOW_SECTIONS.electricalData.content
    });
    
    sections.push({
        title: SOW_SECTIONS.controlSystem.title,
        content: SOW_SECTIONS.controlSystem.content
    });

    // 3. Add AI-detected dynamic clauses based on RFP analysis
    if (opts.includeUnionLabor) {
        sections.push({
            title: "Union Labor Requirements",
            content: SOW_SECTIONS.unionLaborClause
        });
    }

    if (opts.includePrevailingWage) {
        sections.push({
            title: "Prevailing Wage Compliance",
            content: SOW_SECTIONS.prevailingWageClause
        });
    }

    if (opts.includeReplacement) {
        sections.push({
            title: "Equipment Replacement & Disposal",
            content: SOW_SECTIONS.replacementClause
        });
    }

    if (opts.includeSpareParts) {
        sections.push({
            title: "Spare Parts Inventory (5% Attic Stock)",
            content: SOW_SECTIONS.sparePartsClause
        });
    }

    if (opts.includePerformanceBond) {
        sections.push({
            title: "Performance Bond (1.5%)",
            content: SOW_SECTIONS.performanceBondClause
        });
    }

    if (opts.includeStructuralEngineering) {
        sections.push({
            title: "Structural Engineering Services",
            content: SOW_SECTIONS.structuralEngineeringClause
        });
    }

    // 4. Add custom inclusions
    if (opts.customInclusions?.length) {
        sections.push({
            title: "Additional Inclusions",
            content: opts.customInclusions.map(i => `• ${i}`).join("\n")
        });
    }

    // 5. Add General Conditions (always last before exclusions)
    sections.push({
        title: SOW_SECTIONS.generalConditions.title,
        content: SOW_SECTIONS.generalConditions.content
    });

    // 6. Add custom exclusions
    if (opts.customExclusions?.length) {
        sections.push({
            title: "Additional Exclusions",
            content: opts.customExclusions.map(e => `• ${e}`).join("\n")
        });
    }

    // 7. Add project-specific notes
    if (opts.projectSpecificNotes && opts.projectSpecificNotes.length > 0) {
        sections.push({
            title: "Project-Specific Notes",
            content: opts.projectSpecificNotes
        });
    }

    return sections;
}

/**
 * Generate complete SOW with header for PDF
 */
export function generateFullSOW(options: SOWOptions): {
    header: { title: string; subtitle: string; disclaimer: string };
    sections: { title: string; content: string }[];
} {
    const docType = options.documentType || "BUDGET";
    return {
        header: getDocumentHeader(docType),
        sections: generateSOWContent(options)
    };
}

export default SOW_SECTIONS;
