export const PDF_COLORS = {
    // Indiana Fever Colors (and ANC Brand)
    FRENCH_BLUE: "#0A52EF", // ANC/Enterprise Blue
    INDIANA_BLUE: "#003366", // Deep Navy (Fever)
    INDIANA_RED: "#C8102E",  // Fever Red
    INDIANA_YELLOW: "#FFCD00", // Fever Yellow

    // UI Neutrals
    TABLE_HEADER_BG: "#E5E7EB", // Gray-200 for zebra headers
    BORDER_GRAY: "#D1D5DB",     // Gray-300
    TEXT_DARK: "#111827",       // Gray-900
    TEXT_LIGHT: "#6B7280",      // Gray-500
};

export const PDF_STYLES = {
    // Typography
    Heading1: "text-2xl font-bold uppercase tracking-tight",
    Heading2: "text-lg font-bold uppercase tracking-wide",
    Body: "text-xs font-normal",

    // Table Styles
    Table: "w-full text-xs border-collapse",
    TableHeaderCell: `bg-[${PDF_COLORS.TABLE_HEADER_BG}] p-2 font-bold text-left uppercase text-gray-700 border-b border-gray-300`,
    TableCell: "p-2 border-b border-gray-100 text-gray-800",

    // Layout
    PageBreak: "break-before-page",
    AvoidBreak: "break-inside-avoid",
};
