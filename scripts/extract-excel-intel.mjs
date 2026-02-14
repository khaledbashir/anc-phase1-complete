#!/usr/bin/env node
/**
 * ANC Excel Intelligence Extractor — Production Grade
 *
 * Scans a directory of .xlsx estimator workbooks and produces:
 *   1) out/master_project_summary.csv   — one row per workbook
 *   2) out/master_display_points.csv    — one row per display row
 *   3) out/findings.json                — per-workbook detail + formula hits
 *
 * Usage:
 *   node scripts/extract-excel-intel.mjs --input ./specimens --out ./out
 */

import ExcelJS from "exceljs";
import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join, basename, extname } from "path";

// ============================================================================
// CLI ARGS
// ============================================================================
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const INPUT_DIR = resolve(getArg("--input", "./specimens"));
const OUT_DIR = resolve(getArg("--out", "./out"));

// ============================================================================
// HELPERS
// ============================================================================
function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function norm(s) {
  return (s ?? "").toString().toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function cellVal(cell) {
  if (!cell) return null;
  if (cell.value && typeof cell.value === "object") {
    if (cell.value.result !== undefined) return cell.value.result;
    if (cell.value.richText) return cell.value.richText.map(r => r.text).join("");
    if (cell.value.text) return cell.value.text;
  }
  return cell.value;
}

function cellFormula(cell) {
  if (!cell || !cell.value) return null;
  if (typeof cell.value === "object" && cell.value.formula) return cell.value.formula;
  if (typeof cell.value === "object" && cell.value.sharedFormula) return cell.value.sharedFormula;
  return null;
}

function csvEscape(v) {
  if (v == null || v === "") return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(arr) {
  return arr.map(csvEscape).join(",");
}

function findXlsxFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      if (entry.startsWith("~$")) continue;
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (extname(entry).toLowerCase() === ".xlsx") results.push(full);
    }
  }
  walk(dir);
  return results;
}

// ============================================================================
// SHEET CLASSIFICATION
// ============================================================================
function classifySheet(name) {
  const n = norm(name);
  if (/margin\s*analysis/.test(n)) return "MARGIN_ANALYSIS";
  if (/led\s*cost\s*sheet/.test(n)) return "LED_COST_SHEET";
  if (/budget\s*control/.test(n)) return "BUDGET_CONTROL";
  if (/\bmatrix\b/.test(n)) return "MATRIX";
  if (/\binstall\b/.test(n)) return "INSTALL";
  if (/\bp\s*&?\s*l\b|profit.loss/.test(n)) return "PNL";
  if (/cash\s*flow/.test(n)) return "CASH_FLOW";
  if (/\bpo/.test(n)) return "POS";
  if (/travel/.test(n)) return "TRAVEL";
  if (/resp/.test(n)) return "RESP_MATRIX";
  if (/lcd\s*summary/.test(n)) return "LCD_SUMMARY";
  if (/\bcms\b/.test(n)) return "CMS";
  if (/\bconfig/.test(n)) return "CONFIG";
  if (/\bpricing\b/.test(n)) return "PRICING";
  if (/\bform\b/.test(n)) return "FORM";
  return "OTHER";
}

function guessDocType(sheets, fileName) {
  const fn = norm(fileName);
  if (/\bloi\b|letter\s*of\s*intent/.test(fn)) return "LOI";
  if (/\bbudget\b/.test(fn)) return "BUDGET";
  if (/\baudit\b/.test(fn)) return "AUDIT";
  if (/\bproposal\b/.test(fn)) return "PROPOSAL";
  // Heuristics: budget files often have "Budget Control" or "Form" sheets
  const types = sheets.map(s => s.type);
  if (types.includes("BUDGET_CONTROL")) return "BUDGET";
  if (types.includes("INSTALL") && types.includes("LED_COST_SHEET")) return "PROPOSAL";
  if (types.includes("MATRIX")) return "LOI";
  return "UNKNOWN";
}

