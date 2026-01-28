/**
 * SOW (Statement of Work) Template - Page 7
 * 
 * Standard legal language for ANC proposals.
 * Based on Standard Enterprise Gold Standard document.
 */

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
    unionLaborClause: `Union Labor Surcharge: Where required by local jurisdiction or client specification, installation will be performed by union labor. A 15% surcharge applies to all labor costs.`,

    replacementClause: `Replacement Equipment: This proposal includes removal and disposal of existing display equipment. Disposal will be performed in accordance with applicable environmental regulations.`,

    prevailingWageClause: `Prevailing Wage: Installation labor rates are based on applicable prevailing wage requirements for the project jurisdiction.`,
};

export interface SOWOptions {
    includeUnionLabor?: boolean;
    includeReplacement?: boolean;
    includePrevailingWage?: boolean;
    customExclusions?: string[];
}

/**
 * Generate the full SOW text with dynamic clauses
 */
export function generateSOWContent(options: SOWOptions = {}): string {
    let content = "";

    // Add standard sections
    Object.entries(SOW_SECTIONS).forEach(([key, section]) => {
        if (typeof section === "object" && "title" in section) {
            content += `\n**${section.title}**\n${section.content}\n`;
        }
    });

    // Add dynamic clauses based on AI detection
    if (options.includeUnionLabor) {
        content += `\n**Union Labor Requirements**\n${SOW_SECTIONS.unionLaborClause}\n`;
    }

    if (options.includeReplacement) {
        content += `\n**Equipment Replacement**\n${SOW_SECTIONS.replacementClause}\n`;
    }

    if (options.includePrevailingWage) {
        content += `\n**Prevailing Wage**\n${SOW_SECTIONS.prevailingWageClause}\n`;
    }

    if (options.customExclusions?.length) {
        content += `\n**Additional Exclusions**\n${options.customExclusions.map(e => `• ${e}`).join("\n")}\n`;
    }

    return content;
}

export default SOW_SECTIONS;
