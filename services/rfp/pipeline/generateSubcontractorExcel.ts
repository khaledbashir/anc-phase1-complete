/**
 * Step 4: Subcontractor Excel Generator
 *
 * Takes extracted LED specs from RFP analysis and generates a clean Excel
 * spreadsheet to send to subcontractors (LG, Yaham) for quoting.
 *
 * Includes: display name, dimensions, pixel pitch, resolution, environment,
 * quantity, mounting type, special requirements. Subcontractor fills in
 * unit cost, lead time, and notes columns.
 */

import ExcelJS from "exceljs";
import type { ExtractedLEDSpec, ExtractedProjectInfo } from "@/services/rfp/unified/types";

// ─── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  ANC_BLUE: "FF0A52EF",
  DARK_HEADER: "FF1F2937",
  WHITE: "FFFFFFFF",
  LIGHT_GRAY: "FFF8F9FA",
  MEDIUM_GRAY: "FFDEE2E6",
  LIGHT_BLUE: "FFEEF4FF",
  AMBER_BG: "FFFFF8E1",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function styleHeaderCell(cell: ExcelJS.Cell, bgColor: string = COLORS.DARK_HEADER): void {
  cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: 11, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = {
    bottom: { style: "thin", color: { argb: "FF999999" } },
  };
}

function addStripeRow(row: ExcelJS.Row, colCount: number, isEven: boolean): void {
  if (isEven) {
    for (let i = 1; i <= colCount; i++) {
      row.getCell(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.LIGHT_GRAY },
      };
    }
  }
}

function styleInputCell(cell: ExcelJS.Cell): void {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.AMBER_BG } };
  cell.border = {
    top: { style: "thin", color: { argb: "FFCCCCCC" } },
    bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    left: { style: "thin", color: { argb: "FFCCCCCC" } },
    right: { style: "thin", color: { argb: "FFCCCCCC" } },
  };
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export interface SubcontractorExcelOptions {
  project: ExtractedProjectInfo;
  specs: ExtractedLEDSpec[];
  requestedBy?: string;
  dueDate?: string;
  notes?: string;
}

