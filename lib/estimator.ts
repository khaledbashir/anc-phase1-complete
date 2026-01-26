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
   ANC Project estimator (from Master Excel Logic) - Hardened Audit Engine
   - Inputs in feet and mm where applicable
   - Returns per-screen and aggregated line-item breakdown
   - Exposes a dual-layer API: clientSummary (clean) and internalAudit (full math)
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

export type ScreenAudit = {
  name: string;
  productType: string;
  quantity: number;
  areaSqFt: number;
  pixelResolution: number;
  breakdown: {
    hardware: number; // Display cost / LED
    structure: number;
    install: number;
    labor: number;
    power: number;
    shipping: number;
    pm: number;
    generalConditions: number;
    travel: number;
    submittals: number;
    engineering: number;
    permits: number;
    cms: number;
    bond: number;
    marginAmount: number;
    totalCost: number; // sum of costs before margin
    totalPrice: number; // after margin + bond
  };
};

export type InternalAudit = {
  perScreen: ScreenAudit[];
  totals: {
    hardware: number;
    structure: number;
    install: number;
    labor: number;
    power: number;
    shipping: number;
    pm: number;
    generalConditions: number;
    travel: number;
    submittals: number;
    engineering: number;
    permits: number;
    cms: number;
    bond: number;
    margin: number;
    totalCost: number;
    totalPrice: number;
  };
};

export type ClientSummary = {
  subtotal: number; // pre-tax price shown to client
  total: number; // final selling price (includes margin, bond)
  breakdown: {
    hardware: number;
    structure: number;
    install: number;
    others: number; // aggregated small items
  };
};

/**
 * calculatePerScreenAudit
 * Deterministic formula based on ANC Excel guidance.
 * - Structure: 20% of hardware
 * - Install: flat fee (default $5000)
 * - Labor: 15% of hardware
 * - Power: 15% of hardware
 * - Shipping: area-based (default 0.14 per sq ft)
 * - PM: area-based (default 0.5 per sq ft)
 * - General Conditions / Travel / Submittals / Engineering / CMS: pct of hardware (defaults configurable)
 * - Permits: fixed fee (default $500)
 */
export function calculatePerScreenAudit(
  s: ScreenInput,
  options?: {
    defaultCostPerSqFt?: number;
    defaultPitchMm?: number;
    defaultDesiredMargin?: number;
    installFlatFee?: number;
    structurePct?: number;
    laborPct?: number;
    powerPct?: number;
    shippingPerSqFt?: number;
    pmPerSqFt?: number;
    generalConditionsPct?: number;
    travelPct?: number;
    submittalsPct?: number;
    engineeringPct?: number;
    permitsFixed?: number;
    cmsPct?: number;
    bondPct?: number;
  }
): ScreenAudit {
  const DEFAULT_COST_PER_SQFT = options?.defaultCostPerSqFt ?? 120;
  const DEFAULT_PITCH_MM = options?.defaultPitchMm ?? 10;
  const DEFAULT_MARGIN = options?.defaultDesiredMargin ?? 0.25;

  const INSTALL_FLAT = options?.installFlatFee ?? 5000;
  const STRUCTURE_PCT = options?.structurePct ?? 0.2;
  const LABOR_PCT = options?.laborPct ?? 0.15;
  const POWER_PCT = options?.powerPct ?? 0.15;
  const SHIPPING_PER_SQFT = options?.shippingPerSqFt ?? 0.14; // preserved from legacy logic
  const PM_PER_SQFT = options?.pmPerSqFt ?? 0.5; // preserved
  const GENERAL_CONDITIONS_PCT = options?.generalConditionsPct ?? 0.03;
  const TRAVEL_PCT = options?.travelPct ?? 0.01;
  const SUBMITTALS_PCT = options?.submittalsPct ?? 0.01;
  const ENGINEERING_PCT = options?.engineeringPct ?? 0.02;
  const PERMITS_FIXED = options?.permitsFixed ?? 500;
  const CMS_PCT = options?.cmsPct ?? 0.02;
  const BOND_PCT = options?.bondPct ?? 0.015;

  const qty = s.quantity ?? 1;
  const pitch = s.pitchMm ?? DEFAULT_PITCH_MM;
  const costPerSqFt = s.costPerSqFt ?? DEFAULT_COST_PER_SQFT;
  const desiredMargin = s.desiredMargin ?? DEFAULT_MARGIN;

  const area = s.heightFt * s.widthFt; // square feet per screen
  const areaTotal = area * qty;

  // pixels
  const pitchFeet = pitch / 304.8;
  const pixelsHeight = s.heightFt / pitchFeet;
  const pixelsWidth = s.widthFt / pitchFeet;
  const pixelResolution = Math.round(pixelsHeight * pixelsWidth);

  const hardware = roundToCents(areaTotal * costPerSqFt);
  const structure = roundToCents(hardware * STRUCTURE_PCT);
  const install = roundToCents(INSTALL_FLAT);
  const labor = roundToCents(hardware * LABOR_PCT);
  const power = roundToCents(hardware * POWER_PCT);
  const shipping = roundToCents(areaTotal * SHIPPING_PER_SQFT);
  const pm = roundToCents(areaTotal * PM_PER_SQFT);
  const generalConditions = roundToCents(hardware * GENERAL_CONDITIONS_PCT);
  const travel = roundToCents(hardware * TRAVEL_PCT);
  const submittals = roundToCents(hardware * SUBMITTALS_PCT);
  const engineering = roundToCents(hardware * ENGINEERING_PCT);
  const permits = roundToCents(PERMITS_FIXED);
  const cms = roundToCents(hardware * CMS_PCT);

  const totalCost = roundToCents(
    hardware +
      structure +
      install +
      labor +
      power +
      shipping +
      pm +
      generalConditions +
      travel +
      submittals +
      engineering +
      permits +
      cms
  );

  const marginAmount = roundToCents((totalCost / (1 - desiredMargin)) - totalCost);

  const totalPriceBeforeBond = roundToCents(totalCost + marginAmount);
  const bond = roundToCents(totalPriceBeforeBond * BOND_PCT);
  const totalPrice = roundToCents(totalPriceBeforeBond + bond);

  return {
    name: s.name,
    productType: s.productType,
    quantity: qty,
    areaSqFt: roundToCents(areaTotal),
    pixelResolution,
    breakdown: {
      hardware,
      structure,
      install,
      labor,
      power,
      shipping,
      pm,
      generalConditions,
      travel,
      submittals,
      engineering,
      permits,
      cms,
      bond,
      marginAmount,
      totalCost,
      totalPrice,
    },
  };
}

