/**
 * FORM Sheet Parser — extracts per-display technical specs from the ANC "Form" tab.
 *
 * The FORM sheet layout:
 *   Column A = field labels (Manufacturer, Model, Pixel Pitch, etc.)
 *   Columns B..N = one column per display (up to 50+)
 *
 * This parser auto-detects the display count from the "Display Name (Use)" row,
 * scanning ALL non-empty columns (not just contiguous ones), then extracts every
 * known field for each display by row label matching.
 */

import * as xlsx from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DisplaySpec {
  index: number;
  displayName: string;
  manufacturer: string;
  model: string;
  pixelPitch: number | null;
  virtualPixelPitch: string;
  panelResolutionW: number | null;
  panelResolutionH: number | null;
  specWidthFt: number | null;
  specHeightFt: number | null;
  specResolutionW: number | null;
  specResolutionH: number | null;
  actualWidthFt: number | null;
  actualHeightFt: number | null;
  totalResolutionW: number | null;
  totalResolutionH: number | null;
  areaSqFt: number | null;
  numberOfScreens: number | null;
  panelWeightLbs: number | null;
  totalWeightLbs: number | null;
  maxPowerW: number | null;
  typicalPowerW: number | null;
  brightnessNits: number | null;
  indoorOutdoor: string;
  panelSizeW_mm: number | null;
  panelSizeH_mm: number | null;
  shippingMethod: string;
  configRef: string;
  additionalNotes: string;
  // Manual fields — never in Excel, must be entered by user
  colorTemperatureK: string;
  brightnessAdjustment: string;
  gradationMethod: string;
  tonalGradation: string;
  colorTempAdjustability: string;
  voltageService: string;
  ventilationRequirements: string;
  ledLampModel: string;
  smdLedModel: string;
  // Derived / calculated — never from Excel
  pixelDensityPerSqFt: number | null;
}

/**
 * Fields that are NEVER present in the Excel FORM sheet.
 * These must be filled manually by the user.
 * Used by the UI to highlight missing fields yellow.
 */
export const MANUAL_ONLY_FIELDS: ReadonlyArray<keyof DisplaySpec> = [
  "colorTemperatureK",
  "brightnessAdjustment",
  "gradationMethod",
  "tonalGradation",
  "colorTempAdjustability",
  "voltageService",
  "ventilationRequirements",
  "ledLampModel",
  "smdLedModel",
] as const;

/**
 * Returns a stable grouping key for a display based on manufacturer + model.
 * Used to group displays so one input fills all displays sharing the same model.
 */
export function getModelKey(d: Pick<DisplaySpec, "manufacturer" | "model">): string {
  const mfr = (d.manufacturer || "Unknown").trim().toLowerCase();
  const mdl = (d.model || "Unknown").trim().toLowerCase();
  return `${mfr}|${mdl}`;
}

