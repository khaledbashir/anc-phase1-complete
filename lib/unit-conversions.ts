/**
 * Unit Conversion Utilities
 * Metric <-> Imperial conversions for LED display specifications
 * 
 * Core conversions used in Vendor Ingestion Parser:
 * - Millimeters <-> Feet
 * - Kilograms <-> Pounds
 * - Watts <-> BTU/hr (heat load)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const KG_PER_LB = 0.453592;
export const LB_PER_KG = 2.20462;
export const WATTS_PER_BTU_PER_HOUR = 0.293071; // 1 BTU/hr = 0.293071 Watts
export const BTU_PER_WATT_HOUR = 3.41214; // 1 Watt = 3.41214 BTU/hr

// ============================================================================
// LENGTH CONVERSIONS
// ============================================================================

/**
 * Convert millimeters to feet
 * @param mm - Length in millimeters
 * @returns Length in feet (decimal)
 */
export function mmToFeet(mm: number): number {
  if (!Number.isFinite(mm) || mm < 0) return 0;
  return mm / MM_PER_FOOT;
}

/**
 * Convert feet to millimeters
 * @param feet - Length in feet
 * @returns Length in millimeters
 */
export function feetToMm(feet: number): number {
  if (!Number.isFinite(feet) || feet < 0) return 0;
  return feet * MM_PER_FOOT;
}

/**
 * Convert millimeters to inches
 * @param mm - Length in millimeters
 * @returns Length in inches (decimal)
 */
export function mmToInches(mm: number): number {
  if (!Number.isFinite(mm) || mm < 0) return 0;
  return mm / MM_PER_INCH;
}

/**
 * Convert inches to millimeters
 * @param inches - Length in inches
 * @returns Length in millimeters
 */
export function inchesToMm(inches: number): number {
  if (!Number.isFinite(inches) || inches < 0) return 0;
  return inches * MM_PER_INCH;
}

/**
 * Convert feet and inches to total inches
 * @param feet - Feet component
 * @param inches - Inches component
 * @returns Total inches
 */
export function feetInchesToTotalInches(feet: number, inches: number): number {
  return (feet * 12) + inches;
}

/**
 * Convert total inches to feet and inches
 * @param totalInches - Total inches
 * @returns Object with feet and remaining inches
 */
export function totalInchesToFeetInches(totalInches: number): { feet: number; inches: number } {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

// ============================================================================
// WEIGHT CONVERSIONS
// ============================================================================

/**
 * Convert kilograms to pounds
 * @param kg - Weight in kilograms
 * @returns Weight in pounds
 */
export function kgToLbs(kg: number): number {
  if (!Number.isFinite(kg) || kg < 0) return 0;
  return kg * LB_PER_KG;
}

/**
 * Convert pounds to kilograms
 * @param lbs - Weight in pounds
 * @returns Weight in kilograms
 */
export function lbsToKg(lbs: number): number {
  if (!Number.isFinite(lbs) || lbs < 0) return 0;
  return lbs * KG_PER_LB;
}

// ============================================================================
// POWER & HEAT CONVERSIONS
// ============================================================================

/**
 * Convert watts to BTU per hour (heat load)
 * @param watts - Power in watts
 * @returns Heat output in BTU/hr
 */
export function wattsToBTU(watts: number): number {
  if (!Number.isFinite(watts) || watts < 0) return 0;
  return watts * BTU_PER_WATT_HOUR;
}

/**
 * Convert BTU per hour to watts
 * @param btu - Heat in BTU/hr
 * @returns Power in watts
 */
export function btuToWatts(btu: number): number {
  if (!Number.isFinite(btu) || btu < 0) return 0;
  return btu * WATTS_PER_BTU_PER_HOUR;
}

// ============================================================================
// PIXEL DENSITY CALCULATIONS
// ============================================================================

/**
 * Calculate pixels per square foot (PPF) from pixel pitch
 * @param pitchMm - Pixel pitch in millimeters
 * @returns Pixels per square foot
 */
export function pitchToPPF(pitchMm: number): number {
  if (!Number.isFinite(pitchMm) || pitchMm <= 0) return 0;
  // PPF = (304.8 / pitch)^2 (pixels per sq ft)
  const ppf = Math.pow(MM_PER_FOOT / pitchMm, 2);
  return Math.round(ppf);
}

/**
 * Calculate pixels per square meter (PPM) from pixel pitch
 * @param pitchMm - Pixel pitch in millimeters
 * @returns Pixels per square meter
 */
export function pitchToPPM(pitchMm: number): number {
  if (!Number.isFinite(pitchMm) || pitchMm <= 0) return 0;
  // PPM = (1000 / pitch)^2
  const ppm = Math.pow(1000 / pitchMm, 2);
  return Math.round(ppm);
}

// ============================================================================
// RESOLUTION CALCULATIONS
// ============================================================================

/**
 * Calculate resolution (pixels) from dimensions and pitch
 * @param dimensionMm - Width or height in millimeters
 * @param pitchMm - Pixel pitch in millimeters
 * @returns Number of pixels
 */
export function dimensionToPixels(dimensionMm: number, pitchMm: number): number {
  if (!Number.isFinite(dimensionMm) || !Number.isFinite(pitchMm)) return 0;
  if (pitchMm <= 0) return 0;
  return Math.round(dimensionMm / pitchMm);
}

/**
 * Calculate total pixel count from resolution
 * @param widthPx - Width in pixels
 * @param heightPx - Height in pixels
 * @returns Total pixel count
 */
export function totalPixels(widthPx: number, heightPx: number): number {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx)) return 0;
  if (widthPx <= 0 || heightPx <= 0) return 0;
  return widthPx * heightPx;
}

