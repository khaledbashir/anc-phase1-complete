/**
 * Visual Cut-Sheet Automator — Generates per-display spec sheets.
 *
 * Takes display configuration and calculation data, produces a structured
 * cut-sheet with:
 * - Product/display specs (dimensions, pitch, resolution, environment)
 * - Cabinet layout grid (cols × rows, actual vs requested dims)
 * - Power & weight breakdown
 * - Installation notes (complexity, service access, data run)
 * - ANC branding + metadata
 *
 * Output is a data structure that can be rendered as HTML (for PDF) or
 * exported as a formatted text document.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CutSheetDisplay {
  displayName: string;
  displayType: string;
  locationType: string;
  serviceType: string;
  isIndoor: boolean;
  isReplacement: boolean;

  // Dimensions
  requestedWidthFt: number;
  requestedHeightFt: number;
  requestedAreaSqFt: number;
  actualWidthFt?: number;
  actualHeightFt?: number;
  actualAreaSqFt?: number;

  // LED specs
  pixelPitch: string;
  productName?: string;
  manufacturer?: string;
  resolutionW: number;
  resolutionH: number;
  totalPixels: number;
  brightness?: string;

  // Cabinet layout
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  columnsCount?: number;
  rowsCount?: number;
  totalCabinets?: number;

  // Power
  maxPowerW?: number;
  typicalPowerW?: number;
  heatLoadBtu?: number;
  /** Estimated amps at 120V */
  estimatedAmps120?: number;
  /** Estimated amps at 208V */
  estimatedAmps208?: number;

  // Weight
  totalWeightLbs?: number;
  totalWeightKg?: number;
  weightPerSqFt?: number;

  // Installation
  installComplexity: string;
  dataRunDistance: string;
  liftType: string;

  // Pricing (optional — may be hidden for client-facing sheets)
  hardwareCost?: number;
  totalCost?: number;
  sellPrice?: number;
}

export interface CutSheetDocument {
  projectName: string;
  clientName: string;
  location: string;
  preparedBy: string;
  date: string;
  displays: CutSheetDisplay[];
  /** ANC standard notes */
  notes: string[];
}

// ============================================================================
// BUILDER
// ============================================================================

export interface CutSheetInput {
  projectName: string;
  clientName: string;
  location: string;
  displays: DisplayInput[];
}

export interface DisplayInput {
  displayName: string;
  displayType: string;
  locationType: string;
  serviceType: string;
  isIndoor: boolean;
  isReplacement: boolean;
  widthFt: number;
  heightFt: number;
  pixelPitch: string;
  productName?: string;
  manufacturer?: string;
  installComplexity: string;
  dataRunDistance: string;
  liftType: string;
  // ScreenCalc values (pre-calculated by EstimatorBridge)
  areaSqFt?: number;
  resolutionW?: number;
  resolutionH?: number;
  totalPixels?: number;
  hardwareCost?: number;
  totalCost?: number;
  sellPrice?: number;
  // CabinetLayout values
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  columnsCount?: number;
  rowsCount?: number;
  totalCabinets?: number;
  actualWidthFt?: number;
  actualHeightFt?: number;
  actualAreaSqFt?: number;
  totalWeightLbs?: number;
  totalWeightKg?: number;
  maxPowerW?: number;
  typicalPowerW?: number;
  heatLoadBtu?: number;
}

