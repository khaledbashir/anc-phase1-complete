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

/* ======================================================
   ANC Project estimator (from Master Excel Logic)
   - Inputs in feet and mm where applicable
   - Returns per-screen and aggregated line-item breakdown
   ====================================================== */

export type ScreenInput = {
  name: string;
  productType: string;
  heightFt: number; // feet
  widthFt: number; // feet
  quantity?: number;
  pitchMm?: number; // pixel pitch in mm
  costPerSqFt?: number; // override cost per sqft
  desiredMargin?: number; // e.g., 0.25 for 25%
};

export type LineItemBreakdown = {
  name: string;
  productType: string;
  quantity: number;
  areaSqFt: number;
  pixelResolution: number;
  hardware: number; // Display cost
  shipping: number;
  labor: number;
  pm: number;
  bond: number;
  marginAmount: number;
  totalCost: number; // cost before margin
  totalPrice: number; // after margin + bond
};

export type ANCProjectResult = {
  items: LineItemBreakdown[];
  totals: {
    hardware: number;
    shipping: number;
    labor: number;
    pm: number;
    bond: number;
    margin: number;
    totalCost: number;
    totalPrice: number;
  };
};

/**
 * calculateANCProject
 * Implements the Excel formulas described by the client:
 * - Pixel Resolution: (H / (Pitch/304.8)) * (W / (Pitch/304.8))
 * - Display Cost: SquareFeet * CostPerSqFt (default $120)
 * - Shipping: SquareFeet * 0.14
 * - Structural Labor: SquareFeet * 1.01
 * - Bond/Insurance: TotalSellingPrice * 0.015
 * - Margin: (TotalCost/(1 - DesiredMargin)) - TotalCost
 */
export function calculateANCProject(
  screens: ScreenInput[],
  options?: { defaultCostPerSqFt?: number; defaultPitchMm?: number; defaultDesiredMargin?: number }
): ANCProjectResult {
  const DEFAULT_COST_PER_SQFT = options?.defaultCostPerSqFt ?? 120;
  const DEFAULT_PITCH_MM = options?.defaultPitchMm ?? 10; // reasonable default
  const DEFAULT_MARGIN = options?.defaultDesiredMargin ?? 0.25; // 25%
  const PM_PER_SQFT = 0.5; // assumed PM fee per sq ft (adjust as needed)

  const items: LineItemBreakdown[] = [];

  const totals = {
    hardware: 0,
    shipping: 0,
    labor: 0,
    pm: 0,
    bond: 0,
    margin: 0,
    totalCost: 0,
    totalPrice: 0,
  };

  for (const s of screens) {
    const qty = s.quantity ?? 1;
    const pitch = s.pitchMm ?? DEFAULT_PITCH_MM;
    const costPerSqFt = s.costPerSqFt ?? DEFAULT_COST_PER_SQFT;
    const desiredMargin = s.desiredMargin ?? DEFAULT_MARGIN;

    const area = s.heightFt * s.widthFt; // square feet per screen
    const areaTotal = area * qty;

    // pixels in height = Height (ft) / (pitch mm converted to ft)
    const pitchFeet = pitch / 304.8; // 1 ft = 304.8 mm
    const pixelsHeight = s.heightFt / pitchFeet;
    const pixelsWidth = s.widthFt / pitchFeet;
    const pixelResolution = Math.round(pixelsHeight * pixelsWidth);

    const hardware = roundToCents(areaTotal * costPerSqFt);
    const shipping = roundToCents(areaTotal * 0.14);
    const labor = roundToCents(areaTotal * 1.01);
    const pm = roundToCents(areaTotal * PM_PER_SQFT);

    const totalCost = roundToCents(hardware + shipping + labor + pm);

    // margin amount in dollars
    const marginAmount = roundToCents((totalCost / (1 - desiredMargin)) - totalCost);

    const totalPriceBeforeBond = roundToCents(totalCost + marginAmount);

    const bond = roundToCents(totalPriceBeforeBond * 0.015);

    const totalPrice = roundToCents(totalPriceBeforeBond + bond);

    items.push({
      name: s.name,
      productType: s.productType,
      quantity: qty,
      areaSqFt: roundToCents(areaTotal),
      pixelResolution,
      hardware,
      shipping,
      labor,
      pm,
      bond,
      marginAmount,
      totalCost,
      totalPrice,
    });

    totals.hardware += hardware;
    totals.shipping += shipping;
    totals.labor += labor;
    totals.pm += pm;
    totals.bond += bond;
    totals.margin += marginAmount;
    totals.totalCost += totalCost;
    totals.totalPrice += totalPrice;
  }

  // round totals
  for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[k] = roundToCents(totals[k]);
  }

  return { items, totals };
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