// ============================================================================
// MARGIN ANALYSIS PARSER
// ============================================================================
function parseMarginAnalysis(ws) {
  const blocks = [];
  let currentBlock = null;
  let taxRate = null;
  let bondRate = null;
  let toplineCost = null;
  let toplineSell = null;

  // First pass: find column layout by scanning first 15 rows for header patterns
  let colMap = null;
  const rowCount = ws.rowCount;

  for (let r = 1; r <= Math.min(15, rowCount); r++) {
    const row = ws.getRow(r);
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells.push({ col: colNumber, val: norm(cellVal(cell)) });
    });
    // Look for cost/selling/margin headers
    const costCol = cells.find(c => /\b(our\s*cost|total\s*cost|cost)\b/.test(c.val) && !/sqft|sq\s*ft/.test(c.val));
    const sellCol = cells.find(c => /\b(selling\s*price|sell|client\s*price|price)\b/.test(c.val) && !/per|sqft/.test(c.val));
    const marginDolCol = cells.find(c => /\bmargin\s*\$|\bmargin\b/.test(c.val) && !/\bmargin\s*%/.test(c.val) && !/pct/.test(c.val));
    const marginPctCol = cells.find(c => /\bmargin\s*%|margin\s*pct/.test(c.val));

    if (costCol && sellCol) {
      colMap = {
        headerRow: r,
        costCol: costCol.col,
        sellCol: sellCol.col,
        marginDolCol: marginDolCol?.col ?? null,
        marginPctCol: marginPctCol?.col ?? null,
      };
      break;
    }
  }

  // If no header found, try common ANC layout: col B=Cost, C=Sell, D=Margin$, E=Margin%
  if (!colMap) {
    colMap = { headerRow: 0, costCol: 2, sellCol: 3, marginDolCol: 4, marginPctCol: 5 };
  }

  // Second pass: extract data rows
  const startRow = colMap.headerRow + 1;
  for (let r = startRow; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const labelCell = row.getCell(1);
    const label = (cellVal(labelCell) ?? "").toString().trim();
    const labelN = norm(label);

    if (!label) continue;

    const cost = toNum(cellVal(row.getCell(colMap.costCol)));
    const sell = toNum(cellVal(row.getCell(colMap.sellCol)));
    const marginDol = colMap.marginDolCol ? toNum(cellVal(row.getCell(colMap.marginDolCol))) : null;
    const marginPct = colMap.marginPctCol ? toNum(cellVal(row.getCell(colMap.marginPctCol))) : null;

    // Tax row detection
    if (/^\s*tax\s*$/i.test(label) || labelN === "tax") {
      // Tax rate is often in column B or the first numeric cell
      for (let c = 1; c <= 10; c++) {
        const v = toNum(cellVal(row.getCell(c)));
        if (v && v > 0 && v < 1) {
          taxRate = v;
          break;
        }
      }
      continue;
    }

    // Bond row detection
    if (/bond/i.test(label)) {
      for (let c = 1; c <= 10; c++) {
        const v = toNum(cellVal(row.getCell(c)));
        if (v && v > 0 && v < 0.1) {
          bondRate = v;
          break;
        }
      }
      continue;
    }

    // Sub total / grand total
    if (/sub\s*total|grand\s*total|total\s*project/i.test(label)) {
      if (sell) toplineSell = sell;
      if (cost) toplineCost = cost;
      // Don't add as a line item, but track toplines
      if (currentBlock) {
        currentBlock.subtotalCost = cost;
        currentBlock.subtotalSell = sell;
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    // If this row has cost and sell, it's a line item
    if (cost !== null || sell !== null) {
      if (!currentBlock) {
        currentBlock = { items: [], subtotalCost: null, subtotalSell: null };
      }

      const derivedMarginPct = (sell && cost && sell > 0) ? (sell - cost) / sell : null;

      currentBlock.items.push({
        label,
        cost,
        sell,
        marginDol,
        marginPct: marginPct ?? derivedMarginPct,
        derivedMarginPct,
        formula: cellFormula(row.getCell(colMap.sellCol)),
      });
    }
  }

  // Push last block if not pushed
  if (currentBlock && currentBlock.items.length > 0) blocks.push(currentBlock);

  // Compute topline if not found
  if (!toplineCost || !toplineSell) {
    for (const b of blocks) {
      if (b.subtotalSell && (!toplineSell || b.subtotalSell > toplineSell)) {
        toplineSell = b.subtotalSell;
        toplineCost = b.subtotalCost;
      }
    }
  }

  return { blocks, taxRate, bondRate, toplineCost, toplineSell };
}

// ============================================================================
// LED COST SHEET PARSER
// ============================================================================
function parseLEDCostSheet(ws) {
  const displays = [];
  const rowCount = ws.rowCount;

  // Find header row
  let headerRow = -1;
  let headers = {};
  for (let r = 1; r <= Math.min(10, rowCount); r++) {
    const row = ws.getRow(r);
    const cells = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const v = norm(cellVal(cell));
      if (v) cells[col] = v;
    });
    // Look for key headers
    const hasPitch = Object.values(cells).some(v => /mm\s*pitch|pixel\s*pitch|pitch/.test(v));
    const hasSqFt = Object.values(cells).some(v => /sq\s*ft|sqft|square\s*f/.test(v));
    const hasDisplay = Object.values(cells).some(v => /display|name|description/.test(v));

    if ((hasPitch || hasSqFt) && Object.keys(cells).length > 5) {
      headerRow = r;
      // Map columns by header content
      for (const [col, val] of Object.entries(cells)) {
        const c = Number(col);
        if (/display\s*name|description|name/.test(val) && !headers.label) headers.label = c;
        if (/mm\s*pitch|pixel\s*pitch/.test(val)) headers.pitch = c;
        if (/active\s*height|height\s*\(ft|height.*ft/.test(val)) headers.height = c;
        if (/active\s*width|width\s*\(ft|width.*ft/.test(val)) headers.width = c;
        if (/qty|quantity/.test(val) && !/pixel/.test(val)) headers.qty = c;
        if (/total\s*sq\s*ft|total\s*sqft|total\s*area/.test(val)) headers.totalSqFt = c;
        if (/cost\s*sq\s*ft|cost.*sqft|\$.*sq\s*ft/.test(val)) headers.costPerSqFt = c;
        if (/display\s*cost/.test(val)) headers.displayCost = c;
        if (/spare\s*part/.test(val)) headers.spareParts = c;
        if (/processor/.test(val)) headers.processor = c;
        if (/shipping/.test(val)) headers.shipping = c;
        if (/total\s*cost/.test(val)) headers.totalCost = c;
        if (/margin\s*%|margin\s*pct/.test(val)) headers.marginPct = c;
        if (/selling\s*price|sell\s*price|price/.test(val) && !/cost/.test(val) && !/margin/.test(val)) headers.sellPrice = c;
        if (/brightness|nit/.test(val)) headers.brightness = c;
      }
      // Fallback: label is column 1 if not found
      if (!headers.label) headers.label = 1;
      break;
    }
  }

  if (headerRow < 0) {
    // Fallback: assume first row has data, label in col 1
    headerRow = 0;
    headers.label = 1;
  }

  // Parse data rows
  for (let r = headerRow + 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const label = (cellVal(row.getCell(headers.label || 1)) ?? "").toString().trim();
    if (!label || label.length < 3) continue;

    // Skip summary/total rows
    if (/^\s*(total|sub\s*total|grand|notes?|$)/i.test(label)) continue;

    const entry = { label };

    // Extract dimensions from label if columns not mapped
    const dimMatch = label.match(/(\d+\.?\d*)[''′]\s*[hH]\s*[x×]\s*(\d+\.?\d*)[''′]\s*[wW]/);
    const pitchMatch = label.match(/(\d+\.?\d*)\s*mm/i);
    const qtyMatch = label.match(/\((?:Qty\.?\s*)?(\d+)\)/i);

    entry.pitch_mm = headers.pitch ? toNum(cellVal(row.getCell(headers.pitch))) : (pitchMatch ? Number(pitchMatch[1]) : null);
    entry.height_ft = headers.height ? toNum(cellVal(row.getCell(headers.height))) : (dimMatch ? Number(dimMatch[1]) : null);
    entry.width_ft = headers.width ? toNum(cellVal(row.getCell(headers.width))) : (dimMatch ? Number(dimMatch[2]) : null);
    entry.qty = headers.qty ? toNum(cellVal(row.getCell(headers.qty))) : (qtyMatch ? Number(qtyMatch[1]) : null);
    entry.total_sqft = headers.totalSqFt ? toNum(cellVal(row.getCell(headers.totalSqFt))) : null;
    entry.cost_per_sqft = headers.costPerSqFt ? toNum(cellVal(row.getCell(headers.costPerSqFt))) : null;
    entry.display_cost = headers.displayCost ? toNum(cellVal(row.getCell(headers.displayCost))) : null;
    entry.spare_parts_cost = headers.spareParts ? toNum(cellVal(row.getCell(headers.spareParts))) : null;
    entry.processor_cost = headers.processor ? toNum(cellVal(row.getCell(headers.processor))) : null;
    entry.shipping_cost = headers.shipping ? toNum(cellVal(row.getCell(headers.shipping))) : null;
    entry.total_cost = headers.totalCost ? toNum(cellVal(row.getCell(headers.totalCost))) : null;
    entry.margin_pct = headers.marginPct ? toNum(cellVal(row.getCell(headers.marginPct))) : null;
    entry.selling_price = headers.sellPrice ? toNum(cellVal(row.getCell(headers.sellPrice))) : null;

    // Derive margin if we have cost and sell
    if (entry.selling_price && entry.total_cost && entry.selling_price > 0) {
      entry.derived_margin_pct = (entry.selling_price - entry.total_cost) / entry.selling_price;
    }

    // Calculate sqft if missing
    if (!entry.total_sqft && entry.height_ft && entry.width_ft) {
      const singleArea = entry.height_ft * entry.width_ft;
      entry.total_sqft = singleArea * (entry.qty || 1);
    }

    // Calculate cost/sqft if missing
    if (!entry.cost_per_sqft && entry.display_cost && entry.total_sqft && entry.total_sqft > 0) {
      entry.cost_per_sqft = entry.display_cost / entry.total_sqft;
    }

    // Collect formulas from this row
    entry.formulas = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const f = cellFormula(cell);
      if (f) entry.formulas[col] = f;
    });

    displays.push(entry);
  }

  return displays;
}