export function generateCutSheets(input: CutSheetInput): CutSheetDocument {
  const displays: CutSheetDisplay[] = input.displays.map((d) => {
    const area = d.areaSqFt || d.widthFt * d.heightFt;
    const pitch = parseFloat(d.pixelPitch) || 4;
    const resW = d.resolutionW || Math.round((d.widthFt * 304.8) / pitch);
    const resH = d.resolutionH || Math.round((d.heightFt * 304.8) / pitch);

    // Power estimates (fallback if no cabinet data)
    const maxPower = d.maxPowerW || estimatePower(area, pitch);
    const typPower = d.typicalPowerW || Math.round(maxPower * 0.6);

    // Weight estimate (fallback: ~4.5 lbs/sqft for indoor, ~6 lbs/sqft outdoor)
    const weightLbs = d.totalWeightLbs || Math.round(area * (d.isIndoor ? 4.5 : 6));
    const weightKg = d.totalWeightKg || Math.round(weightLbs / 2.20462);

    return {
      displayName: d.displayName || `Display ${input.displays.indexOf(d) + 1}`,
      displayType: d.displayType,
      locationType: d.locationType,
      serviceType: d.serviceType,
      isIndoor: d.isIndoor,
      isReplacement: d.isReplacement,

      requestedWidthFt: d.widthFt,
      requestedHeightFt: d.heightFt,
      requestedAreaSqFt: area,
      actualWidthFt: d.actualWidthFt,
      actualHeightFt: d.actualHeightFt,
      actualAreaSqFt: d.actualAreaSqFt,

      pixelPitch: d.pixelPitch,
      productName: d.productName,
      manufacturer: d.manufacturer,
      resolutionW: resW,
      resolutionH: resH,
      totalPixels: d.totalPixels || resW * resH,
      brightness: d.isIndoor ? "800-1,200 nits (indoor)" : "5,000-7,000 nits (outdoor)",

      cabinetWidthMm: d.cabinetWidthMm,
      cabinetHeightMm: d.cabinetHeightMm,
      columnsCount: d.columnsCount,
      rowsCount: d.rowsCount,
      totalCabinets: d.totalCabinets,

      maxPowerW: maxPower,
      typicalPowerW: typPower,
      heatLoadBtu: d.heatLoadBtu || Math.round(maxPower * 3.412),
      estimatedAmps120: Math.round((maxPower / 120) * 10) / 10,
      estimatedAmps208: Math.round((maxPower / 208) * 10) / 10,

      totalWeightLbs: weightLbs,
      totalWeightKg: weightKg,
      weightPerSqFt: area > 0 ? Math.round((weightLbs / area) * 10) / 10 : 0,

      installComplexity: d.installComplexity,
      dataRunDistance: d.dataRunDistance,
      liftType: d.liftType,

      hardwareCost: d.hardwareCost,
      totalCost: d.totalCost,
      sellPrice: d.sellPrice,
    };
  });

  return {
    projectName: input.projectName || "Untitled Project",
    clientName: input.clientName || "—",
    location: input.location || "—",
    preparedBy: "ANC Sports Enterprises, LLC",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    displays,
    notes: generateNotes(displays),
  };
}

// ============================================================================
// TEXT EXPORT
// ============================================================================

export function cutSheetToText(doc: CutSheetDocument, displayIndex: number): string {
  const d = doc.displays[displayIndex];
  if (!d) return "";

  const lines: string[] = [];
  const divider = "═".repeat(60);
  const subDivider = "─".repeat(60);

  lines.push(divider);
  lines.push("ANC SPORTS ENTERPRISES — LED DISPLAY CUT SHEET");
  lines.push(divider);
  lines.push("");
  lines.push(`Project:      ${doc.projectName}`);
  lines.push(`Client:       ${doc.clientName}`);
  lines.push(`Location:     ${doc.location}`);
  lines.push(`Date:         ${doc.date}`);
  lines.push(`Prepared By:  ${doc.preparedBy}`);
  lines.push("");
  lines.push(subDivider);
  lines.push(`DISPLAY: ${d.displayName}`);
  lines.push(subDivider);
  lines.push("");

  // Display overview
  lines.push("DISPLAY SPECIFICATIONS");
  lines.push(`  Type:           ${formatDisplayType(d.displayType)}`);
  lines.push(`  Environment:    ${d.isIndoor ? "Indoor" : "Outdoor"}`);
  lines.push(`  Location:       ${formatLocation(d.locationType)}`);
  lines.push(`  Service Access: ${formatServiceAccess(d.serviceType)}`);
  if (d.productName) lines.push(`  Product:        ${d.productName}`);
  if (d.manufacturer) lines.push(`  Manufacturer:   ${d.manufacturer}`);
  lines.push(`  Pixel Pitch:    ${d.pixelPitch}mm`);
  lines.push(`  Brightness:     ${d.brightness || "—"}`);
  lines.push("");

  // Dimensions
  lines.push("DIMENSIONS");
  lines.push(`  Requested:      ${d.requestedWidthFt}' W × ${d.requestedHeightFt}' H (${d.requestedAreaSqFt.toFixed(1)} sq ft)`);
  if (d.actualWidthFt && d.actualHeightFt) {
    lines.push(`  Actual (snap):  ${d.actualWidthFt.toFixed(2)}' W × ${d.actualHeightFt.toFixed(2)}' H (${(d.actualAreaSqFt || 0).toFixed(1)} sq ft)`);
  }
  lines.push(`  Resolution:     ${d.resolutionW.toLocaleString()} × ${d.resolutionH.toLocaleString()} (${d.totalPixels.toLocaleString()} pixels)`);
  lines.push("");

  // Cabinet layout
  if (d.totalCabinets && d.columnsCount && d.rowsCount) {
    lines.push("CABINET LAYOUT");
    lines.push(`  Cabinet Size:   ${d.cabinetWidthMm}mm × ${d.cabinetHeightMm}mm`);
    lines.push(`  Grid:           ${d.columnsCount} cols × ${d.rowsCount} rows`);
    lines.push(`  Total Cabinets: ${d.totalCabinets}`);
    lines.push("");
  }

  // Power
  lines.push("ELECTRICAL");
  lines.push(`  Max Power:      ${((d.maxPowerW || 0) / 1000).toFixed(1)} kW (${d.maxPowerW?.toLocaleString() || "—"} W)`);
  lines.push(`  Typical Power:  ${((d.typicalPowerW || 0) / 1000).toFixed(1)} kW (${d.typicalPowerW?.toLocaleString() || "—"} W)`);
  lines.push(`  Heat Load:      ${d.heatLoadBtu?.toLocaleString() || "—"} BTU/hr`);
  lines.push(`  Est. @ 120V:    ${d.estimatedAmps120 || "—"} A`);
  lines.push(`  Est. @ 208V:    ${d.estimatedAmps208 || "—"} A`);
  lines.push("");

  // Weight
  lines.push("STRUCTURAL");
  lines.push(`  Total Weight:   ${d.totalWeightLbs?.toLocaleString() || "—"} lbs (${d.totalWeightKg?.toLocaleString() || "—"} kg)`);
  lines.push(`  Weight/sq ft:   ${d.weightPerSqFt || "—"} lbs/sq ft`);
  lines.push(`  Install:        ${formatComplexity(d.installComplexity)}`);
  lines.push(`  Data Run:       ${d.dataRunDistance || "—"}`);
  lines.push(`  Lift Type:      ${d.liftType || "—"}`);
  lines.push("");

  // Notes
  if (doc.notes.length > 0) {
    lines.push(subDivider);
    lines.push("NOTES");
    for (const note of doc.notes) {
      lines.push(`  • ${note}`);
    }
    lines.push("");
  }

  lines.push(divider);
  lines.push("ANC Sports Enterprises, LLC");
  lines.push("2 Manhattanville Road, Suite 402, Purchase, NY 10577");
  lines.push(divider);

  return lines.join("\n");
}

