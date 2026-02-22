/**
 * Step 6: Rate Card Excel Assembly
 *
 * Combines extracted LED specs + subcontractor quotes + ANC rate card
 * into a final pricing Excel ready for proposal integration.
 *
 * Architecture:
 * - Sheet 1: "Pricing Summary" — one row per display with cost, margin, selling price
 * - Sheet 2: "Cost Breakdown" — detailed line items per display
 * - Sheet 3: "Rate Card" — all rates used for audit trail
 *
 * Uses: ProductMatcher for product matching, rateCardLoader for margins/install rates,
 * productCatalog for hardware cost calculation.
 */

import ExcelJS from "exceljs";
import type { ExtractedLEDSpec, ExtractedProjectInfo } from "@/services/rfp/unified/types";
import type { QuotedSpec } from "./quoteImporter";
import { ProductMatcher, type MatchedSolution } from "@/services/catalog/productMatcher";
import { getFullRateCard, preloadRateCard } from "@/services/rfp/rateCardLoader";
import {
  getProduct,
  getProductByPitch,
  calculateExhibitG,
  calculateHardwareCost,
  estimatePricing,
  getServiceMargin,
  MARGIN_PRESETS,
  BOND_RATE,
  LED_COST_PER_SQFT_BY_PITCH,
  type ZoneClass,
} from "@/services/rfp/productCatalog";

// ─── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  ANC_BLUE: "FF0A52EF",
  DARK_HEADER: "FF1F2937",
  WHITE: "FFFFFFFF",
  LIGHT_GRAY: "FFF8F9FA",
  MEDIUM_GRAY: "FFDEE2E6",
  GREEN_BG: "FFD4EDDA",
  RED_BG: "FFFCE4E4",
  GREEN: "FF28A745",
  AMBER: "FFFFC107",
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PricedDisplay {
  spec: ExtractedLEDSpec;
  quote: QuotedSpec | null;
  match: MatchedSolution | null;
  /** Area in sqft */
  areaSqFt: number;
  /** Hardware cost (from quote or rate card) */
  hardwareCost: number;
  /** Installation cost */
  installCost: number;
  /** PM cost */
  pmCost: number;
  /** Engineering cost */
  engCost: number;
  /** Total cost before margin */
  totalCost: number;
  /** LED hardware margin % */
  ledMarginPct: number;
  /** Services margin % */
  svcMarginPct: number;
  /** Selling price (hardware) */
  hardwareSellingPrice: number;
  /** Selling price (services) */
  servicesSellingPrice: number;
  /** Total selling price */
  totalSellingPrice: number;
  /** Margin dollars */
  marginDollars: number;
  /** Blended margin % */
  blendedMarginPct: number;
  /** Subcontractor lead time */
  leadTimeWeeks: number | null;
  /** Cost source */
  costSource: "subcontractor_quote" | "rate_card" | "product_match";
}

export interface RateCardExcelOptions {
  project: ExtractedProjectInfo;
  specs: ExtractedLEDSpec[];
  quotes: QuotedSpec[];
  /** Override zone classification (default: "standard") */
  zoneClass?: ZoneClass;
  /** Override install complexity */
  installComplexity?: "simple" | "standard" | "complex" | "heavy";
  /** Include bond? */
  includeBond?: boolean;
  /** Currency */
  currency?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function styleHeaderCell(cell: ExcelJS.Cell, bgColor: string = COLORS.DARK_HEADER): void {
  cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: 11, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = { bottom: { style: "thin", color: { argb: "FF999999" } } };
}

function addStripeRow(row: ExcelJS.Row, colCount: number, isEven: boolean): void {
  if (isEven) {
    for (let i = 1; i <= colCount; i++) {
      row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.LIGHT_GRAY } };
    }
  }
}