/**
 * calculateANCProject (keeps backwards-compatible name) -> now delegates to per-screen audit
 */
export function calculateANCProject(
  screens: ScreenInput[],
  options?: { defaultCostPerSqFt?: number; defaultPitchMm?: number; defaultDesiredMargin?: number }
): ANCProjectResult {
  const perScreen = screens.map((s) => calculatePerScreenAudit(s, options));

  const items = perScreen.map((ps) => ({
    name: ps.name,
    productType: ps.productType,
    quantity: ps.quantity,
    areaSqFt: ps.areaSqFt,
    pixelResolution: ps.pixelResolution,
    hardware: ps.breakdown.hardware,
    shipping: ps.breakdown.shipping,
    labor: ps.breakdown.labor,
    pm: ps.breakdown.pm,
    bond: ps.breakdown.bond,
    marginAmount: ps.breakdown.marginAmount,
    totalCost: ps.breakdown.totalCost,
    totalPrice: ps.breakdown.totalPrice,
  }));

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

  for (const it of items) {
    totals.hardware += it.hardware;
    totals.shipping += it.shipping;
    totals.labor += it.labor;
    totals.pm += it.pm;
    totals.bond += it.bond;
    totals.margin += it.marginAmount;
    totals.totalCost += it.totalCost;
    totals.totalPrice += it.totalPrice;
  }

  for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[k] = roundToCents(totals[k]);
  }

  return { items, totals };
}

/**
 * calculateProposalAudit
 * Returns both a client-facing summary and a full internal audit object.
 */
export function calculateProposalAudit(
  screens: ScreenInput[],
  options?: { defaultCostPerSqFt?: number; defaultPitchMm?: number; defaultDesiredMargin?: number }
): { clientSummary: ClientSummary; internalAudit: InternalAudit } {
  const perScreen = screens.map((s) => calculatePerScreenAudit(s, options));

  const totals = {
    hardware: 0,
    structure: 0,
    install: 0,
    labor: 0,
    power: 0,
    shipping: 0,
    pm: 0,
    generalConditions: 0,
    travel: 0,
    submittals: 0,
    engineering: 0,
    permits: 0,
    cms: 0,
    bond: 0,
    margin: 0,
    totalCost: 0,
    totalPrice: 0,
  } as InternalAudit['totals'];

  for (const ps of perScreen) {
    const b = ps.breakdown;
    totals.hardware += b.hardware;
    totals.structure += b.structure;
    totals.install += b.install;
    totals.labor += b.labor;
    totals.power += b.power;
    totals.shipping += b.shipping;
    totals.pm += b.pm;
    totals.generalConditions += b.generalConditions;
    totals.travel += b.travel;
    totals.submittals += b.submittals;
    totals.engineering += b.engineering;
    totals.permits += b.permits;
    totals.cms += b.cms;
    totals.bond += b.bond;
    totals.margin += b.marginAmount;
    totals.totalCost += b.totalCost;
    totals.totalPrice += b.totalPrice;
  }

  for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[k] = roundToCents(totals[k]);
  }

  const internalAudit: InternalAudit = {
    perScreen,
    totals,
  };

  const clientSummary: ClientSummary = {
    subtotal: roundToCents(totals.totalPrice - totals.bond),
    total: totals.totalPrice,
    breakdown: {
      hardware: totals.hardware,
      structure: totals.structure,
      install: totals.install,
      others: roundToCents(
        totals.shipping + totals.pm + totals.generalConditions + totals.travel + totals.submittals + totals.engineering + totals.permits + totals.cms
      ),
    },
  };

  return { clientSummary, internalAudit };
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
