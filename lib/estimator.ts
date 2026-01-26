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
  productType?: string;
  heightFt: number; // feet
  widthFt: number; // feet
  quantity?: number;
  pitchMm?: number; // pixel pitch in mm
  costPerSqFt?: number; // override cost per sqft
  desiredMargin?: number; // e.g., 0.25 for 25%
  serviceType?: string; // "Top" (Ribbons) or "Front/Rear" (Scoreboards)
  formFactor?: string; // "Straight" or "Curved"
  outletDistance?: number; // Distance from nearest outlet in feet
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
 * Screen Audit type (updated for ANC Master Logic)
 * - Includes pixelMatrix and serviceType at screen level
 * - Breakdown includes new margin-on-sell fields
 */
export type ScreenAudit = {
  name: string;
  productType: string;
  quantity: number;
  areaSqFt: number;
  pixelResolution: number;
  pixelMatrix?: string; // e.g., "1920 x 1080 @ 4mm"
  serviceType?: string; // "Top" or "Front/Rear"
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
    ancMargin: number; // Sell Price - Total Cost
    sellPrice: number; // Total Cost / (1 - margin)
    bondCost: number; // Sell Price * 1.5%
    marginAmount: number; // Alias for ancMargin (backwards compatibility)
    totalCost: number; // Sum of all costs EXCLUDING bond
    finalClientTotal: number; // Sell Price + Bond Cost
    sellingPricePerSqFt: number; // Final Client Total / Sq Ft
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
    ancMargin: number; // ANC profit from screen audits
    sellPrice: number; // Sell price before bond
    bondCost: number; // Sell Price * 1.5%
    margin: number;   // Alias for ancMargin
    totalCost: number; // Sum of screen costs
    finalClientTotal: number; // Total with Bond
    sellingPricePerSqFt: number; // Weighted average
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
/**
 * ANC MASTER EXCEL LOGIC IMPLEMENTATION
 * ========================================
 * Calculates screen pricing using:
 * - VLOOKUP pricing from catalog by pixel pitch
 * - Service type branch (Top=10%, Front/Rear=20%)
 * - Outlet distance surcharge (>50ft adds $2,500)
 * - Curved screen multipliers (Structure×1.25, Labor×1.15)
 * - Margin-on-Sell model: Total Cost → Sell Price → Bond → Final
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
  // Load catalog for VLOOKUP
  const { loadCatalogSync } = require('./catalog');
  const catalog = loadCatalogSync();

  // Defaults
  const DEFAULT_COST_PER_SQFT = options?.defaultCostPerSqFt ?? 120;
  const DEFAULT_PITCH_MM = options?.defaultPitchMm ?? 10;
  const DEFAULT_MARGIN = options?.defaultDesiredMargin ?? 0.25;
  const DEFAULT_SERVICE_TYPE = "Front/Rear"; // Scoreboards default

  const INSTALL_FLAT = options?.installFlatFee ?? 5000;
  const LABOR_PCT = options?.laborPct ?? 0.15;
  const POWER_PCT = options?.powerPct ?? 0.15;
  const SHIPPING_PER_SQFT = options?.shippingPerSqFt ?? 0.14;
  const PM_PER_SQFT = options?.pmPerSqFt ?? 0.5;
  const GENERAL_CONDITIONS_PCT = options?.generalConditionsPct ?? 0.03;
  const TRAVEL_PCT = options?.travelPct ?? 0.01;
  const SUBMITTALS_PCT = options?.submittalsPct ?? 0.01;
  const ENGINEERING_PCT = options?.engineeringPct ?? 0.02;
  const PERMITS_FIXED = options?.permitsFixed ?? 500;
  const CMS_PCT = options?.cmsPct ?? 0.02;
  const BOND_PCT = options?.bondPct ?? 0.015;

  const qty = s.quantity ?? 1;
  const pitch = s.pitchMm ?? DEFAULT_PITCH_MM;
  const serviceType = s.serviceType ?? DEFAULT_SERVICE_TYPE;
  const formFactor = s.formFactor ?? "Straight";
  const outletDistance = s.outletDistance ?? 0;
  const desiredMargin = s.desiredMargin ?? DEFAULT_MARGIN;

  // VLOOKUP: Find matching product by pixel pitch in catalog
  const catalogEntry = catalog?.find(
    (entry: any) => Math.abs(entry.pixel_pitch - pitch) < 0.1
  ) ?? { cost_per_sqft: DEFAULT_COST_PER_SQFT, service_type: DEFAULT_SERVICE_TYPE };

  const costPerSqFt = s.costPerSqFt ?? catalogEntry.cost_per_sqft ?? DEFAULT_COST_PER_SQFT;

  // Service Type Branch: Top (Ribbons) = 10%, Front/Rear (Scoreboards) = 20%
  const STRUCTURE_PCT = serviceType.toLowerCase() === "top" ? 0.10 : 0.20;

  const area = s.heightFt * s.widthFt;
  const areaTotal = area * qty;

  // Pixel Matrix Math: (H_mm / Pitch) × (W_mm / Pitch)
  const heightMm = s.heightFt * 304.8; // Convert feet to mm
  const widthMm = s.widthFt * 304.8;
  const pitchMeters = pitch / 1000;
  const pixelsH = Math.round(heightMm / pitch);
  const pixelsW = Math.round(widthMm / pitch);
  const pixelResolution = pixelsH * pixelsW;
  const pixelMatrix = `${pixelsH} x ${pixelsW} @ ${pitch}mm`;

  // Base cost calculations
  const hardware = roundToCents(areaTotal * costPerSqFt);

  // Curved Screen Multipliers
  const isCurved = formFactor.toLowerCase() === "curved";
  const structureMultiplier = isCurved ? 1.25 : 1.0;
  const laborMultiplier = isCurved ? 1.15 : 1.0;

  const structure = roundToCents(hardware * STRUCTURE_PCT * structureMultiplier);
  const install = roundToCents(INSTALL_FLAT * laborMultiplier);
  const labor = roundToCents(hardware * LABOR_PCT * laborMultiplier);
  const power = roundToCents(hardware * POWER_PCT);
  const shipping = roundToCents(areaTotal * SHIPPING_PER_SQFT);
  const pm = roundToCents(areaTotal * PM_PER_SQFT);
  const generalConditions = roundToCents(hardware * GENERAL_CONDITIONS_PCT);
  const travel = roundToCents(hardware * TRAVEL_PCT);
  const submittals = roundToCents(hardware * SUBMITTALS_PCT);
  const engineering = roundToCents(hardware * ENGINEERING_PCT);
  const permits = roundToCents(PERMITS_FIXED);
  const cms = roundToCents(hardware * CMS_PCT);

  // Outlet Distance Surcharge: If > 50ft, add $2,500 to Power
  const outletSurcharge = outletDistance > 50 ? 2500 : 0;
  const adjustedPower = roundToCents(power + outletSurcharge);

  // Total Cost (C): Sum of all line items EXCLUDING Bond
  const totalCost = roundToCents(
    hardware +
    structure +
    install +
    labor +
    adjustedPower +
    shipping +
    pm +
    generalConditions +
    travel +
    submittals +
    engineering +
    permits +
    cms
  );

  // Sell Price (P): Total Cost / (1 - DesiredMargin)
  // Example: Cost $1,000, Margin 10% → Price $1,111.11
  const sellPrice = roundToCents(totalCost / (1 - desiredMargin));

  // ANC Margin (Profit): Sell Price - Total Cost
  const ancMargin = roundToCents(sellPrice - totalCost);

  // Bond Cost: Sell Price * 0.015 (1.5% flat rate)
  const bondCost = roundToCents(sellPrice * BOND_PCT);

  // Final Client Total: Sell Price + Bond Cost
  const finalClientTotal = roundToCents(sellPrice + bondCost);

  // Selling SqFt: Final Client Total / Total Sq Ft
  const sellingPricePerSqFt = roundToCents(finalClientTotal / areaTotal);

  return {
    name: s.name,
    productType: s.productType ?? "",
    quantity: qty,
    areaSqFt: roundToCents(areaTotal),
    pixelResolution,
    pixelMatrix,
    serviceType,
    breakdown: {
      hardware,
      structure,
      install,
      labor,
      power: adjustedPower,
      shipping,
      pm,
      generalConditions,
      travel,
      submittals,
      engineering,
      permits,
      cms,
      totalCost,
      ancMargin,
      sellPrice,
      bondCost,
      finalClientTotal,
      sellingPricePerSqFt,
      marginAmount: ancMargin, // Alias for backwards compatibility
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
    bond: ps.breakdown.bondCost, // Corrected: only one bond field
    marginAmount: ps.breakdown.ancMargin,
    totalCost: ps.breakdown.totalCost,
    totalPrice: ps.breakdown.finalClientTotal, // Corrected: only one totalPrice field
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
    ancMargin: 0,
    sellPrice: 0,
    bondCost: 0,
    margin: 0,
    totalCost: 0,
    finalClientTotal: 0,
    sellingPricePerSqFt: 0,
  };

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
    totals.ancMargin += b.ancMargin;
    totals.sellPrice += b.sellPrice;
    totals.bondCost += b.bondCost;
    totals.totalCost += b.totalCost;
    totals.finalClientTotal += b.finalClientTotal;
    totals.sellingPricePerSqFt += b.sellingPricePerSqFt * ps.areaSqFt; // Weighted average later
    totals.margin += b.ancMargin;
  }

  for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[k] = roundToCents(totals[k]);
  }

  for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
    if (k === 'sellingPricePerSqFt') {
      // Compute weighted average: divide accumulated weighted sum by total sqft
      const totalSqFt = totals.totalCost > 0 ? perScreen.reduce((sum, ps) => sum + ps.areaSqFt, 0) : 1;
      totals[k] = roundToCents(totals[k] / totalSqFt);
    } else {
      totals[k] = roundToCents(totals[k]);
    }
  }

  const internalAudit: InternalAudit = {
    perScreen,
    totals,
  };

  // Apply project tax (flat 9.5%) to the subtotal to compute grand total
  const subtotal = roundToCents(totals.finalClientTotal);
  const taxAmount = roundToCents(subtotal * 0.095);
  const grandTotal = roundToCents(subtotal + taxAmount);

  const clientSummary: ClientSummary = {
    subtotal,
    total: grandTotal,
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

/* ======================================================
   Excel-Based Pricing Calculator (ANC Proposal Tab)
   - Follows the Westfield RFP Excel template structure
   - Calculates: LED Cost, Shipping, Labor, Bond, Margin, Total
   - Returns both display level and aggregated pricing
   ====================================================== */

export interface ExcelPricingRow {
  option: string;
  issue: string;
  vendor: string;
  product: string;
  pitch: string; // e.g., "10mm", "4mm"
  heightFeet: number;
  widthFeet: number;
  heightPixels: number;
  widthPixels: number;
  squareFeet: number;
  quantity: number;
  totalSqFt: number;
  ledNitRequirement: number;
  ledServiceRequirement: string;
  ledCostPerSqFt: number;
  displayCost: number;
  shipping: number;
  totalCost: number; // Display Cost + Shipping
  margin: number; // e.g., 0.10 for 10%
  price: number; // Total Cost × (1 + Margin)
  ancMargin: number; // Price - TotalCost
  bondCost: number;
  totalWithBond: number; // Price + BondCost
  sellingSqFt: number; // TotalWithBond / TotalSqFt
  shippingSalePrice: number; // Shipping markup
}

export interface ExcelPricingSheet {
  rows: ExcelPricingRow[];
  totals: {
    totalDisplayCost: number;
    totalShipping: number;
    totalCost: number;
    totalPrice: number;
    totalAncMargin: number;
    totalBond: number;
    grandTotal: number;
    totalSqFt: number;
  };
}

/**
 * Calculate Excel-based pricing for a screen configuration
 * Follows the ANC proposal Excel template logic:
 * - Display Cost = Total SQ FT × Cost Per Sq Ft
 * - Shipping = fixed amount (default $500) or per-screen calculation
 * - Total Cost = Display Cost + Shipping
 * - Margin = percentage (default 10% per Excel example)
 * - Price = Total Cost ÷ (1 - Margin)
 * - Bond = Price × 1.5% (from Excel: 10% margin, $16.67 bond on $1,111.11 price)
 * - Total with Bond = Price + Bond Cost
 */
export function calculateExcelPricing(
  screens: Array<{
    name: string;
    product: string;
    pitchMm: number;
    widthFeet: number;
    heightFeet: number;
    quantity?: number;
    costPerSqFt?: number;
    shipping?: number;
    margin?: number;
  }>,
  options?: {
    defaultMargin?: number;
    bondRate?: number;
    shippingFlat?: number;
  }
): ExcelPricingSheet {
  const DEFAULT_MARGIN = options?.defaultMargin ?? 0.10; // 10% per Excel example
  const BOND_RATE = options?.bondRate ?? 0.015; // 1.5% bond rate
  const SHIPPING_FLAT = options?.shippingFlat ?? 500;

  const rows: ExcelPricingRow[] = [];
  let totals = {
    totalDisplayCost: 0,
    totalShipping: 0,
    totalCost: 0,
    totalPrice: 0,
    totalAncMargin: 0,
    totalBond: 0,
    grandTotal: 0,
    totalSqFt: 0,
  };

  screens.forEach((screen, index) => {
    const quantity = screen.quantity ?? 1;
    const sqFt = screen.widthFeet * screen.heightFeet;
    const totalSqFt = sqFt * quantity;

    // Calculate pixel dimensions
    const pitchFeet = screen.pitchMm / 304.8;
    const heightPixels = Math.round(screen.heightFeet / pitchFeet);
    const widthPixels = Math.round(screen.widthFeet / pitchFeet);

    // Display Cost = Total SQ FT × Cost Per Sq Ft
    const displayCost = roundToCents(totalSqFt * (screen.costPerSqFt ?? 120));

    // Shipping (flat fee per location or configurable)
    const shipping = roundToCents(screen.shipping ?? SHIPPING_FLAT);

    // Total Cost = Display Cost + Shipping
    const totalCost = roundToCents(displayCost + shipping);

    // Apply margin
    const margin = screen.margin ?? DEFAULT_MARGIN;
    // Price = Total Cost ÷ (1 - margin) for margin-based pricing
    const price = roundToCents(totalCost / (1 - margin));

    // ANC Margin = Price - Total Cost
    const ancMargin = roundToCents(price - totalCost);

    // Bond = Price × Bond Rate (1.5%)
    const bondCost = roundToCents(price * BOND_RATE);

    // Total with Bond = Price + Bond Cost
    const totalWithBond = roundToCents(price + bondCost);

    // Selling Price per Sq Ft = Total with Bond ÷ Total SQ FT
    const sellingSqFt = roundToCents(totalWithBond / totalSqFt);

    // Shipping Sale Price (markup on shipping)
    const shippingSalePrice = roundToCents(shipping * (1 + margin));

    const row: ExcelPricingRow = {
      option: `${index + 1}`,
      issue: screen.name,
      vendor: "ANC",
      product: screen.product,
      pitch: `${screen.pitchMm}mm`,
      heightFeet: roundToCents(screen.heightFeet),
      widthFeet: roundToCents(screen.widthFeet),
      heightPixels,
      widthPixels,
      squareFeet: roundToCents(sqFt),
      quantity,
      totalSqFt: roundToCents(totalSqFt),
      ledNitRequirement: 3500, // Default from Westfield RFP
      ledServiceRequirement: "Front / Rear",
      ledCostPerSqFt: screen.costPerSqFt ?? 120,
      displayCost,
      shipping,
      totalCost,
      margin: margin * 100, // Convert to percentage
      price,
      ancMargin,
      bondCost,
      totalWithBond,
      sellingSqFt,
      shippingSalePrice,
    };

    rows.push(row);

    // Accumulate totals
    totals.totalDisplayCost += displayCost;
    totals.totalShipping += shipping;
    totals.totalCost += totalCost;
    totals.totalPrice += price;
    totals.totalAncMargin += ancMargin;
    totals.totalBond += bondCost;
    totals.grandTotal += totalWithBond;
    totals.totalSqFt += totalSqFt;
  });

  return {
    rows,
    totals,
  };
}

/**
 * Convert Excel pricing to CSV format for export
 */
export function exportExcelPricingToCSV(pricing: ExcelPricingSheet): string {
  const headers = [
    'OPTION',
    'Issue',
    'VENDOR',
    'PRODUCT',
    'PITCH',
    'H (ft)',
    'W (ft)',
    'H (pixels)',
    'W (pixels)',
    'SQ FT',
    'Quantity',
    'Total SQ FT',
    'LED NIT Req',
    'LED Service Req',
    'LED Cost/Sq Ft',
    'Display Cost',
    'Shipping',
    'Total Cost',
    'Margin %',
    'Price',
    'ANC Margin',
    'Bond Cost',
    'Total with Bond',
    'Selling/Sq Ft',
    'Shipping Sale Price',
  ];

  const rows = pricing.rows.map(row => [
    row.option,
    row.issue,
    row.vendor,
    row.product,
    row.pitch,
    row.heightFeet,
    row.widthFeet,
    row.heightPixels,
    row.widthPixels,
    row.squareFeet,
    row.quantity,
    row.totalSqFt,
    row.ledNitRequirement,
    row.ledServiceRequirement,
    row.ledCostPerSqFt.toFixed(2),
    row.displayCost.toFixed(2),
    row.shipping.toFixed(2),
    row.totalCost.toFixed(2),
    row.margin.toFixed(2),
    row.price.toFixed(2),
    row.ancMargin.toFixed(2),
    row.bondCost.toFixed(2),
    row.totalWithBond.toFixed(2),
    row.sellingSqFt.toFixed(2),
    row.shippingSalePrice.toFixed(2),
  ]);

  // Add totals row
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    pricing.rows.length,
    pricing.totals.totalSqFt.toFixed(2),
    '',
    '',
    '',
    pricing.totals.totalDisplayCost.toFixed(2),
    pricing.totals.totalShipping.toFixed(2),
    pricing.totals.totalCost.toFixed(2),
    '',
    pricing.totals.totalPrice.toFixed(2),
    pricing.totals.totalAncMargin.toFixed(2),
    pricing.totals.totalBond.toFixed(2),
    pricing.totals.grandTotal.toFixed(2),
    (pricing.totals.totalSqFt > 0 ? (pricing.totals.grandTotal / pricing.totals.totalSqFt).toFixed(2) : '0.00'),
    '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function roundToCents(value: any) {
  if (typeof value !== 'number') return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
