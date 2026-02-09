/**
 * SOW Template System — P60
 *
 * 8 toggleable sections for Exhibit B (Scope of Work).
 * Each section has default content that can be customized.
 * Users toggle sections on/off in the UI; only enabled sections appear in the PDF.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SOWTemplateSection {
    id: string;
    title: string;
    defaultContent: string;
    category: "design" | "construction" | "compliance" | "logistics" | "warranty";
    order: number;
    alwaysInclude?: boolean; // Cannot be toggled off
}

export interface SOWConfig {
    enabledSections: string[]; // IDs of enabled sections
    overrides: Record<string, string>; // sectionId → custom content
}

// ============================================================================
// DEFAULT SECTIONS (8 toggleable)
// ============================================================================

export const SOW_TEMPLATE_SECTIONS: SOWTemplateSection[] = [
    {
        id: "design-engineering",
        title: "Design & Engineering",
        defaultContent: `ANC will provide complete design and engineering services including:
• Structural analysis and PE-stamped drawings
• Electrical load calculations and panel schedules
• Display layout and pixel mapping
• Integration with existing building management systems
• Shop drawings for client approval prior to fabrication`,
        category: "design",
        order: 1,
    },
    {
        id: "manufacturing-procurement",
        title: "Manufacturing & Procurement",
        defaultContent: `ANC will procure and manage manufacturing of all display components:
• LED modules from specified manufacturer
• Steel structure and mounting hardware
• Power distribution and data infrastructure
• Control systems and media players
• All components are new, first-quality, and carry full manufacturer warranty`,
        category: "construction",
        order: 2,
    },
    {
        id: "shipping-logistics",
        title: "Shipping & Logistics",
        defaultContent: `ANC will coordinate all shipping and logistics:
• Factory-to-site freight with full insurance coverage
• Customs clearance and documentation (if applicable)
• On-site receiving coordination with client facilities team
• Secure staging area requirements to be confirmed with client
• Delivery schedule aligned with installation timeline`,
        category: "logistics",
        order: 3,
    },
    {
        id: "installation",
        title: "Installation & Construction",
        defaultContent: `ANC will perform complete installation including:
• Structural steel fabrication and installation
• LED module mounting and alignment
• Electrical connections and power distribution
• Data cabling and network infrastructure
• System commissioning and pixel calibration
• All work performed by certified ANC installation crews`,
        category: "construction",
        order: 4,
    },
    {
        id: "testing-commissioning",
        title: "Testing & Commissioning",
        defaultContent: `Upon completion of installation, ANC will perform:
• Full system power-on and burn-in testing (minimum 72 hours)
• Pixel-level calibration for uniform brightness and color
• Content playback verification across all display zones
• Integration testing with client's content management system
• Client walkthrough and acceptance sign-off`,
        category: "construction",
        order: 5,
    },
    {
        id: "training",
        title: "Training & Documentation",
        defaultContent: `ANC will provide comprehensive training and documentation:
• On-site operator training (minimum 4 hours)
• System administration training for IT staff
• Complete as-built documentation package
• Operation and maintenance manuals
• Emergency contact procedures and escalation matrix`,
        category: "logistics",
        order: 6,
    },
    {
        id: "warranty-support",
        title: "Warranty & Support",
        defaultContent: `ANC provides industry-leading warranty coverage:
• 10-year LED module warranty against defects
• 2-year electronics and control system warranty
• 24/7 remote monitoring and diagnostics
• 4-hour remote response time for critical issues
• Annual preventive maintenance visit (Year 1 included)`,
        category: "warranty",
        order: 7,
    },
    {
        id: "project-management",
        title: "Project Management",
        defaultContent: `ANC will assign a dedicated Project Manager responsible for:
• Single point of contact for all project communications
• Weekly progress reports and schedule updates
• Coordination with client's general contractor (if applicable)
• Change order management and documentation
• Final closeout documentation and warranty registration`,
        category: "logistics",
        order: 8,
    },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the default SOW config with all sections enabled.
 */
export function getDefaultSOWConfig(): SOWConfig {
    return {
        enabledSections: SOW_TEMPLATE_SECTIONS.map((s) => s.id),
        overrides: {},
    };
}

/**
 * Build the final SOW content from config.
 * Returns only enabled sections with any custom overrides applied.
 */
export function buildSOWContent(config: SOWConfig): Array<{ id: string; title: string; content: string; order: number }> {
    return SOW_TEMPLATE_SECTIONS
        .filter((s) => s.alwaysInclude || config.enabledSections.includes(s.id))
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
            id: s.id,
            title: s.title,
            content: config.overrides[s.id] || s.defaultContent,
            order: s.order,
        }));
}

/**
 * Get a single section by ID.
 */
export function getSOWSection(id: string): SOWTemplateSection | undefined {
    return SOW_TEMPLATE_SECTIONS.find((s) => s.id === id);
}
