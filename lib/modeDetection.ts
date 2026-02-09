/**
 * Mode Detection — Single source of truth for Mirror vs Intelligence mode.
 *
 * Import this EVERYWHERE instead of inline checks.
 * Priority: explicit mirrorMode flag > pricingDocument presence > default.
 */

export function isMirrorMode(details: any, pricingDocument?: any): boolean {
  // Explicit mode selection takes priority
  if (typeof details?.mirrorMode === "boolean") return details.mirrorMode;
  // Fallback: if pricingDocument has tables, it's Mirror Mode
  const pd = pricingDocument ?? details?.pricingDocument;
  if (pd?.tables?.length > 0) return true;
  // Default: null means mode not yet selected (gate should show)
  return false;
}

/**
 * Returns true when the user has NOT yet made a mode selection.
 * Used to show the ModeSelector gate.
 */
export function isModeUnselected(details: any): boolean {
  return typeof details?.mirrorMode !== "boolean";
}
