#!/usr/bin/env node
/**
 * Deep analysis of extracted Excel intelligence.
 * Produces the 5 tables Ahmad requested:
 *   1) LED Margin Distribution
 *   2) Services Margin Distribution
 *   3) Install Rate Evidence
 *   4) Electrical Rate Evidence
 *   5) Unpredicted Patterns
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import ExcelJS from "exceljs";

const ROOT = resolve(process.cwd());
const findings = JSON.parse(readFileSync(resolve(ROOT, "out/findings.json"), "utf-8"));

// ============================================================================
// We need to go DEEPER into the actual Excel files for the data the extractor
// summarized but didn't fully tabulate. Let's re-read the key sheets.
// ============================================================================

const SPECIMENS = [
  { path: "specimens/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx", project: "NBCU", docType: "Proposal" },
  { path: "specimens/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx", project: "Indiana Fever", docType: "Proposal" },
  { path: "specimens/USC - Williams-Brice Stadium - Additional LED Displays - Cost Analysis (Budget) - DJC & JSR - 2026-02-09 (1).xlsx", project: "USC", docType: "Budget" },
  { path: "specimens/ANC_Atlanta_Pigeons_LED_Displays_LOI_2_9_2026.xlsx", project: "Atlanta Pigeons", docType: "LOI" },
  { path: "specimens/ANC_NBTEST_Audit_2-12-2026.xlsx", project: "NBTEST Audit", docType: "Audit" },
];

function cellVal(cell) {
  if (!cell) return null;
  if (cell.value && typeof cell.value === "object") {
    if (cell.value.result !== undefined) return cell.value.result;
    if (cell.value.richText) return cell.value.richText.map(r => r.text).join("");
    if (cell.value.text) return cell.value.text;
  }
  return cell.value;
}

function toNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cellFormula(cell) {
  if (!cell || !cell.value) return null;
  if (typeof cell.value === "object" && cell.value.formula) return cell.value.formula;
  if (typeof cell.value === "object" && cell.value.sharedFormula) return cell.value.sharedFormula;
  return null;
}

function norm(s) {
  return (s ?? "").toString().toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function fmt$(n) {
  if (n == null) return "-";
  return "$" + Math.round(n).toLocaleString();
}

function fmtPct(n) {
  if (n == null) return "-";
  return (n * 100).toFixed(1) + "%";
}

// ============================================================================
// TABLE 1: LED MARGIN DISTRIBUTION
// Read LED Cost Sheet from each file, extract per-display: cost, sell, margin%
// ============================================================================

async function extractLEDMargins() {
  const rows = [];

  for (const spec of SPECIMENS) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(resolve(ROOT, spec.path));
    } catch (e) { continue; }

    // Find LED Cost Sheet
    const ledSheet = wb.worksheets.find(ws => /led\s*cost\s*sheet/i.test(ws.name));
    if (!ledSheet) continue;

    // Find header row — look for "Total Cost" or "Selling Price" in first 10 rows
    let headerRow = -1;
    let cols = {};
    for (let r = 1; r <= 10; r++) {
      const row = ledSheet.getRow(r);
      const cellTexts = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cellTexts[col] = norm(cellVal(cell));
      });

      const hasKey = Object.values(cellTexts).some(v =>
        /total\s*cost|selling\s*price|margin\s*%/.test(v)
      );
      if (hasKey) {
        headerRow = r;
        for (const [col, val] of Object.entries(cellTexts)) {
          const c = Number(col);
          if (/mm\s*pitch|pixel\s*pitch/.test(val)) cols.pitch = c;
          if (/active\s*height|height/.test(val) && !cols.height) cols.height = c;
          if (/active\s*width|width/.test(val) && !cols.width) cols.width = c;
          if (/total\s*sq\s*ft/.test(val)) cols.sqft = c;
          if (/cost\s*sq\s*ft|\$\s*sq\s*ft|cost.*sqft/.test(val)) cols.costSqFt = c;
          if (/display\s*cost/.test(val)) cols.displayCost = c;
          if (/spare/.test(val)) cols.spare = c;
          if (/processor/.test(val)) cols.processor = c;
          if (/shipping/.test(val)) cols.shipping = c;
          if (/total\s*cost/.test(val)) cols.totalCost = c;
          if (/margin\s*%/.test(val)) cols.marginPct = c;
          if (/(?:selling\s*price|sell\s*price)/.test(val) && !/cost/.test(val)) cols.sellPrice = c;
          if (/bond/.test(val)) cols.bond = c;
          if (/total\s*w.*bond|with\s*bond/.test(val)) cols.totalWithBond = c;
          if (/brightness|nit/.test(val)) cols.brightness = c;
        }
        break;
      }
    }

    if (headerRow < 0) continue;

    // Extract data rows
    for (let r = headerRow + 1; r <= ledSheet.rowCount; r++) {
      const row = ledSheet.getRow(r);
      const label = (cellVal(row.getCell(1)) ?? "").toString().trim();
      if (!label || label.length < 3) continue;
      if (/^\s*(total|sub\s*total|grand|notes?)\s*$/i.test(label)) continue;

      const pitchMatch = label.match(/(\d+\.?\d*)\s*mm/i);
      const dimMatch = label.match(/(\d+\.?\d*)[''′]\s*[hH]\s*[x×]\s*(\d+\.?\d*)[''′]\s*[wW]/);

      const entry = {
        project: spec.project,
        docType: spec.docType,
        display: label.substring(0, 70),
        pitch: cols.pitch ? toNum(cellVal(row.getCell(cols.pitch))) : (pitchMatch ? Number(pitchMatch[1]) : null),
        heightFt: cols.height ? toNum(cellVal(row.getCell(cols.height))) : (dimMatch ? Number(dimMatch[1]) : null),
        widthFt: cols.width ? toNum(cellVal(row.getCell(cols.width))) : (dimMatch ? Number(dimMatch[2]) : null),
        sqft: cols.sqft ? toNum(cellVal(row.getCell(cols.sqft))) : null,
        costSqFt: cols.costSqFt ? toNum(cellVal(row.getCell(cols.costSqFt))) : null,
        displayCost: cols.displayCost ? toNum(cellVal(row.getCell(cols.displayCost))) : null,
        spare: cols.spare ? toNum(cellVal(row.getCell(cols.spare))) : null,
        processor: cols.processor ? toNum(cellVal(row.getCell(cols.processor))) : null,
        shipping: cols.shipping ? toNum(cellVal(row.getCell(cols.shipping))) : null,
        totalCost: cols.totalCost ? toNum(cellVal(row.getCell(cols.totalCost))) : null,
        marginPct: cols.marginPct ? toNum(cellVal(row.getCell(cols.marginPct))) : null,
        sellPrice: cols.sellPrice ? toNum(cellVal(row.getCell(cols.sellPrice))) : null,
        bond: cols.bond ? toNum(cellVal(row.getCell(cols.bond))) : null,
        totalWithBond: cols.totalWithBond ? toNum(cellVal(row.getCell(cols.totalWithBond))) : null,
      };

      // Derive sqft if missing
      if (!entry.sqft && entry.heightFt && entry.widthFt) {
        entry.sqft = entry.heightFt * entry.widthFt;
      }

      // Derive margin if we have cost and sell
      if (entry.sellPrice && entry.totalCost && entry.sellPrice > 0) {
        entry.derivedMarginPct = (entry.sellPrice - entry.totalCost) / entry.sellPrice;
      }

      // Derive cost/sqft if missing
      if (!entry.costSqFt && entry.displayCost && entry.sqft && entry.sqft > 0) {
        entry.costSqFt = entry.displayCost / entry.sqft;
      }

      rows.push(entry);
    }
  }

  return rows;
}

// ============================================================================
// TABLE 2: SERVICES MARGIN DISTRIBUTION
// Read Margin Analysis from each file, extract per-service-line: cost, sell, margin%
// ============================================================================

async function extractServicesMargins() {
  const rows = [];

  for (const spec of SPECIMENS) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(resolve(ROOT, spec.path));
    } catch (e) { continue; }

    const maSheet = wb.worksheets.find(ws => /^margin\s*analysis$/i.test(ws.name.trim()));
    if (!maSheet) continue;

    // Scan for cost/sell/margin columns
    let colMap = null;
    for (let r = 1; r <= 15; r++) {
      const row = maSheet.getRow(r);
      const cells = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cells[col] = norm(cellVal(cell));
      });
      const costCol = Object.entries(cells).find(([, v]) => /\b(our\s*cost|total\s*cost|cost)\b/.test(v) && !/sqft/.test(v));
      const sellCol = Object.entries(cells).find(([, v]) => /\b(selling|price|client)\b/.test(v) && !/per|sqft/.test(v));
      const marginDolCol = Object.entries(cells).find(([, v]) => /\bmargin\s*\$/.test(v));
      const marginPctCol = Object.entries(cells).find(([, v]) => /\bmargin\s*%/.test(v));

      if (costCol && sellCol) {
        colMap = {
          headerRow: r,
          cost: Number(costCol[0]),
          sell: Number(sellCol[0]),
          marginDol: marginDolCol ? Number(marginDolCol[0]) : null,
          marginPct: marginPctCol ? Number(marginPctCol[0]) : null,
        };
        break;
      }
    }

    if (!colMap) {
      // Fallback: try B=cost, C=sell, D=margin$, E=margin%
      colMap = { headerRow: 0, cost: 2, sell: 3, marginDol: 4, marginPct: 5 };
    }

    for (let r = colMap.headerRow + 1; r <= maSheet.rowCount; r++) {
      const row = maSheet.getRow(r);
      const label = (cellVal(row.getCell(1)) ?? "").toString().trim();
      if (!label || label.length < 2) continue;

      const cost = toNum(cellVal(row.getCell(colMap.cost)));
      const sell = toNum(cellVal(row.getCell(colMap.sell)));
      const marginPct = colMap.marginPct ? toNum(cellVal(row.getCell(colMap.marginPct))) : null;

      if (cost === null && sell === null) continue;

      const derivedMarginPct = (sell && cost && sell > 0) ? (sell - cost) / sell : null;

      // Classify: is this a display (LED) row or a services row?
      const labelN = norm(label);
      let category = "unknown";
      if (/led|display|lcd|ribbon|screen|aio|atrium|locker|store|gym|lounge|history|elevator|bistro|endzone|scoreboard|pigeons|nest|feather|rooftop|gift|egg|branch/.test(labelN)) category = "LED_DISPLAY";
      else if (/mount|structural|material|steel|cladding|plywood/.test(labelN)) category = "STRUCTURAL";
      else if (/install|labor/.test(labelN)) category = "INSTALL_LABOR";
      else if (/electric|data|low\s*voltage/.test(labelN)) category = "ELECTRICAL";
      else if (/pm|travel|project\s*manage|general\s*cond/.test(labelN)) category = "PM_TRAVEL";
      else if (/submit|engineer|permit/.test(labelN)) category = "ENGINEERING";
      else if (/livesync|software|license|integration/.test(labelN)) category = "LIVESYNC";
      else if (/tax/.test(labelN)) category = "TAX";
      else if (/bond/.test(labelN)) category = "BOND";
      else if (/sub\s*total|total|grand/.test(labelN)) category = "SUBTOTAL";
      else if (/alternate|alt\s*#/.test(labelN)) category = "ALTERNATE";
      else if (/shipping/.test(labelN)) category = "SHIPPING";
      else if (/spare|warranty|event\s*support/.test(labelN)) category = "WARRANTY";

      rows.push({
        project: spec.project,
        docType: spec.docType,
        label: label.substring(0, 70),
        category,
        cost,
        sell,
        marginPct: marginPct ?? derivedMarginPct,
        derivedMarginPct,
        formula: cellFormula(row.getCell(colMap.sell)),
      });
    }
  }

  return rows;
}

// ============================================================================
// TABLE 3+4: INSTALL & ELECTRICAL RATE EVIDENCE
// Compile from findings.json formula hits
// ============================================================================

function compileRateEvidence() {
  const installRates = [];
  const electricalRates = [];
  const allRates = [];

  for (const f of findings) {
    if (!f.rate_inferences) continue;

    for (const hit of f.rate_inferences.install_rate_per_sqft_candidates || []) {
      installRates.push({ ...hit, project: f.project_name, docType: f.doc_type });
    }
    for (const hit of f.rate_inferences.electrical_rate_per_sqft_candidates || []) {
      electricalRates.push({ ...hit, project: f.project_name, docType: f.doc_type });
    }
    for (const hit of f.rate_inferences.per_lb_rate_candidates || []) {
      allRates.push({ ...hit, project: f.project_name, docType: f.doc_type, type: "per_lb" });
    }
    for (const hit of f.rate_inferences.other_rate_candidates || []) {
      allRates.push({ ...hit, project: f.project_name, docType: f.doc_type, type: "other" });
    }
  }

  return { installRates, electricalRates, allRates };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // ===== TABLE 1: LED MARGINS =====
  const ledRows = await extractLEDMargins();

  console.log("═".repeat(120));
  console.log("TABLE 1: LED MARGIN DISTRIBUTION (from LED Cost Sheet)");
  console.log("═".repeat(120));
  console.log(
    "Project".padEnd(18) +
    "DocType".padEnd(10) +
    "Display".padEnd(50) +
    "Pitch".padEnd(8) +
    "SqFt".padEnd(10) +
    "$/SqFt".padEnd(10) +
    "DispCost".padEnd(14) +
    "Spare".padEnd(10) +
    "TotalCost".padEnd(14) +
    "Margin%".padEnd(10) +
    "SellPrice".padEnd(14) +
    "Bond".padEnd(10)
  );
  console.log("─".repeat(120));

  for (const r of ledRows) {
    if (!r.totalCost && !r.sellPrice && !r.displayCost && !r.sqft) continue; // skip empty rows
    console.log(
      (r.project || "").padEnd(18) +
      (r.docType || "").padEnd(10) +
      (r.display || "").substring(0, 48).padEnd(50) +
      (r.pitch ? r.pitch + "mm" : "-").padEnd(8) +
      (r.sqft ? r.sqft.toFixed(0) : "-").padEnd(10) +
      (r.costSqFt ? "$" + r.costSqFt.toFixed(0) : "-").padEnd(10) +
      (fmt$(r.displayCost)).padEnd(14) +
      (fmt$(r.spare)).padEnd(10) +
      (fmt$(r.totalCost)).padEnd(14) +
      (fmtPct(r.marginPct)).padEnd(10) +
      (fmt$(r.sellPrice)).padEnd(14) +
      (fmt$(r.bond)).padEnd(10)
    );
  }

  // Stats
  const ledMargins = ledRows.filter(r => r.marginPct != null && r.marginPct > 0 && r.marginPct < 1);
  if (ledMargins.length > 0) {
    const vals = ledMargins.map(r => r.marginPct).sort((a, b) => a - b);
    console.log("\n  LED MARGIN STATS:");
    console.log("    Count: " + vals.length);
    console.log("    Min:   " + fmtPct(vals[0]));
    console.log("    Max:   " + fmtPct(vals[vals.length - 1]));
    console.log("    Median:" + fmtPct(vals[Math.floor(vals.length / 2)]));
    console.log("    Mean:  " + fmtPct(vals.reduce((a, b) => a + b, 0) / vals.length));

    // By doc type
    const byDocType = {};
    for (const r of ledMargins) {
      if (!byDocType[r.docType]) byDocType[r.docType] = [];
      byDocType[r.docType].push(r.marginPct);
    }
    console.log("\n  BY DOC TYPE:");
    for (const [dt, vals2] of Object.entries(byDocType)) {
      const avg = vals2.reduce((a, b) => a + b, 0) / vals2.length;
      console.log("    " + dt.padEnd(12) + " n=" + vals2.length + " avg=" + fmtPct(avg) + " range=" + fmtPct(Math.min(...vals2)) + "-" + fmtPct(Math.max(...vals2)));
    }
  }

  // Cost/sqft stats
  const costSqFts = ledRows.filter(r => r.costSqFt != null && r.costSqFt > 0);
  if (costSqFts.length > 0) {
    console.log("\n  LED COST/SQFT STATS:");
    const vals = costSqFts.map(r => ({ pitch: r.pitch, cost: r.costSqFt, project: r.project }));
    vals.sort((a, b) => (a.pitch || 0) - (b.pitch || 0));
    for (const v of vals) {
      console.log("    " + (v.pitch ? v.pitch + "mm" : "?").padEnd(8) + " $" + v.cost.toFixed(0) + "/sqft" + "  (" + v.project + ")");
    }
  }

  // ===== TABLE 2: SERVICES MARGINS =====
  const svcRows = await extractServicesMargins();

  console.log("\n\n" + "═".repeat(120));
  console.log("TABLE 2: SERVICES MARGIN DISTRIBUTION (from Margin Analysis)");
  console.log("═".repeat(120));
  console.log(
    "Project".padEnd(18) +
    "DocType".padEnd(10) +
    "Category".padEnd(16) +
    "Label".padEnd(45) +
    "Cost".padEnd(14) +
    "Sell".padEnd(14) +
    "Margin%".padEnd(10)
  );
  console.log("─".repeat(120));

  // Filter to non-tax, non-subtotal rows with actual data
  const svcData = svcRows.filter(r =>
    r.cost !== null && r.sell !== null &&
    !["TAX", "BOND", "SUBTOTAL"].includes(r.category)
  );

  for (const r of svcData) {
    console.log(
      (r.project || "").padEnd(18) +
      (r.docType || "").padEnd(10) +
      (r.category || "").padEnd(16) +
      (r.label || "").substring(0, 43).padEnd(45) +
      (fmt$(r.cost)).padEnd(14) +
      (fmt$(r.sell)).padEnd(14) +
      (fmtPct(r.marginPct)).padEnd(10)
    );
  }

  // Stats by category
  console.log("\n  SERVICES MARGIN BY CATEGORY:");
  const byCat = {};
  for (const r of svcData) {
    if (r.marginPct == null || r.marginPct <= 0 || r.marginPct >= 1) continue;
    if (!byCat[r.category]) byCat[r.category] = [];
    byCat[r.category].push({ pct: r.marginPct, project: r.project, docType: r.docType });
  }
  for (const [cat, items] of Object.entries(byCat).sort()) {
    const pcts = items.map(i => i.pct);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const projects = [...new Set(items.map(i => i.project))].join(", ");
    console.log("    " + cat.padEnd(20) + " n=" + String(items.length).padEnd(4) + " avg=" + fmtPct(avg).padEnd(8) + " range=" + fmtPct(Math.min(...pcts)) + "-" + fmtPct(Math.max(...pcts)) + "  [" + projects + "]");
  }

  // By project
  console.log("\n  SERVICES MARGIN BY PROJECT:");
  const byProj = {};
  for (const r of svcData) {
    if (r.marginPct == null || r.marginPct <= 0 || r.marginPct >= 1) continue;
    if (r.category === "LED_DISPLAY") continue; // exclude LED rows
    if (!byProj[r.project]) byProj[r.project] = [];
    byProj[r.project].push(r.marginPct);
  }
  for (const [proj, pcts] of Object.entries(byProj)) {
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const spec = SPECIMENS.find(s => s.project === proj);
    console.log("    " + proj.padEnd(20) + " (" + (spec?.docType || "?") + ") n=" + String(pcts.length).padEnd(4) + " avg=" + fmtPct(avg) + " range=" + fmtPct(Math.min(...pcts)) + "-" + fmtPct(Math.max(...pcts)));
  }

  // ===== TABLE 3+4: RATE EVIDENCE =====
  const { installRates, electricalRates, allRates } = compileRateEvidence();

  console.log("\n\n" + "═".repeat(120));
  console.log("TABLE 3: INSTALL RATE EVIDENCE (from formula hits)");
  console.log("═".repeat(120));

  console.log("\n  INSTALL RATES ($/sqft from formulas):");
  for (const r of installRates) {
    console.log("    [" + (r.project || "").padEnd(20) + "] " + (r.label || "").substring(0, 40).padEnd(42) + r.formula.padEnd(20) + " = " + fmt$(r.value) + "  rule=" + r.rule);
  }

  console.log("\n  PER-LB RATES (from formulas):");
  for (const r of allRates.filter(x => x.type === "per_lb")) {
    console.log("    [" + (r.project || "").padEnd(20) + "] " + (r.label || "").substring(0, 40).padEnd(42) + r.formula.padEnd(20) + " = " + fmt$(r.value) + "  rule=" + r.rule);
  }

  // Check: did we find *150 anywhere?
  const has150 = [...installRates, ...allRates].some(r => r.rule === "INSTALL_150_SQFT" || r.formula?.includes("*150"));
  console.log("\n  DID WE FIND *150 (budget flat rate)? " + (has150 ? "YES" : "❌ NO — NOT IN ANY FILE"));

  // Check: did we find *50 (per-lb)
  const has50 = allRates.some(r => r.rule === "RATE_50_PER_LB");
  console.log("  DID WE FIND *50 (per-lb rate)? " + (has50 ? "YES" : "❌ NO — NOT IN ANY FILE"));

  console.log("\n\n" + "═".repeat(120));
  console.log("TABLE 4: ELECTRICAL RATE EVIDENCE (from formula hits)");
  console.log("═".repeat(120));

  for (const r of electricalRates) {
    console.log("    [" + (r.project || "").padEnd(20) + "] " + (r.label || "").substring(0, 40).padEnd(42) + r.formula.padEnd(20) + " = " + fmt$(r.value) + "  rule=" + r.rule);
  }

  const has115 = electricalRates.some(r => r.rule === "ELECTRICAL_115_SQFT");
  console.log("\n  DID WE FIND *115 (electrical flat rate)? " + (has115 ? "YES" : "❌ NO — NOT IN ANY FILE"));
  const has125 = electricalRates.some(r => r.rule === "ELECTRICAL_125_SQFT");
  console.log("  DID WE FIND *125? " + (has125 ? "YES — in " + electricalRates.filter(r => r.rule === "ELECTRICAL_125_SQFT").map(r => r.project).join(", ") : "NO"));

  // ===== TABLE 5: OTHER RATES / SURPRISES =====
  console.log("\n\n" + "═".repeat(120));
  console.log("TABLE 5: ALL OTHER RATE FORMULAS (unexpected patterns)");
  console.log("═".repeat(120));

  const otherRates = allRates.filter(x => x.type === "other");
  // Deduplicate
  const seen = new Set();
  for (const r of otherRates) {
    const key = r.project + "|" + r.label + "|" + r.formula;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log("    [" + (r.project || "").padEnd(20) + "] " + (r.label || "").substring(0, 40).padEnd(42) + r.formula.padEnd(25) + " = " + fmt$(r.value) + "  rule=" + r.rule);
  }

  // ===== UNIVERSAL CONSTANTS =====
  console.log("\n\n" + "═".repeat(120));
  console.log("UNIVERSAL CONSTANTS (found in ALL or MOST files)");
  console.log("═".repeat(120));

  let bondCount = 0;
  let bondProjects = new Set();
  let divisorCount = 0;
  let divisorProjects = new Set();

  for (const f of findings) {
    if (!f.rate_inferences) continue;
    const bonds = f.rate_inferences.bond_pct_candidates || [];
    if (bonds.length > 0) { bondCount += bonds.length; bondProjects.add(f.project_name); }
    const divs = f.rate_inferences.divisor_margin_candidates || [];
    if (divs.length > 0) { divisorCount += divs.length; divisorProjects.add(f.project_name); }
  }

  console.log("  Bond 1.5%:           " + bondCount + " formula hits across " + bondProjects.size + " projects: [" + [...bondProjects].join(", ") + "]");
  console.log("  Divisor model:       " + divisorCount + " formula hits across " + divisorProjects.size + " projects: [" + [...divisorProjects].join(", ") + "]");

  // Install sheet margin values
  console.log("\n  INSTALL SHEET MARGIN VALUES (from header cells):");
  for (const f of findings) {
    if (!f.sub_bid_structure) continue;
    for (const s of f.sub_bid_structure) {
      if (Object.keys(s.marginValues).length > 0) {
        const vals = Object.values(s.marginValues);
        const allSame = vals.every(v => v === vals[0]);
        console.log("    [" + f.project_name.substring(0, 25).padEnd(27) + "] " + s.sheet.padEnd(25) + " " + JSON.stringify(s.marginValues) + (allSame ? " ← ALL " + fmtPct(vals[0]) : " ← MIXED"));
      }
    }
  }

  console.log("\n\nDone.");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
