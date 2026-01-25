/**
 * ANC Estimator Logic
 * Calculates screen pricing based on dimensions, pixel pitch, and environment
 */

export interface ScreenPriceBreakdown {
  led: number;
  structure: number;
  install: number;
  power: number;
  total: number;
}

/**
 * Calculate screen price based on dimensions, pitch, and environment
 * @param width Screen width in meters
 * @param height Screen height in meters
 * @param pitch Pixel pitch in mm
 * @param isOutdoor Whether the screen is for outdoor use
 * @returns Price breakdown for LED, Structure, Install, and Power
 */
export function calculateScreenPrice(
  width: number,
  height: number,
  pitch: number,
  isOutdoor: boolean = false
): ScreenPriceBreakdown {
  // LED Cost calculation
  // Formula: (Width * Height) * (isOutdoor ? 150 : 80)
  // Price per square meter: $150 for outdoor, $80 for indoor
  const area = width * height;
  const pricePerSquareMeter = isOutdoor ? 150 : 80;
  const ledCost = area * pricePerSquareMeter;

  // Structure Cost: 20% of LED cost
  const structureCost = ledCost * 0.20;

  // Install Cost: Flat fee of $5000
  const installCost = 5000;

  // Power Cost: 15% of LED cost
  const powerCost = ledCost * 0.15;

  const total = ledCost + structureCost + installCost + powerCost;

  return {
    led: Math.round(ledCost),
    structure: Math.round(structureCost),
    install: Math.round(installCost),
    power: Math.round(powerCost),
    total: Math.round(total),
  };
}

/**
 * Calculate multiple screens in a proposal
 * @param screens Array of screen configurations
 * @returns Total breakdown across all screens
 */
export function calculateProposalTotal(
  screens: Array<{
    width: number;
    height: number;
    pitch: number;
    isOutdoor: boolean;
  }>
): ScreenPriceBreakdown {
  const totals: ScreenPriceBreakdown = {
    led: 0,
    structure: 0,
    install: 0,
    power: 0,
    total: 0,
  };

  screens.forEach((screen) => {
    const breakdown = calculateScreenPrice(
      screen.width,
      screen.height,
      screen.pitch,
      screen.isOutdoor
    );
    totals.led += breakdown.led;
    totals.structure += breakdown.structure;
    totals.install += breakdown.install;
    totals.power += breakdown.power;
    totals.total += breakdown.total;
  });

  return totals;
}