// ============================================================================
// INSTALL SHEET PARSER
// ============================================================================
function parseInstallSheet(ws, sheetName) {
  const result = {
    sheetName,
    hasSubBidColumns: false,
    subBidColumnNames: [],
    sections: [],
    marginValues: {},
    rateFormulas: [],
  };

  const rowCount = ws.rowCount;

  // Scan header area (rows 1-20) for margin values and sub bid columns
  for (let r = 1; r <= Math.min(20, rowCount); r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const val = (cellVal(cell) ?? "").toString().trim();
      const valN = norm(val);
      const numVal = toNum(val);

      // Detect sub bid columns
      if (/subcontractor|sub\s*\d|vendor|bid/i.test(val)) {
        result.hasSubBidColumns = true;
        result.subBidColumnNames.push(val);
      }

      // Detect margin labels + adjacent values
      if (/install\s*margin/i.test(val)) {
        const nextVal = toNum(cellVal(row.getCell(col + 1)));
        if (nextVal !== null) result.marginValues.install = nextVal;
      }
      if (/electrical\s*margin/i.test(val)) {
        const nextVal = toNum(cellVal(row.getCell(col + 1)));
        if (nextVal !== null) result.marginValues.electrical = nextVal;
      }
      if (/anc\s*margin/i.test(val)) {
        const nextVal = toNum(cellVal(row.getCell(col + 1)));
        if (nextVal !== null) result.marginValues.anc = nextVal;
      }
      if (/engineering.*permit|permit.*engineering/i.test(val)) {
        const nextVal = toNum(cellVal(row.getCell(col + 1)));
        if (nextVal !== null) result.marginValues.engineering = nextVal;
      }
    });
  }

  // Detect section headers
  const knownSections = [
    "structural materials", "structural labor", "led installation",
    "electrical", "data", "lighting", "pm", "general conditions",
    "travel", "submittals", "engineering", "permits", "heavy equipment",
    "fabricate", "install led", "cladding",
  ];

  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const label = (cellVal(row.getCell(1)) ?? "").toString().trim();
    const labelN = norm(label);

    if (knownSections.some(s => labelN.includes(s))) {
      result.sections.push({ row: r, label });
    }

    // Scan all cells for formulas with embedded rates
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const f = cellFormula(cell);
      if (!f) return;

      const rateMatch = f.match(/([A-Z]+\d+)\s*\*\s*(\d+\.?\d*)/i);
      if (rateMatch) {
        result.rateFormulas.push({
          row: r,
          col,
          label,
          formula: f,
          refCell: rateMatch[1],
          rate: Number(rateMatch[2]),
          value: toNum(cellVal(cell)),
        });
      }

      // Divisor pattern
      const divMatch = f.match(/([A-Z]+\d+)\s*\/\s*\(\s*1\s*-\s*([A-Z]+\d+|\d+\.?\d*)\s*\)/i);
      if (divMatch) {
        result.rateFormulas.push({
          row: r,
          col,
          label,
          formula: f,
          type: "divisor",
          refCell: divMatch[1],
          marginRef: divMatch[2],
          value: toNum(cellVal(cell)),
        });
      }
    });
  }

  return result;
}

