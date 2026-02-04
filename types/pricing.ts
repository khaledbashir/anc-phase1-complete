/**
 * PricingTable Types - Enterprise-grade data model for Natalia's Mirror Mode
 *
 * This is the SINGLE SOURCE OF TRUTH for all pricing data flowing to PDF templates.
 * Any Excel format (Margin Analysis, Bid Form, etc.) gets normalized to this structure.
 */

export interface PricingLineItem {
  /** Line item description (e.g., "LG Product Cost: Ceiling LED Video Displays") */
  description: string;

  /** Selling price to client (Cost and Margin are NEVER exposed) */
  sellingPrice: number;

  /** If true, show "INCLUDED" badge instead of $0.00 */
  isIncluded: boolean;

  /** Original row index from Excel (for debugging/auditing) */
  sourceRow?: number;
}

export interface AlternateItem {
  /** Alternate description (e.g., "LG Product Cost: Change to 3.91mm Display") */
  description: string;

  /** Price difference - NEGATIVE means savings (e.g., -434677) */
  priceDifference: number;

  /** Original row index from Excel */
  sourceRow?: number;
}

export interface TaxInfo {
  /** Display label (e.g., "Tax 13%", "HST 13%") */
  label: string;

  /** Tax rate as decimal (e.g., 0.13 for 13%) */
  rate: number;

  /** Calculated tax amount */
  amount: number;
}

export interface PricingTable {
  /** Unique identifier for this table */
  id: string;

  /** Table header/location name (e.g., "G9 CEILING LED DISPLAYS") */
  name: string;

  /** Currency code detected from sheet name or content */
  currency: "CAD" | "USD";

  /** All line items in this pricing table */
  items: PricingLineItem[];

  /** Subtotal before tax (sum of all items) */
  subtotal: number;

  /** Tax information (null if no tax row found) */
  tax: TaxInfo | null;

  /** Bond amount (often $0) */
  bond: number;

  /** Grand total including tax and bond */
  grandTotal: number;

  /** Alternate options for this table (rendered separately) */
  alternates: AlternateItem[];

  /** Starting row in Excel (for debugging) */
  sourceStartRow?: number;

  /** Ending row in Excel (for debugging) */
  sourceEndRow?: number;
}

export interface PricingDocument {
  /** All pricing tables extracted from the Excel */
  tables: PricingTable[];

  /** Detected pricing mode */
  mode: "MIRROR" | "CALCULATED";

  /** Source sheet name (e.g., "Margin Analysis (CAD)") */
  sourceSheet: string;

  /** Currency detected from sheet name or content */
  currency: "CAD" | "USD";

  /** Combined grand total across all tables */
  documentTotal: number;

  /** Import metadata */
  metadata: {
    importedAt: string;
    fileName: string;
    tablesCount: number;
    itemsCount: number;
    alternatesCount: number;
  };
}

/**
 * Helper to create a unique table ID
 */
export function createTableId(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `table-${index}-${slug}`;
}

/**
 * Helper to detect currency from sheet name or content
 */
export function detectCurrency(sheetName: string, content?: string): "CAD" | "USD" {
  const text = `${sheetName} ${content || ""}`.toUpperCase();
  if (text.includes("CAD") || text.includes("CANADIAN")) return "CAD";
  if (text.includes("USD") || text.includes("US DOLLAR")) return "USD";
  // Default to USD if not specified
  return "USD";
}

/**
 * Helper to format currency for display
 */
export function formatPricingCurrency(amount: number, currency: "CAD" | "USD"): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = amount < 0 ? "-" : "";
  return `${prefix}$${formatted}`;
}