function styleTotalRow(row: ExcelJS.Row, colCount: number, bgColor: string = COLORS.GREEN_BG): void {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.font = { bold: true, size: 12, name: "Calibri" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    cell.border = {
      top: { style: "medium", color: { argb: COLORS.DARK_HEADER } },
      bottom: { style: "medium", color: { argb: COLORS.DARK_HEADER } },
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const FMT = '"$"#,##0';
const PCT = "0.0%";

// ─── Core: Price Each Display ───────────────────────────────────────────────

async function priceDisplay(
  spec: ExtractedLEDSpec,
  quote: QuotedSpec | null,
  zoneClass: ZoneClass,
  installComplexity: "simple" | "standard" | "complex" | "heavy",
): Promise<PricedDisplay> {
  // Calculate area
  const widthFt = spec.widthFt || 10;
  const heightFt = spec.heightFt || 6;
  const areaSqFt = round2(widthFt * heightFt);
  const areaSqM = areaSqFt / 10.7639;

  // Determine hardware cost
  let hardwareCost = 0;
  let costSource: PricedDisplay["costSource"] = "rate_card";

  if (quote?.costPerSqFt != null) {
    // Priority 1: Subcontractor quote
    hardwareCost = round2(quote.costPerSqFt * areaSqFt * spec.quantity);
    costSource = "subcontractor_quote";
  } else {
    // Priority 2: Rate card by pitch
    const pitchKey = spec.pixelPitchMm != null ? String(spec.pixelPitchMm) : null;
    const ratePerSqFt = pitchKey ? LED_COST_PER_SQFT_BY_PITCH[pitchKey] : null;

    if (ratePerSqFt && ratePerSqFt > 0) {
      hardwareCost = round2(ratePerSqFt * areaSqFt * spec.quantity);
      costSource = "rate_card";
    } else {
      // Priority 3: Product match
      try {
        const match = await ProductMatcher.matchProduct({
          widthFt,
          heightFt,
          pixelPitch: spec.pixelPitchMm ?? undefined,
          isOutdoor: spec.environment === "outdoor",
        });
        // Use matched product's cost if available
        const product = getProductByPitch(
          match.module.pitch,
          spec.environment === "outdoor" ? "Outdoor" : "Indoor",
        );
        if (product) {
          const hwCost = calculateHardwareCost(areaSqM, product.id);
          hardwareCost = hwCost ? round2(hwCost * spec.quantity) : 0;
          costSource = "product_match";
        }
      } catch {
        // No match found — zero cost, will show as "TBD"
      }
    }
  }

  // Try product matching for solution details
  let match: MatchedSolution | null = null;
  try {
    match = await ProductMatcher.matchProduct({
      widthFt,
      heightFt,
      pixelPitch: spec.pixelPitchMm ?? undefined,
      isOutdoor: spec.environment === "outdoor",
    });
  } catch { /* no match */ }

  // Calculate install/services costs using productCatalog's estimatePricing
  const pitchMm = spec.pixelPitchMm || (match?.module?.pitch) || (spec.environment === "outdoor" ? 10 : 3.9);
  const product = getProductByPitch(pitchMm, spec.environment === "outdoor" ? "Outdoor" : "Indoor")
    || getProductByPitch(pitchMm);

  let installCost = 0;
  let pmCost = 0;
  let engCost = 0;

  if (product) {
    const wPx = spec.widthPx || (widthFt * 304.8 / pitchMm);
    const hPx = spec.heightPx || (heightFt * 304.8 / pitchMm);
    const exhibitG = calculateExhibitG(product, Math.round(wPx), Math.round(hPx));
    const pricing = estimatePricing(exhibitG, zoneClass, undefined, { installComplexity });

    installCost = round2(pricing.installCost * spec.quantity);
    pmCost = round2(pricing.pmCost);
    engCost = round2(pricing.engCost);
  } else {
    // Fallback: rough estimate based on weight
    const weightLbs = spec.weightLbs || round2(areaSqFt * 5); // ~5 lbs/sqft fallback
    installCost = round2(weightLbs * 35 * spec.quantity); // $35/lb standard
    pmCost = round2(5882);
    engCost = round2(4706);
  }

  // Margins
  const ledMarginPct = MARGIN_PRESETS.ledHardware; // 30%
  const svcMarginPct = getServiceMargin(areaSqFt); // 20% or 30% for small

  const servicesCost = installCost + pmCost + engCost;
  const totalCost = hardwareCost + servicesCost;

  // Selling prices using Natalia's divisor model
  const hardwareSellingPrice = hardwareCost > 0 ? round2(hardwareCost / (1 - ledMarginPct)) : 0;
  const servicesSellingPrice = servicesCost > 0 ? round2(servicesCost / (1 - svcMarginPct)) : 0;
  const totalSellingPrice = hardwareSellingPrice + servicesSellingPrice;

  const marginDollars = round2(totalSellingPrice - totalCost);
  const blendedMarginPct = totalSellingPrice > 0 ? round2(marginDollars / totalSellingPrice) : 0;

  return {
    spec,
    quote,
    match,
    areaSqFt,
    hardwareCost,
    installCost,
    pmCost,
    engCost,
    totalCost,
    ledMarginPct,
    svcMarginPct,
    hardwareSellingPrice,
    servicesSellingPrice,
    totalSellingPrice,
    marginDollars,
    blendedMarginPct,
    leadTimeWeeks: quote?.leadTimeWeeks ?? null,
    costSource,
  };
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export async function generateRateCardExcel(
  options: RateCardExcelOptions,
): Promise<{ buffer: Buffer; pricedDisplays: PricedDisplay[] }> {
  const {
    project,
    specs,
    quotes,
    zoneClass = "standard",
    installComplexity = "standard",
    includeBond = false,
    currency = "USD",
  } = options;

  // Preload rate card cache
  await preloadRateCard();

  const projectName = project.projectName || project.venue || "Untitled Project";

  // Price all displays
  const pricedDisplays: PricedDisplay[] = [];
  for (const spec of specs) {
    const quote = quotes.find((q) => q.displayName === spec.name && q.hasQuote) || null;
    const priced = await priceDisplay(spec, quote, zoneClass, installComplexity);
    pricedDisplays.push(priced);
  }

  // Build workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ANC Proposal Engine";
  workbook.created = new Date();

  // ━━━ SHEET 1: Pricing Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const summary = workbook.addWorksheet("Pricing Summary", {
    properties: { tabColor: { argb: COLORS.ANC_BLUE } },
  });

  // Title
  summary.mergeCells("A1:L1");
  const titleCell = summary.getCell("A1");
  titleCell.value = `${projectName} — Rate Card Pricing`;
  titleCell.font = { size: 16, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ANC_BLUE } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  summary.getRow(1).height = 36;

  // Meta
  summary.mergeCells("A2:L2");
  const parts = [];
  if (project.clientName) parts.push(`Client: ${project.clientName}`);
  if (project.venue) parts.push(`Venue: ${project.venue}`);
  parts.push(`Zone: ${zoneClass}`);
  parts.push(`Date: ${new Date().toLocaleDateString()}`);
  summary.getCell("A2").value = parts.join("  |  ");
  summary.getCell("A2").font = { size: 10, italic: true, color: { argb: "FF666666" }, name: "Calibri" };
  summary.getCell("A2").alignment = { horizontal: "center" };

  // Column widths
  const sumColWidths = [28, 10, 10, 10, 14, 14, 14, 14, 14, 14, 10, 14];
  sumColWidths.forEach((w, i) => { summary.getColumn(i + 1).width = w; });

  // Headers
  const sumHeaders = [
    "Display", "Pitch", "Area (sqft)", "Qty",
    "Hardware Cost", "Install Cost", "Total Cost",
    "Hardware Sell", "Services Sell", "Total Sell",
    "Margin %", "Cost Source",
  ];

  let row = 4;
  sumHeaders.forEach((h, i) => {
    const cell = summary.getCell(row, i + 1);
    cell.value = h;
    styleHeaderCell(cell, COLORS.ANC_BLUE);
  });
  summary.getRow(row).height = 28;
  row++;

  // Data rows
  let totalHardwareCost = 0;
  let totalInstallCost = 0;
  let totalCost = 0;
  let totalHardwareSell = 0;
  let totalServicesSell = 0;
  let totalSell = 0;

  pricedDisplays.forEach((pd, idx) => {
    const r = summary.getRow(row);
    r.getCell(1).value = pd.spec.name;
    r.getCell(1).font = { bold: true, name: "Calibri" };
    r.getCell(2).value = pd.spec.pixelPitchMm != null ? `${pd.spec.pixelPitchMm}mm` : "—";
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(3).value = pd.areaSqFt;
    r.getCell(3).numFmt = "#,##0";
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(4).value = pd.spec.quantity;
    r.getCell(4).alignment = { horizontal: "center" };
    r.getCell(5).value = pd.hardwareCost;
    r.getCell(5).numFmt = FMT;
    r.getCell(6).value = pd.installCost + pd.pmCost + pd.engCost;
    r.getCell(6).numFmt = FMT;
    r.getCell(7).value = pd.totalCost;
    r.getCell(7).numFmt = FMT;
    r.getCell(8).value = pd.hardwareSellingPrice;
    r.getCell(8).numFmt = FMT;
    r.getCell(9).value = pd.servicesSellingPrice;
    r.getCell(9).numFmt = FMT;
    r.getCell(10).value = pd.totalSellingPrice;
    r.getCell(10).numFmt = FMT;
    r.getCell(11).value = pd.blendedMarginPct;
    r.getCell(11).numFmt = PCT;
    r.getCell(11).alignment = { horizontal: "center" };

    const sourceLabel = pd.costSource === "subcontractor_quote" ? "Quote"
      : pd.costSource === "rate_card" ? "Rate Card"
      : "Product Match";
    r.getCell(12).value = sourceLabel;
    r.getCell(12).alignment = { horizontal: "center" };

    // Color code cost source
    if (pd.costSource === "subcontractor_quote") {
      r.getCell(12).font = { color: { argb: COLORS.GREEN }, bold: true, name: "Calibri" };
    }

    addStripeRow(r, 12, idx % 2 === 0);

    totalHardwareCost += pd.hardwareCost;
    totalInstallCost += (pd.installCost + pd.pmCost + pd.engCost);
    totalCost += pd.totalCost;
    totalHardwareSell += pd.hardwareSellingPrice;
    totalServicesSell += pd.servicesSellingPrice;
    totalSell += pd.totalSellingPrice;
    row++;
  });

  // Totals
  row++;
  const totRow = summary.getRow(row);
  totRow.getCell(1).value = "SUBTOTAL";
  totRow.getCell(5).value = totalHardwareCost;
  totRow.getCell(5).numFmt = FMT;
  totRow.getCell(6).value = totalInstallCost;
  totRow.getCell(6).numFmt = FMT;
  totRow.getCell(7).value = totalCost;
  totRow.getCell(7).numFmt = FMT;
  totRow.getCell(8).value = totalHardwareSell;
  totRow.getCell(8).numFmt = FMT;
  totRow.getCell(9).value = totalServicesSell;
  totRow.getCell(9).numFmt = FMT;
  totRow.getCell(10).value = totalSell;
  totRow.getCell(10).numFmt = FMT;
  totRow.getCell(11).value = totalSell > 0 ? round2((totalSell - totalCost) / totalSell) : 0;
  totRow.getCell(11).numFmt = PCT;
  styleTotalRow(totRow, 12, COLORS.MEDIUM_GRAY);
  row++;

  // Bond row (optional)
  if (includeBond) {
    const bondRow = summary.getRow(row);
    bondRow.getCell(1).value = `Performance Bond (${(BOND_RATE * 100).toFixed(1)}%)`;
    bondRow.getCell(10).value = round2(totalSell * BOND_RATE);
    bondRow.getCell(10).numFmt = FMT;
    row++;
  }

  // Grand total
  row++;
  const grandRow = summary.getRow(row);
  const grandTotal = totalSell + (includeBond ? round2(totalSell * BOND_RATE) : 0);
  grandRow.getCell(1).value = "GRAND TOTAL";
  grandRow.getCell(10).value = grandTotal;
  grandRow.getCell(10).numFmt = FMT;
  grandRow.getCell(11).value = totalSell > 0 ? round2((totalSell - totalCost) / totalSell) : 0;
  grandRow.getCell(11).numFmt = PCT;
  grandRow.height = 28;
  for (let i = 1; i <= 12; i++) {
    const cell = grandRow.getCell(i);
    cell.font = { bold: true, size: 14, color: { argb: COLORS.WHITE }, name: "Calibri" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ANC_BLUE } };
  }

  // ━━━ SHEET 2: Cost Breakdown ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const breakdown = workbook.addWorksheet("Cost Breakdown", {
    properties: { tabColor: { argb: COLORS.GREEN } },
  });

  breakdown.mergeCells("A1:H1");
  const bdTitle = breakdown.getCell("A1");
  bdTitle.value = `${projectName} — Detailed Cost Breakdown`;
  bdTitle.font = { size: 14, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  bdTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ANC_BLUE } };
  bdTitle.alignment = { horizontal: "center", vertical: "middle" };
  breakdown.getRow(1).height = 32;

  const bdColWidths = [28, 14, 14, 14, 14, 14, 10, 16];
  bdColWidths.forEach((w, i) => { breakdown.getColumn(i + 1).width = w; });

  const bdHeaders = ["Display", "Hardware", "Steel/Install", "PM/GC", "Engineering", "Total Cost", "Margin", "Selling Price"];
  let bdRow = 3;
  bdHeaders.forEach((h, i) => {
    const cell = breakdown.getCell(bdRow, i + 1);
    cell.value = h;
    styleHeaderCell(cell, COLORS.DARK_HEADER);
  });
  bdRow++;

  pricedDisplays.forEach((pd, idx) => {
    const r = breakdown.getRow(bdRow);
    r.getCell(1).value = pd.spec.name;
    r.getCell(1).font = { bold: true, name: "Calibri" };
    r.getCell(2).value = pd.hardwareCost;
    r.getCell(2).numFmt = FMT;
    r.getCell(3).value = pd.installCost;
    r.getCell(3).numFmt = FMT;
    r.getCell(4).value = pd.pmCost;
    r.getCell(4).numFmt = FMT;
    r.getCell(5).value = pd.engCost;
    r.getCell(5).numFmt = FMT;
    r.getCell(6).value = pd.totalCost;
    r.getCell(6).numFmt = FMT;
    r.getCell(7).value = pd.blendedMarginPct;
    r.getCell(7).numFmt = PCT;
    r.getCell(7).alignment = { horizontal: "center" };
    r.getCell(8).value = pd.totalSellingPrice;
    r.getCell(8).numFmt = FMT;

    addStripeRow(r, 8, idx % 2 === 0);
    bdRow++;
  });

  // ━━━ SHEET 3: Rate Card Audit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const rateSheet = workbook.addWorksheet("Rate Card", {
    properties: { tabColor: { argb: "FFFFC107" } },
  });

  rateSheet.mergeCells("A1:D1");
  const rcTitle = rateSheet.getCell("A1");
  rcTitle.value = "ANC Rate Card — Rates Used";
  rcTitle.font = { size: 14, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  rcTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ANC_BLUE } };
  rcTitle.alignment = { horizontal: "center", vertical: "middle" };
  rateSheet.getRow(1).height = 32;

  rateSheet.getColumn(1).width = 30;
  rateSheet.getColumn(2).width = 36;
  rateSheet.getColumn(3).width = 16;
  rateSheet.getColumn(4).width = 16;

  const rcHeaders = ["Category", "Rate Key", "Value", "Unit"];
  rcHeaders.forEach((h, i) => {
    const cell = rateSheet.getCell(3, i + 1);
    cell.value = h;
    styleHeaderCell(cell, COLORS.DARK_HEADER);
  });

  const fullRateCard = await getFullRateCard();
  let rcRow = 4;

  // Group by category
  const grouped: Record<string, Array<{ key: string; value: number }>> = {};
  for (const [key, value] of Object.entries(fullRateCard)) {
    const category = key.split(".")[0];
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ key, value });
  }

  for (const [category, rates] of Object.entries(grouped)) {
    rates.forEach((rate, idx) => {
      const r = rateSheet.getRow(rcRow);
      r.getCell(1).value = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      r.getCell(2).value = rate.key;
      r.getCell(2).font = { name: "Consolas", size: 10 };
      r.getCell(3).value = rate.value;

      // Format based on key
      if (rate.key.includes("pct") || rate.key.includes("margin") || rate.key.includes("bond") ||
          rate.key.includes("tax") || rate.key.includes("escalation") || rate.key.includes("spare") ||
          rate.key.includes("modifier")) {
        r.getCell(3).numFmt = "0.0%";
        r.getCell(4).value = "percent";
      } else {
        r.getCell(3).numFmt = FMT;
        r.getCell(4).value = rate.key.includes("sqft") ? "$/sqft" : rate.key.includes("fee") ? "fixed $" : "$/lb";
      }

      addStripeRow(r, 4, idx % 2 === 0);
      rcRow++;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: buffer as unknown as Buffer,
    pricedDisplays,
  };
}

export type { PricedDisplay as PricedDisplayExport };