// ============================================================================
// FORMULA SCANNER (all sheets)
// ============================================================================
function scanFormulas(ws, sheetName) {
  const hits = [];
  const rowCount = ws.rowCount;

  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const label = (cellVal(row.getCell(1)) ?? "").toString().trim();

    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const f = cellFormula(cell);
      if (!f) return;

      const rules = [];

      // Bond pattern: *0.015
      if (/\*\s*0\.015\b/.test(f)) rules.push("BOND_1.5PCT");

      // Tax patterns
      if (/\*\s*0\.08875\b/.test(f)) rules.push("TAX_8.875PCT");
      if (/\*\s*0\.0[5-9]\d*\b/.test(f)) rules.push("TAX_CANDIDATE");

      // Flat rate patterns
      if (/\*\s*150\b/.test(f)) rules.push("INSTALL_150_SQFT");
      if (/\*\s*115\b/.test(f)) rules.push("ELECTRICAL_115_SQFT");
      if (/\*\s*125\b/.test(f)) rules.push("ELECTRICAL_125_SQFT");
      if (/\*\s*105\b/.test(f)) rules.push("INSTALL_105_SQFT");
      if (/\*\s*145\b/.test(f)) rules.push("INSTALL_145_SQFT");

      // Per-lb patterns
      if (/\*\s*50\b/.test(f)) rules.push("RATE_50_PER_LB");
      if (/\*\s*55\b/.test(f)) rules.push("RATE_55_PER_LB");
      if (/\*\s*65\b/.test(f)) rules.push("RATE_65_PER_LB");
      if (/\*\s*75\b/.test(f)) rules.push("RATE_75_PER_LB");
      if (/\*\s*25\b/.test(f)) rules.push("RATE_25");
      if (/\*\s*30\b/.test(f)) rules.push("RATE_30");
      if (/\*\s*35\b/.test(f)) rules.push("RATE_35");

      // LED cost/sqft patterns
      if (/\*\s*430\b/.test(f)) rules.push("LED_430_SQFT");

      // Spare parts
      if (/\*\s*0\.05\b/.test(f)) rules.push("SPARE_PARTS_5PCT");
      if (/\*\s*0\.1\b/.test(f)) rules.push("SPARE_PARTS_10PCT");
      if (/\*\s*0\.08\b/.test(f)) rules.push("RATE_8PCT");

      // Divisor model
      if (/\/\s*\(\s*1\s*-/.test(f)) rules.push("DIVISOR_MARGIN_MODEL");

      // Escalation
      if (/\*\s*1\.1\b/.test(f)) rules.push("ANNUAL_ESCALATION_10PCT");

      // Generic rate: anything like *<number> where number > 10
      const genericMatch = f.match(/\*\s*(\d+\.?\d*)/g);
      if (genericMatch && rules.length === 0) {
        for (const m of genericMatch) {
          const rate = Number(m.replace("*", "").trim());
          if (rate > 10 && rate < 10000) rules.push(`GENERIC_RATE_${rate}`);
        }
      }

      if (rules.length > 0) {
        hits.push({
          sheet: sheetName,
          cell: `${String.fromCharCode(64 + col)}${r}`,
          row: r,
          col,
          label,
          formula: f,
          value: toNum(cellVal(cell)),
          matched_rules: rules,
        });
      }
    });
  }

  return hits;
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================
async function processWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const fileName = basename(filePath);
  const sheets = wb.worksheets.map(ws => ({
    name: ws.name,
    type: classifySheet(ws.name),
    rowCount: ws.rowCount,
    colCount: ws.columnCount,
  }));

  const docType = guessDocType(sheets, fileName);

  // Parse specific sheet types
  let marginAnalysis = null;
  let ledCostDisplays = [];
  const installSheets = [];
  const allFormulaHits = [];

  for (const ws of wb.worksheets) {
    const type = classifySheet(ws.name);

    // Scan formulas from every sheet
    const hits = scanFormulas(ws, ws.name);
    allFormulaHits.push(...hits);

    if (type === "MARGIN_ANALYSIS") {
      marginAnalysis = parseMarginAnalysis(ws);
    }

    if (type === "LED_COST_SHEET") {
      const displays = parseLEDCostSheet(ws);
      ledCostDisplays.push(...displays.map(d => ({ ...d, sheet_source: "LED_COST_SHEET" })));
    }

    if (type === "INSTALL") {
      installSheets.push(parseInstallSheet(ws, ws.name));
    }
  }

  // Also extract display-level data from Margin Analysis as fallback
  const maDisplays = [];
  if (marginAnalysis) {
    for (const block of marginAnalysis.blocks) {
      for (const item of block.items) {
        // Only include items that look like display rows (not services like "PM Travel")
        const labelN = norm(item.label);
        const isDisplay = /led|display|lcd|ribbon|screen|aio|atrium|locker|store|gym|lounge|history|elevator|bistro|endzone|scoreboard|fascia|pigeons|signage/.test(labelN);
        const isService = /mount|install|electrical|pm|travel|submittals|engineering|permit|livesync|shipping|integration|license|hardware(?!\s*$)/.test(labelN)
          && !isDisplay;

        maDisplays.push({
          label: item.label,
          sheet_source: "MARGIN_ANALYSIS",
          total_cost: item.cost,
          selling_price: item.sell,
          margin_pct: item.marginPct,
          derived_margin_pct: item.derivedMarginPct,
          is_display: isDisplay,
          is_service: isService,
          formula: item.formula,
        });
      }
    }
  }

  // Build rate inferences
  const rateInferences = {
    bond_pct_candidates: [],
    tax_rate_candidates: [],
    install_rate_per_sqft_candidates: [],
    electrical_rate_per_sqft_candidates: [],
    led_cost_per_sqft_candidates: [],
    per_lb_rate_candidates: [],
    spare_parts_pct_candidates: [],
    divisor_margin_candidates: [],
    escalation_candidates: [],
    other_rate_candidates: [],
  };

  for (const hit of allFormulaHits) {
    for (const rule of hit.matched_rules) {
      const entry = { sheet: hit.sheet, cell: hit.cell, label: hit.label, formula: hit.formula, value: hit.value, rule };

      if (rule === "BOND_1.5PCT") rateInferences.bond_pct_candidates.push(entry);
      else if (rule.startsWith("TAX_")) rateInferences.tax_rate_candidates.push(entry);
      else if (rule.startsWith("INSTALL_")) rateInferences.install_rate_per_sqft_candidates.push(entry);
      else if (rule.startsWith("ELECTRICAL_")) rateInferences.electrical_rate_per_sqft_candidates.push(entry);
      else if (rule.startsWith("LED_")) rateInferences.led_cost_per_sqft_candidates.push(entry);
      else if (rule.startsWith("RATE_") && rule.includes("PER_LB")) rateInferences.per_lb_rate_candidates.push(entry);
      else if (rule.startsWith("SPARE_PARTS_")) rateInferences.spare_parts_pct_candidates.push(entry);
      else if (rule === "DIVISOR_MARGIN_MODEL") rateInferences.divisor_margin_candidates.push(entry);
      else if (rule.startsWith("ANNUAL_ESCALATION")) rateInferences.escalation_candidates.push(entry);
      else rateInferences.other_rate_candidates.push(entry);
    }
  }

  // Sub bid structure summary
  const subBidStructure = installSheets.map(is => ({
    sheet: is.sheetName,
    hasSubBidColumns: is.hasSubBidColumns,
    subBidColumnNames: is.subBidColumnNames,
    sections: is.sections.map(s => s.label),
    marginValues: is.marginValues,
  }));

  // Build project summary
  const projectName = fileName.replace(/\.xlsx$/i, "").replace(/^Cost Analysis - /, "");
  const summary = {
    file_path: filePath,
    project_name: projectName,
    doc_type_guess: docType,
    has_margin_analysis: !!marginAnalysis,
    has_led_cost_sheet: ledCostDisplays.length > 0,
    has_budget_control: sheets.some(s => s.type === "BUDGET_CONTROL"),
    install_sheet_count: installSheets.length,
    margin_analysis_tax_rate: marginAnalysis?.taxRate ?? "",
    margin_analysis_bond_rate: marginAnalysis?.bondRate ?? "",
    topline_cost_total: marginAnalysis?.toplineCost ?? "",
    topline_selling_total: marginAnalysis?.toplineSell ?? "",
    topline_margin_pct: (marginAnalysis?.toplineSell && marginAnalysis?.toplineCost && marginAnalysis.toplineSell > 0)
      ? ((marginAnalysis.toplineSell - marginAnalysis.toplineCost) / marginAnalysis.toplineSell)
      : "",
  };

  return {
    summary,
    ledCostDisplays,
    maDisplays,
    installSheets: subBidStructure,
    formulaHits: allFormulaHits,
    rateInferences,
    sheets: sheets.map(s => s.name),
  };
}