// ============================================================================
// POWER DENSITY CALCULATIONS
// ============================================================================

/**
 * Calculate power density (watts per square foot)
 * @param totalWatts - Total power in watts
 * @param widthFt - Width in feet
 * @param heightFt - Height in feet
 * @returns Power density in watts per square foot
 */
export function powerDensity(totalWatts: number, widthFt: number, heightFt: number): number {
  const areaSqFt = widthFt * heightFt;
  if (areaSqFt <= 0) return 0;
  return totalWatts / areaSqFt;
}

/**
 * Calculate watts per cabinet from system total
 * @param systemTotalWatts - Total watts for entire display
 * @param cabinetCount - Number of cabinets
 * @returns Watts per cabinet
 */
export function wattsPerCabinet(systemTotalWatts: number, cabinetCount: number): number {
  if (cabinetCount <= 0) return 0;
  return systemTotalWatts / cabinetCount;
}

// ============================================================================
// DISPLAY DIMENSION CALCULATIONS (CLOSEST FIT)
// ============================================================================

/**
 * Calculate cabinet matrix for target dimensions
 * Returns the closest configuration to target dimensions using available cabinet sizes
 */
export interface CabinetMatrixResult {
  cols: number;
  rows: number;
  totalCabinets: number;
  actualWidthMm: number;
  actualHeightMm: number;
  actualWidthFt: number;
  actualHeightFt: number;
  targetWidthMm: number;
  targetHeightMm: number;
  deltaWidthInches: number;
  deltaHeightInches: number;
  fitScore: number; // 0-100, higher is better
}

/**
 * Calculate the closest cabinet matrix fit for target dimensions
 * @param targetWidthMm - Target width in millimeters
 * @param targetHeightMm - Target height in millimeters
 * @param cabinetWidthMm - Cabinet width in millimeters
 * @param cabinetHeightMm - Cabinet height in millimeters
 * @returns Cabinet matrix result with deltas
 */
export function calculateClosestFit(
  targetWidthMm: number,
  targetHeightMm: number,
  cabinetWidthMm: number,
  cabinetHeightMm: number
): CabinetMatrixResult {
  const cols = Math.max(1, Math.round(targetWidthMm / cabinetWidthMm));
  const rows = Math.max(1, Math.round(targetHeightMm / cabinetHeightMm));
  
  const actualWidthMm = cols * cabinetWidthMm;
  const actualHeightMm = rows * cabinetHeightMm;
  
  const actualWidthFt = mmToFeet(actualWidthMm);
  const actualHeightFt = mmToFeet(actualHeightMm);
  
  const targetWidthFt = mmToFeet(targetWidthMm);
  const targetHeightFt = mmToFeet(targetHeightMm);
  
  // Calculate delta in inches
  const deltaWidthInches = (actualWidthFt - targetWidthFt) * 12;
  const deltaHeightInches = (actualHeightFt - targetHeightFt) * 12;
  
  // Calculate fit score (how close actual is to target)
  const widthRatio = Math.min(actualWidthMm, targetWidthMm) / Math.max(actualWidthMm, targetWidthMm);
  const heightRatio = Math.min(actualHeightMm, targetHeightMm) / Math.max(actualHeightMm, targetHeightMm);
  const fitScore = Math.round((widthRatio * heightRatio) * 100);
  
  return {
    cols,
    rows,
    totalCabinets: cols * rows,
    actualWidthMm,
    actualHeightMm,
    actualWidthFt,
    actualHeightFt,
    targetWidthMm,
    targetHeightMm,
    deltaWidthInches,
    deltaHeightInches,
    fitScore
  };
}

/**
 * Check if dimension delta is significant (>2 inches)
 * Used to flag warnings for client notification
 */
export function isSignificantDelta(deltaInches: number, thresholdInches: number = 2): boolean {
  return Math.abs(deltaInches) > thresholdInches;
}

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Format dimension with both metric and imperial units
 */
export function formatDualDimension(mm: number): string {
  const ft = mmToFeet(mm);
  const wholeFeet = Math.floor(ft);
  const inches = (ft - wholeFeet) * 12;
  return `${ft.toFixed(2)} ft (${mm.toFixed(0)} mm / ${wholeFeet}'${inches.toFixed(1)}")`;
}

/**
 * Format weight with both metric and imperial
 */
export function formatDualWeight(kg: number): string {
  const lbs = kgToLbs(kg);
  return `${lbs.toFixed(1)} lbs (${kg.toFixed(1)} kg)`;
}

/**
 * Format power with watts and BTU
 */
export function formatPowerAndHeat(watts: number): string {
  const btu = wattsToBTU(watts);
  return `${watts}W / ${btu.toFixed(0)} BTU/hr`;
}