export interface FormSheetResult {
  projectName: string;
  venueName: string;
  clientName: string;
  clientAddress: string;
  displays: DisplaySpec[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Row label patterns — maps normalized labels to DisplaySpec field names
// ---------------------------------------------------------------------------

interface FieldRule {
  field: keyof DisplaySpec;
  type: "string" | "number";
}

const LABEL_MAP: [RegExp, FieldRule][] = [
  // Display identity
  [/display\s*name/i,                                          { field: "displayName",      type: "string" }],
  [/^manufacturer/i,                                           { field: "manufacturer",     type: "string" }],
  [/^model\b/i,                                                { field: "model",            type: "string" }],

  // Pixel pitch
  [/physical\s*pixel\s*pitch/i,                                { field: "pixelPitch",       type: "number" }],
  [/virtual\s*pixel\s*pitch/i,                                 { field: "virtualPixelPitch",type: "string" }],

  // Panel resolution
  [/panel\s*res(?:olution)?\s*[\(\[]?\s*w(?:idth)?\s*[\)\]]?/i,{ field: "panelResolutionW", type: "number" }],
  [/panel\s*res(?:olution)?\s*[\(\[]?\s*h(?:eight)?\s*[\)\]]?/i,{ field: "panelResolutionH",type: "number" }],

  // Spec (design) dimensions
  [/spec(?:ified)?\s*(?:display\s*)?width/i,                   { field: "specWidthFt",      type: "number" }],
  [/spec(?:ified)?\s*(?:display\s*)?height/i,                  { field: "specHeightFt",     type: "number" }],
  [/spec(?:ified)?\s*res(?:olution)?\s*[\(\[]?\s*w(?:idth)?\s*[\)\]]?/i, { field: "specResolutionW", type: "number" }],
  [/spec(?:ified)?\s*res(?:olution)?\s*[\(\[]?\s*h(?:eight)?\s*[\)\]]?/i,{ field: "specResolutionH", type: "number" }],

  // Actual / total physical dimensions
  [/(?:actual|physical|total)\s*(?:display\s*)?width/i,        { field: "actualWidthFt",    type: "number" }],
  [/(?:actual|physical|total)\s*(?:display\s*)?height/i,       { field: "actualHeightFt",   type: "number" }],

  // Total resolution (whole display, not per-panel)
  [/total\s*res(?:olution)?\s*[\(\[]?\s*w(?:idth)?\s*[\)\]]?/i,{ field: "totalResolutionW", type: "number" }],
  [/total\s*res(?:olution)?\s*[\(\[]?\s*h(?:eight)?\s*[\)\]]?/i,{ field: "totalResolutionH", type: "number" }],

  // Area & screen count
  [/area\s*per\s*screen/i,                                     { field: "areaSqFt",         type: "number" }],
  [/number\s*of\s*screens?/i,                                  { field: "numberOfScreens",  type: "number" }],
  [/qty|quantity/i,                                            { field: "numberOfScreens",  type: "number" }],

  // Weight
  [/panel\s*weight\s*per\s*screen/i,                           { field: "panelWeightLbs",   type: "number" }],
  [/(?:total|display)\s*(?:assembly\s*)?weight/i,              { field: "totalWeightLbs",   type: "number" }],

  // Power — max
  [/max(?:imum)?\s*power\s*(?:consumption\s*)?per\s*screen/i,  { field: "maxPowerW",        type: "number" }],
  [/total\s*max(?:imum)?\s*power/i,                            { field: "maxPowerW",        type: "number" }],
  [/max(?:imum)?\s*power\s*(?:consumption)?(?:\s*\(entire|\s*total)?/i, { field: "maxPowerW", type: "number" }],

  // Power — typical
  [/typical\s*power\s*(?:consumption\s*)?per\s*screen/i,       { field: "typicalPowerW",    type: "number" }],
  [/total\s*typical\s*power/i,                                 { field: "typicalPowerW",    type: "number" }],
  [/typical\s*power\s*(?:consumption)?(?:\s*\(entire|\s*total)?/i, { field: "typicalPowerW", type: "number" }],

  // Brightness
  [/max(?:imum)?\.?\s*brightness/i,                            { field: "brightnessNits",   type: "number" }],
  [/brightness\s*(?:after\s*calibration|nits|level)?/i,        { field: "brightnessNits",   type: "number" }],

  // Indoor/outdoor
  [/indoor\s*[\/\\]?\s*outdoor/i,                              { field: "indoorOutdoor",    type: "string" }],

  // Panel physical size
  [/standard\s*panel\s*size.*width/i,                          { field: "panelSizeW_mm",    type: "number" }],
  [/standard\s*panel\s*size.*height/i,                         { field: "panelSizeH_mm",    type: "number" }],
  [/panel\s*size.*[\(\[]?\s*w(?:idth)?\s*[\)\]]?/i,            { field: "panelSizeW_mm",    type: "number" }],
  [/panel\s*size.*[\(\[]?\s*h(?:eight)?\s*[\)\]]?/i,           { field: "panelSizeH_mm",    type: "number" }],

  // Shipping
  [/anticipated\s*shipping|shipping\s*method/i,                { field: "shippingMethod",   type: "string" }],

  // Config ref / notes
  [/refer\s*to\s*config/i,                                     { field: "configRef",        type: "string" }],
  [/additional\s*notes/i,                                      { field: "additionalNotes",  type: "string" }],
];

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function resolveValue(cell: any): any {
  if (cell == null || cell === "") return "";
  if (typeof cell === "object" && cell.result !== undefined) return cell.result;
  if (typeof cell === "object" && cell.v !== undefined) return cell.v;
  return cell;
}

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().split("T")[0];
  return String(v).trim();
}

function emptyDisplaySpec(index: number): DisplaySpec {
  return {
    index,
    displayName: "",
    manufacturer: "",
    model: "",
    pixelPitch: null,
    virtualPixelPitch: "",
    panelResolutionW: null,
    panelResolutionH: null,
    specWidthFt: null,
    specHeightFt: null,
    specResolutionW: null,
    specResolutionH: null,
    actualWidthFt: null,
    actualHeightFt: null,
    totalResolutionW: null,
    totalResolutionH: null,
    areaSqFt: null,
    numberOfScreens: null,
    panelWeightLbs: null,
    totalWeightLbs: null,
    maxPowerW: null,
    typicalPowerW: null,
    brightnessNits: null,
    indoorOutdoor: "",
    panelSizeW_mm: null,
    panelSizeH_mm: null,
    shippingMethod: "",
    configRef: "",
    additionalNotes: "",
    colorTemperatureK: "",
    brightnessAdjustment: "",
    gradationMethod: "",
    tonalGradation: "",
    colorTempAdjustability: "",
    voltageService: "",
    ventilationRequirements: "",
    ledLampModel: "",
    smdLedModel: "",
    pixelDensityPerSqFt: null,
  };
}

/**
 * Find the "Form" sheet in a workbook (fuzzy match).
 */
export function findFormSheet(workbook: xlsx.WorkBook): string | null {
  const names = workbook.SheetNames;
  const exact = names.find((n) => /^form$/i.test(n.trim()));
  if (exact) return exact;
  const fuzzy = names.find((n) => /\bform\b/i.test(n));
  return fuzzy ?? null;
}

/**
 * Parse the FORM sheet and extract per-display specs.
 */
export function parseFormSheet(workbook: xlsx.WorkBook): FormSheetResult {
  const warnings: string[] = [];
  const sheetName = findFormSheet(workbook);
  if (!sheetName) {
    return { projectName: "", venueName: "", clientName: "", clientAddress: "", displays: [], warnings: ["No 'Form' sheet found in workbook"] };
  }

  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });

  // ── Extract header metadata from top rows ──────────────────────────────────
  // FORM sheets typically have project/venue/client/address in the first ~15 rows.
  // Patterns vary across RFPs, so we use multiple heuristics.
  // IMPORTANT: Skip metadata rows (summary list, author, created by, etc.)
  let projectName = "";
  let venueName = "";
  let clientName = "";
  let clientAddress = "";

  // Rows that look like metadata/authorship — skip entirely
  const SKIP_ROW = /\b(summary\s*list|created\s*by|prepared\s*by|author|revision|date|version|page\s+\d|copyright|confidential|draft)\b/i;

  const headerRows = Math.min(data.length, 20);
  for (let i = 0; i < headerRows; i++) {
    const colA = toStr(data[i]?.[0]);
    const colB = toStr(data[i]?.[1]);
    const colALower = colA.toLowerCase();

    // Skip metadata/authorship rows completely
    if (SKIP_ROW.test(colA)) continue;

    // Project / Venue name — strict: "Project:" or "Project Name:" label (not "Project Summary List")
    if (!projectName && /^project\s*(name)?[:\s]/i.test(colA) && !/summary|list|manager|lead|engineer/i.test(colA)) {
      projectName = colB || colA.replace(/^project\s*(name)?[:\s]*/i, "").trim();
    }

    // Venue name — explicit "Venue:" or "Stadium:" or "Arena:" label
    if (!venueName && /^(venue|stadium|arena|facility)[:\s]/i.test(colA)) {
      venueName = colB || colA.replace(/^(venue|stadium|arena|facility)[:\s]*/i, "").trim();
    }

    // Client name — "Client:" or "Owner:" or "Team:" label, or detect LLC/Inc/Ltd patterns
    if (!clientName && /^(client|owner|team)[:\s]/i.test(colA)) {
      clientName = colB || colA.replace(/^(client|owner|team)[:\s]*/i, "").trim();
    }
    if (!clientName && colB && /\b(LLC|Inc\.?|Ltd\.?|Corporation|Corp\.?|Enterprises)\b/i.test(colB) && !SKIP_ROW.test(colB)) {
      clientName = colB;
    }
    if (!clientName && /\b(LLC|Inc\.?|Ltd\.?|Corporation|Corp\.?|Enterprises)\b/i.test(colA) && !colALower.includes("display") && !SKIP_ROW.test(colA)) {
      clientName = colA;
    }

    // Address — "Address:" label or detect street address pattern
    if (!clientAddress && /^address[:\s]/i.test(colA)) {
      clientAddress = colB || colA.replace(/^address[:\s]*/i, "").trim();
    }
    if (!clientAddress && /\d+\s+\w+.*\b(drive|dr|street|st|avenue|ave|boulevard|blvd|road|rd|way|lane|ln|place|pl|field)\b/i.test(colA)) {
      clientAddress = colA;
    }
    if (!clientAddress && colB && /\d+\s+\w+.*\b(drive|dr|street|st|avenue|ave|boulevard|blvd|road|rd|way|lane|ln|place|pl|field)\b/i.test(colB)) {
      clientAddress = colB;
    }
  }

  // If no explicit venue found, use project name as venue (only if it's a real name, not metadata)
  if (!venueName && projectName && !SKIP_ROW.test(projectName)) {
    venueName = projectName;
  }

  console.log(`[FORM PARSER] Header: venue="${venueName}" client="${clientName}" addr="${clientAddress}" project="${projectName}"`);

  // Find the "Display Name (Use)" row to detect display columns
  // We scan ALL non-empty columns (not just contiguous) to handle 5–50+ displays
  let displayNameRowIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const label = toStr(data[i]?.[0]).toLowerCase();
    if (label.includes("display name")) {
      displayNameRowIdx = i;
      break;
    }
  }

