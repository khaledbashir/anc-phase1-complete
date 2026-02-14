/**
 * Shared types and constants for PDF template sub-components.
 * Every section receives a subset of these via props.
 */

export interface PdfColors {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    text: string;
    textMuted: string;
    textLight: string;
    white: string;
    surface: string;
    border: string;
    borderLight: string;
}

export interface PdfTemplateSpacing {
    contentPaddingX: number;
    headerToIntroGap: number;
    introToBodyGap: number;
    sectionSpacing: number;
    pricingTableGap: number;
    tableRowHeight: number;
    rowPaddingY: number;
}

export const DEFAULT_SIGNATURE_BLOCK_TEXT = "This agreement constitutes the entire understanding between the parties and supersedes all prior agreements. Any modifications must be in writing and signed by both parties.";