// ============================================================================
// RUN
// ============================================================================
async function main() {
  if (!existsSync(INPUT_DIR)) {
    console.error(`ERROR: Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  const files = findXlsxFiles(INPUT_DIR);
  if (files.length === 0) {
    console.error(`ERROR: No .xlsx files found in ${INPUT_DIR}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Found ${files.length} workbooks in ${INPUT_DIR}`);

  const allSummaries = [];
  const allDisplayPoints = [];
  const allFindings = [];

  for (const file of files) {
    console.log(`  Processing: ${basename(file)} ...`);
    try {
      const result = await processWorkbook(file);

      allSummaries.push(result.summary);

      // Merge LED cost sheet displays
      for (const d of result.ledCostDisplays) {
        allDisplayPoints.push({
          file_path: basename(file),
          sheet_source: d.sheet_source,
          display_name: d.label,
          vendor: "",
          product: "",
          pitch_mm: d.pitch_mm ?? "",
          height_ft: d.height_ft ?? "",
          width_ft: d.width_ft ?? "",
          qty: d.qty ?? "",
          total_sqft: d.total_sqft ?? "",
          cost_per_sqft: d.cost_per_sqft ?? "",
          display_cost: d.display_cost ?? "",
          spare_parts_cost: d.spare_parts_cost ?? "",
          processor_cost: d.processor_cost ?? "",
          shipping_cost: d.shipping_cost ?? "",
          total_cost: d.total_cost ?? "",
          margin_pct: d.margin_pct ?? "",
          selling_price: d.selling_price ?? "",
          derived_margin_pct: d.derived_margin_pct ?? "",
        });
      }

      // Merge MA displays as fallback
      for (const d of result.maDisplays) {
        allDisplayPoints.push({
          file_path: basename(file),
          sheet_source: d.sheet_source,
          display_name: d.label,
          vendor: "",
          product: "",
          pitch_mm: "",
          height_ft: "",
          width_ft: "",
          qty: "",
          total_sqft: "",
          cost_per_sqft: "",
          display_cost: "",
          spare_parts_cost: "",
          processor_cost: "",
          shipping_cost: "",
          total_cost: d.total_cost ?? "",
          margin_pct: d.margin_pct ?? "",
          selling_price: d.selling_price ?? "",
          derived_margin_pct: d.derived_margin_pct ?? "",
        });
      }

      allFindings.push({
        file: basename(file),
        project_name: result.summary.project_name,
        doc_type: result.summary.doc_type_guess,
        sheets: result.sheets,
        formula_hits: result.formulaHits,
        rate_inferences: result.rateInferences,
        sub_bid_structure: result.installSheets,
        install_sheet_sections_found: result.installSheets.flatMap(is => is.sections),
      });
    } catch (err) {
      console.error(`  ERROR processing ${basename(file)}: ${err.message}`);
      allFindings.push({ file: basename(file), error: err.message });
    }
  }

  // ======= Write master_project_summary.csv =======
  const summaryHeaders = [
    "file_path", "project_name", "doc_type_guess",
    "has_margin_analysis", "has_led_cost_sheet", "has_budget_control", "install_sheet_count",
    "margin_analysis_tax_rate", "margin_analysis_bond_rate",
    "topline_cost_total", "topline_selling_total", "topline_margin_pct",
  ];
  const summaryRows = [csvRow(summaryHeaders)];
  for (const s of allSummaries) {
    summaryRows.push(csvRow(summaryHeaders.map(h => s[h] ?? "")));
  }
  const summaryPath = join(OUT_DIR, "master_project_summary.csv");
  writeFileSync(summaryPath, summaryRows.join("\n") + "\n");
  console.log(`\nWrote ${summaryPath} (${allSummaries.length} rows)`);

  // ======= Write master_display_points.csv =======
  const displayHeaders = [
    "file_path", "sheet_source", "display_name", "vendor", "product",
    "pitch_mm", "height_ft", "width_ft", "qty", "total_sqft",
    "cost_per_sqft", "display_cost", "spare_parts_cost", "processor_cost", "shipping_cost",
    "total_cost", "margin_pct", "selling_price", "derived_margin_pct",
  ];
  const displayRows = [csvRow(displayHeaders)];
  for (const d of allDisplayPoints) {
    displayRows.push(csvRow(displayHeaders.map(h => d[h] ?? "")));
  }
  const displayPath = join(OUT_DIR, "master_display_points.csv");
  writeFileSync(displayPath, displayRows.join("\n") + "\n");
  console.log(`Wrote ${displayPath} (${allDisplayPoints.length} rows)`);

  // ======= Write findings.json =======
  const findingsPath = join(OUT_DIR, "findings.json");
  writeFileSync(findingsPath, JSON.stringify(allFindings, null, 2));
  console.log(`Wrote ${findingsPath}`);

  // ======= Print summary to stdout =======
  console.log("\n" + "=".repeat(80));
  console.log("EXTRACTION COMPLETE");
  console.log("=".repeat(80));

  // Aggregate rate findings
  const allRates = {};
  for (const f of allFindings) {
    if (!f.rate_inferences) continue;
    for (const [key, arr] of Object.entries(f.rate_inferences)) {
      if (!allRates[key]) allRates[key] = [];
      allRates[key].push(...arr.map(a => ({ ...a, project: f.project_name })));
    }
  }

  console.log("\n--- TOP RATE DISCOVERIES ---");
  for (const [key, arr] of Object.entries(allRates)) {
    if (arr.length === 0) continue;
    console.log(`\n  ${key} (${arr.length} hits):`);
    // Deduplicate by rule
    const byRule = {};
    for (const a of arr) {
      const k = a.rule || a.formula;
      if (!byRule[k]) byRule[k] = [];
      byRule[k].push(a);
    }
    for (const [rule, items] of Object.entries(byRule)) {
      const projects = [...new Set(items.map(i => i.project))].join(", ");
      console.log(`    ${rule}: ${items.length} hits in [${projects}]`);
    }
  }

  // Sub bid consistency check
  console.log("\n--- SUB BID STRUCTURE ---");
  for (const f of allFindings) {
    if (!f.sub_bid_structure || f.sub_bid_structure.length === 0) continue;
    console.log(`  ${f.project_name}:`);
    for (const s of f.sub_bid_structure) {
      console.log(`    ${s.sheet}: subBids=${s.hasSubBidColumns} margins=${JSON.stringify(s.marginValues)} sections=[${s.sections.join("; ")}]`);
    }
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