  if (displayNameRowIdx === -1) {
    return { projectName, displays: [], warnings: ["Could not find 'Display Name' row in Form sheet"] };
  }

  // Collect the column indices of every non-empty cell in the display name row
  // (columns B onward, i.e. index 1+). This handles sparse layouts and any column count.
  const nameRow = data[displayNameRowIdx];
  const displayColIndices: number[] = [];
  for (let col = 1; col < nameRow.length; col++) {
    if (toStr(nameRow[col]).length > 0) {
      displayColIndices.push(col);
    }
  }

  if (displayColIndices.length === 0) {
    return { projectName, displays: [], warnings: ["No display columns found in Form sheet"] };
  }

  const displayCount = displayColIndices.length;
  console.log(`[FORM PARSER] Found ${displayCount} displays in "${sheetName}" (cols: ${displayColIndices.join(",")})`);

  // Initialize display specs
  const displays: DisplaySpec[] = [];
  for (let d = 0; d < displayCount; d++) {
    displays.push(emptyDisplaySpec(d));
  }

  // Walk every row and extract matching fields
  // Use displayColIndices so we read the exact columns where displays live
  for (let i = 0; i < data.length; i++) {
    const row = data[i] || [];
    const rawLabel = toStr(row[0]);
    if (!rawLabel) continue;

    for (const [pattern, rule] of LABEL_MAP) {
      if (pattern.test(rawLabel)) {
        for (let d = 0; d < displayCount; d++) {
          const colIdx = displayColIndices[d];
          const raw = resolveValue(row[colIdx]);
          if (rule.type === "number") {
            const num = toNum(raw);
            if (num !== null) {
              (displays[d] as any)[rule.field] = num;
            }
          } else {
            const str = toStr(raw);
            if (str) {
              (displays[d] as any)[rule.field] = str;
            }
          }
        }
        break;
      }
    }
  }

  // Calculate derived fields
  for (const d of displays) {
    if (d.totalResolutionW && d.totalResolutionH && d.areaSqFt && d.areaSqFt > 0) {
      d.pixelDensityPerSqFt = Math.round((d.totalResolutionW * d.totalResolutionH) / d.areaSqFt);
    }
  }

  // Validate — warn about displays with missing critical fields
  for (const d of displays) {
    const missing: string[] = [];
    if (!d.displayName) missing.push("displayName");
    if (!d.manufacturer) missing.push("manufacturer");
    if (!d.model) missing.push("model");
    if (d.pixelPitch === null) missing.push("pixelPitch");
    if (missing.length > 0) {
      warnings.push(`Display ${d.index + 1}: missing ${missing.join(", ")}`);
    }
  }

  console.log(`[FORM PARSER] Extracted ${displays.length} displays, ${warnings.length} warnings`);
  return { projectName, venueName, clientName, clientAddress, displays, warnings };
}