// ============================================================================
// HELPERS
// ============================================================================

function estimatePower(areaSqFt: number, pitch: number): number {
  // Power density approximations by pitch (W/m²)
  const densityMap: Record<number, number> = {
    2.5: 390, 3.9: 350, 4: 350, 6: 300, 10: 250,
  };
  const density = densityMap[pitch] || 300;
  const areaM2 = areaSqFt * 0.0929;
  return Math.round(areaM2 * density);
}

function formatDisplayType(t: string): string {
  const map: Record<string, string> = {
    scoreboard: "Scoreboard",
    "center-hung": "Center-Hung Display",
    "end-zone": "End-Zone Display",
    fascia: "Fascia/Ribbon Board",
    marquee: "Marquee Display",
    auxiliary: "Auxiliary Display",
    other: "Other",
  };
  return map[t] || t;
}

function formatLocation(l: string): string {
  const map: Record<string, string> = {
    wall: "Wall-Mounted",
    "free-standing": "Free-Standing",
    "ceiling-hung": "Ceiling-Hung",
    "ground-stack": "Ground Stack",
    roof: "Rooftop",
    other: "Other",
  };
  return map[l] || l;
}

function formatServiceAccess(s: string): string {
  const map: Record<string, string> = {
    "Front/Rear": "Front & Rear Access",
    Top: "Top Access",
    "Front Only": "Front Only",
    "Rear Only": "Rear Only",
  };
  return map[s] || s;
}

function formatComplexity(c: string): string {
  const map: Record<string, string> = {
    simple: "Simple — ground-level, basic mounting",
    standard: "Standard — elevated, standard rigging",
    complex: "Complex — multi-story, custom steel",
    heavy: "Heavy — structural modifications required",
  };
  return map[c] || c;
}

function generateNotes(displays: CutSheetDisplay[]): string[] {
  const notes: string[] = [];
  notes.push("All dimensions are nominal. Actual display size depends on cabinet/module grid.");
  notes.push("Power figures are manufacturer-rated maximums. Typical content draws ~60% of max.");

  const hasOutdoor = displays.some((d) => !d.isIndoor);
  if (hasOutdoor) {
    notes.push("Outdoor displays require IP65-rated cabinets with proper weatherproofing.");
    notes.push("Dedicated 208V/3-phase power circuits recommended for outdoor installations.");
  }

  const hasReplacement = displays.some((d) => d.isReplacement);
  if (hasReplacement) {
    notes.push("Replacement installs include demolition and disposal of existing display system.");
  }

  const hasComplex = displays.some((d) =>
    d.installComplexity === "complex" || d.installComplexity === "heavy"
  );
  if (hasComplex) {
    notes.push("Complex installations require structural engineering review and stamped drawings.");
  }

  notes.push("ANC recommends 2% spare modules for warranty stock. See proposal for details.");
  notes.push("Specifications subject to change. Contact ANC for final engineering submittal.");

  return notes;
}