export async function generateSubcontractorExcel(
  options: SubcontractorExcelOptions,
): Promise<Buffer> {
  const { project, specs: rawSpecs, requestedBy, dueDate, notes } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ANC Proposal Engine";
  workbook.created = new Date();

  const projectName = project.projectName || project.venue || "Untitled Project";

  // Sort: base bid first, then alternates (stable)
  const baseSpecs = rawSpecs.filter((s) => !s.isAlternate);
  const altSpecs = rawSpecs.filter((s) => s.isAlternate);
  const specs = [...baseSpecs, ...altSpecs];

  // ━━━ SHEET 1: Quote Request ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const sheet = workbook.addWorksheet("Quote Request", {
    properties: { tabColor: { argb: COLORS.ANC_BLUE } },
  });

  // Title block
  sheet.mergeCells("A1:N1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `SUBCONTRACTOR QUOTE REQUEST — ${projectName.toUpperCase()}`;
  titleCell.font = { size: 16, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ANC_BLUE } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 36;

  // Meta row
  const metaParts: string[] = [];
  if (project.clientName) metaParts.push(`Client: ${project.clientName}`);
  if (project.venue) metaParts.push(`Venue: ${project.venue}`);
  if (project.location) metaParts.push(`Location: ${project.location}`);
  if (project.isOutdoor) metaParts.push("Environment: Outdoor");
  if (dueDate) metaParts.push(`Quote Due: ${dueDate}`);

  sheet.mergeCells("A2:N2");
  const metaCell = sheet.getCell("A2");
  metaCell.value = metaParts.join("  |  ") || "ANC LED Display Integration";
  metaCell.font = { size: 10, italic: true, color: { argb: "FF666666" }, name: "Calibri" };
  metaCell.alignment = { horizontal: "center" };

  // Requested by / notes
  let row = 3;
  if (requestedBy) {
    sheet.mergeCells(`A${row}:N${row}`);
    sheet.getCell(`A${row}`).value = `Requested by: ${requestedBy}`;
    sheet.getCell(`A${row}`).font = { size: 10, color: { argb: "FF666666" }, name: "Calibri" };
    sheet.getCell(`A${row}`).alignment = { horizontal: "center" };
    row++;
  }
  if (notes) {
    sheet.mergeCells(`A${row}:N${row}`);
    sheet.getCell(`A${row}`).value = `Notes: ${notes}`;
    sheet.getCell(`A${row}`).font = { size: 10, color: { argb: "FF666666" }, name: "Calibri" };
    sheet.getCell(`A${row}`).alignment = { horizontal: "center" };
    row++;
  }

  row++; // spacing

  // Column widths
  const COL_COUNT = 14;
  const colWidths = [4, 28, 20, 10, 10, 10, 10, 10, 10, 8, 24, 16, 16, 24];
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  // Headers - split into "RFP REQUIREMENTS" and "SUBCONTRACTOR RESPONSE"
  // Section headers
  sheet.mergeCells(`A${row}:J${row}`);
  const reqHeader = sheet.getCell(`A${row}`);
  reqHeader.value = "RFP REQUIREMENTS (from extracted specs)";
  reqHeader.font = { size: 11, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  reqHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK_HEADER } };
  reqHeader.alignment = { horizontal: "left" };

  sheet.mergeCells(`K${row}:N${row}`);
  const respHeader = sheet.getCell(`K${row}`);
  respHeader.value = "SUBCONTRACTOR RESPONSE (fill in)";
  respHeader.font = { size: 11, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  respHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCC8800" } };
  respHeader.alignment = { horizontal: "center" };
  row++;

  // Column headers
  const headers = [
    "#",
    "Display Name",
    "Location",
    "Width (ft)",
    "Height (ft)",
    "Pixel Pitch",
    "H Resolution",
    "V Resolution",
    "Brightness",
    "Qty",
    "Special Requirements",
    // Subcontractor fills these:
    "Unit Cost ($/sqft)",
    "Lead Time (weeks)",
    "Notes / Alt Model",
  ];

  headers.forEach((h, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = h;
    if (i >= 10) {
      // Subcontractor response columns — amber header
      styleHeaderCell(cell, "FFCC8800");
    } else {
      styleHeaderCell(cell, COLORS.ANC_BLUE);
    }
  });
  sheet.getRow(row).height = 32;
  row++;

  // Data rows
  let altSeparatorInserted = false;
  specs.forEach((spec, idx) => {
    // Insert separator before first alternate
    if (spec.isAlternate && !altSeparatorInserted && altSpecs.length > 0) {
      altSeparatorInserted = true;
      sheet.mergeCells(`A${row}:N${row}`);
      const sepCell = sheet.getCell(`A${row}`);
      sepCell.value = `COST ALTERNATES — Quote Separately (${altSpecs.length} item${altSpecs.length > 1 ? "s" : ""})`;
      sepCell.font = { size: 11, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
      sepCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCC8800" } };
      sepCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(row).height = 28;
      row++;
    }

    const r = sheet.getRow(row);

    // # (line number)
    r.getCell(1).value = idx + 1;
    r.getCell(1).alignment = { horizontal: "center" };

    // Display name — append [Alt X] for alternates
    const displayLabel = spec.isAlternate && spec.alternateId
      ? `${spec.name} [Alt ${spec.alternateId}]`
      : spec.name;
    r.getCell(2).value = displayLabel;
    r.getCell(2).font = { bold: true, name: "Calibri" };

    // Location
    r.getCell(3).value = spec.location || "—";

    // Width ft
    r.getCell(4).value = spec.widthFt ?? "TBD";
    r.getCell(4).alignment = { horizontal: "center" };

    // Height ft
    r.getCell(5).value = spec.heightFt ?? "TBD";
    r.getCell(5).alignment = { horizontal: "center" };

    // Pixel pitch
    r.getCell(6).value = spec.pixelPitchMm != null ? `${spec.pixelPitchMm}mm` : "TBD";
    r.getCell(6).alignment = { horizontal: "center" };

    // H resolution
    r.getCell(7).value = spec.widthPx ?? "TBD";
    r.getCell(7).alignment = { horizontal: "center" };

    // V resolution
    r.getCell(8).value = spec.heightPx ?? "TBD";
    r.getCell(8).alignment = { horizontal: "center" };

    // Brightness
    r.getCell(9).value = spec.brightnessNits != null ? `${spec.brightnessNits.toLocaleString()} nits` : "TBD";
    r.getCell(9).alignment = { horizontal: "center" };

    // Quantity
    r.getCell(10).value = spec.quantity;
    r.getCell(10).alignment = { horizontal: "center" };

    // Special requirements
    const reqs: string[] = [];
    if (spec.environment === "outdoor") reqs.push("OUTDOOR");
    if (spec.serviceType) reqs.push(`${spec.serviceType} service`);
    if (spec.mountingType) reqs.push(spec.mountingType);
    reqs.push(...spec.specialRequirements);
    r.getCell(11).value = reqs.join(", ") || "—";
    r.getCell(11).alignment = { wrapText: true };

    // Input cells (amber background for subcontractor to fill)
    for (let col = 12; col <= 14; col++) {
      styleInputCell(r.getCell(col));
    }

    // Color rows: amber for alternates, stripe for base bid
    if (spec.isAlternate) {
      for (let col = 1; col <= 11; col++) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.AMBER_BG } };
      }
    } else {
      addStripeRow(r, 11, idx % 2 === 0);
    }

    r.height = 24;
    row++;
  });

  // Summary row
  row++;
  sheet.mergeCells(`A${row}:N${row}`);
  const summaryCell = sheet.getCell(`A${row}`);
  summaryCell.value = `Total: ${specs.length} displays (${baseSpecs.length} base bid, ${altSpecs.length} alternates)  |  ${specs.filter(s => s.environment === "outdoor").length} Outdoor  |  ${specs.filter(s => s.environment === "indoor").length} Indoor  |  Total Qty: ${specs.reduce((sum, s) => sum + s.quantity, 0)}`;
  summaryCell.font = { size: 11, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK_HEADER } };
  summaryCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(row).height = 28;

  // Instructions
  row += 2;
  sheet.mergeCells(`A${row}:N${row}`);
  sheet.getCell(`A${row}`).value = "INSTRUCTIONS";
  sheet.getCell(`A${row}`).font = { size: 12, bold: true, name: "Calibri" };
  row++;

  const instructions = [
    "1. Fill in the yellow columns (Unit Cost, Lead Time, Notes) for each display.",
    "2. Unit Cost should be in $/sqft, landed to US port (include tariff + shipping).",
    "3. If proposing an alternative model, note it in the 'Notes / Alt Model' column.",
    "4. For multi-quantity items, provide per-unit pricing.",
    "5. Return completed sheet to ANC for integration into the proposal.",
  ];

  instructions.forEach((inst) => {
    sheet.mergeCells(`A${row}:N${row}`);
    sheet.getCell(`A${row}`).value = inst;
    sheet.getCell(`A${row}`).font = { size: 10, color: { argb: "FF666666" }, name: "Calibri" };
    row++;
  });

  // ━━━ SHEET 2: Detailed Specs (one row per display with ALL fields) ━━━━━━

  const detailSheet = workbook.addWorksheet("Detailed Specs", {
    properties: { tabColor: { argb: "FF28A745" } },
  });

  detailSheet.mergeCells("A1:R1");
  const dtTitle = detailSheet.getCell("A1");
  dtTitle.value = `${projectName} — Full LED Specifications`;
  dtTitle.font = { size: 14, bold: true, color: { argb: COLORS.WHITE }, name: "Calibri" };
  dtTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ANC_BLUE } };
  dtTitle.alignment = { horizontal: "center", vertical: "middle" };
  detailSheet.getRow(1).height = 32;

  const detailHeaders = [
    "Display", "Location", "Width (ft)", "Height (ft)", "Width (px)",
    "Height (px)", "Pitch (mm)", "Nits", "Environment", "Qty",
    "Service Type", "Mounting", "Max Power (W)", "Weight (lbs)",
    "Special Requirements", "Confidence", "Type", "Alt ID",
  ];

  const detailWidths = [28, 20, 10, 10, 10, 10, 10, 10, 10, 6, 12, 16, 12, 12, 30, 10, 12, 10];
  detailWidths.forEach((w, i) => { detailSheet.getColumn(i + 1).width = w; });

  detailHeaders.forEach((h, i) => {
    const cell = detailSheet.getCell(3, i + 1);
    cell.value = h;
    styleHeaderCell(cell, COLORS.ANC_BLUE);
  });

  specs.forEach((spec, idx) => {
    const r = detailSheet.getRow(4 + idx);
    r.getCell(1).value = spec.name;
    r.getCell(1).font = { bold: true, name: "Calibri" };
    r.getCell(2).value = spec.location || "—";
    r.getCell(3).value = spec.widthFt != null ? spec.widthFt : "TBD";
    r.getCell(4).value = spec.heightFt != null ? spec.heightFt : "TBD";
    r.getCell(5).value = spec.widthPx != null ? spec.widthPx : "TBD";
    r.getCell(6).value = spec.heightPx != null ? spec.heightPx : "TBD";
    r.getCell(7).value = spec.pixelPitchMm != null ? spec.pixelPitchMm : "TBD";
    r.getCell(8).value = spec.brightnessNits != null ? spec.brightnessNits : "TBD";
    r.getCell(9).value = spec.environment;
    r.getCell(10).value = spec.quantity;
    r.getCell(11).value = spec.serviceType || "—";
    r.getCell(12).value = spec.mountingType || "—";
    r.getCell(13).value = spec.maxPowerW;
    r.getCell(14).value = spec.weightLbs;
    r.getCell(15).value = spec.specialRequirements.join(", ") || "—";
    r.getCell(15).alignment = { wrapText: true };
    r.getCell(16).value = Math.round(spec.confidence * 100) / 100;
    r.getCell(17).value = spec.isAlternate ? "Alternate" : "Base Bid";
    r.getCell(17).alignment = { horizontal: "center" };
    r.getCell(18).value = spec.alternateId || "";
    r.getCell(18).alignment = { horizontal: "center" };

    if (spec.isAlternate) {
      for (let i = 1; i <= 18; i++) {
        r.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.AMBER_BG } };
      }
    } else {
      addStripeRow(r, 18, idx % 2 === 0);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
