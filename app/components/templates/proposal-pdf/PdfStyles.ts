export const PDF_COLORS = {
    // Brand Colors (ANC Standard)
    FRENCH_BLUE: "#0A52EF", // ANC/Enterprise Blue
    ACCENT_RED: "#C8102E",  // Brand Red
    ACCENT_YELLOW: "#FFCD00", // Brand Yellow
    BLUE_OPAL: "#002C73",   // ANC Blue Opal Navy

    // UI Neutrals
    TABLE_HEADER_BG: "#E5E7EB", // Gray-200 for zebra headers
    BORDER_GRAY: "#D1D5DB",     // Gray-300
    TEXT_DARK: "#111827",       // Gray-900
    TEXT_LIGHT: "#6B7280",      // Gray-500
};

// Hybrid Theme - Combines Modern base + Bold accents + Classic typography
export const HYBRID_THEME = {
    colors: {
        primary: "#0A52EF",
        primaryDark: "#002C73",
        primaryLight: "#E8F0FE",
        accent: "#6366F1",
        text: "#1F2937",
        textMuted: "#6B7280",
        textLight: "#9CA3AF",
        white: "#FFFFFF",
        surface: "#F9FAFB",
        border: "#E5E7EB",
        borderLight: "#F3F4F6",
    },
    typography: {
        // Tightened typography for density
        h1: "text-xl font-bold tracking-tight",           // Page title
        h2: "text-base font-bold tracking-wide uppercase", // Section headers
        h3: "text-xs font-bold uppercase tracking-wide",   // Table headers
        body: "text-sm leading-relaxed",                   // Body text (10pt)
        bodySmall: "text-xs",                              // Small text (9pt)
        specs: "text-xs leading-tight",                    // Specs under pricing
    },
    spacing: {
        section: "mt-8",        // Section margin
        subsection: "mt-6",     // Subsection margin
        row: "py-2",            // Table row padding (tight)
        cell: "px-4 py-2",      // Table cell padding
        compact: "py-1.5",      // Extra tight padding
    },
    tables: {
        header: "bg-[#0A52EF] text-white font-bold text-xs uppercase tracking-wider",
        rowEven: "bg-white",
        rowOdd: "bg-[#F9FAFB]",
        cell: "text-xs",
        border: "border-b border-[#E5E7EB]",
    },
};

export const PDF_STYLES = {
    // Typography
    Heading1: "text-2xl font-bold tracking-tight",
    Heading2: "text-lg font-bold tracking-wide",
    Body: "text-xs font-normal",

    // Table Styles
    Table: "w-full text-xs border-collapse",
    TableHeaderCell: `bg-[${PDF_COLORS.TABLE_HEADER_BG}] p-2 font-bold text-left text-gray-700 border-b border-gray-300`,
    TableCell: "p-2 border-b border-gray-100 text-gray-800",

    // Layout
    PageBreak: "break-before-page",
    AvoidBreak: "break-inside-avoid",
};
