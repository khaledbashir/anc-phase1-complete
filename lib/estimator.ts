/**
 * ANC Estimator Logic
 * Calculates screen pricing based on dimensions, pixel pitch, and environment
 * 
 * UPDATED: Uses Decimal.js for deterministic financial calculations
 * Reference: VERIFICATION_REFINED_DESIGN.md
 */

import Decimal from "@/lib/decimal";
import { roundToCents, roundCategoryTotal } from "@/lib/decimal";

export interface ScreenPriceBreakdown {
  led: number;
  structure: number;
  install: number;
  power: number;
  total: number;
}

/**
 * calculateTotalWithBond (Natalia Math Divisor Model)
 * Sell Price = Cost / (1 - Margin%)
 * Bond = Sell Price * 0.015
 * Total = Sell Price + Bond
 */
export function calculateTotalWithBond(cost: number, marginPct: number) {
  // Natalia Math Divisor Model: P = C / (1 - M)
  const dCost = new Decimal(cost);
  const dMarginPct = new Decimal(marginPct);
  
  // sellPrice = cost / (1 - (marginPct / 100))
  const sellPrice = dCost.div(new Decimal(1).minus(dMarginPct.div(100)));
  
  // Bond is 1.5% of the Sell Price
  const bond = sellPrice.times(0.015);
  const total = sellPrice.plus(bond);

  return {
    sellPrice: roundToCents(sellPrice).toNumber(),
    bond: roundToCents(bond).toNumber(),
    total: roundToCents(total).toNumber()
  };
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
  const dWidth = new Decimal(width);
  const dHeight = new Decimal(height);
  
  // LED Cost calculation
  // Formula: (Width * Height) * (isOutdoor ? 150 : 80)
  const area = dWidth.times(dHeight);
  const pricePerSquareMeter = isOutdoor ? 150 : 80;
  const ledCost = area.times(pricePerSquareMeter);

  // Structure Cost: 20% of LED cost
  const structureCost = ledCost.times(0.20);

  // Install Cost: Flat fee of $5000
  const installCost = new Decimal(5000);

  // Power Cost: 15% of LED cost
  const powerCost = ledCost.times(0.15);

  const total = ledCost.plus(structureCost).plus(installCost).plus(powerCost);

  return {
    led: Math.round(ledCost.toNumber()),
    structure: Math.round(structureCost.toNumber()),
    install: Math.round(installCost.toNumber()),
    power: Math.round(powerCost.toNumber()),
    total: Math.round(total.toNumber()),
  };
}

export const MORGANTOWN_BO_TAX = 0.02; // 2% West Virginia B&O Tax (REQ-48)
export const STEEL_PRICE_PER_TON = 3000; // REQ-86: Thornton Tomasetti rate $3,000/ton

function shouldApplyMorgantownBoTax(input?: { projectAddress?: string; venue?: string }) {
  const haystack = `${input?.projectAddress ?? ""} ${input?.venue ?? ""}`.toLowerCase();
  if (haystack.includes("morgantown")) return true;
  if (haystack.includes("wvu")) return true;
  if (haystack.includes("milan puskar")) return true;
  if (haystack.includes("puskar stadium")) return true;
  return false;
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

export interface ScreenInput {
  name: string;
  productType?: string;
  widthFt?: number;
  heightFt?: number;
  quantity?: number;
  pitchMm?: number;
  costPerSqFt?: number;
  desiredMargin?: number;
  serviceType?: string;
  formFactor?: string; // "Straight" or "Curved"
  outletDistance?: number;
  isReplacement?: boolean;
  useExistingStructure?: boolean;
  includeSpareParts?: boolean;
  aiSource?: any;
}

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
    demolition?: number;
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
    demolition: number;
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
    finalClientTotal: number; // Sell Price + Bond Cost + boTax
    sellingPricePerSqFt: number; // Final Client Total / Sq Ft
    boTaxCost: number; // REQ-48
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
    demolition: number;
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
    boTaxCost: number; // Total B&O Tax
    finalClientTotal: number; // Total with Bond and B&O
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
 * Using Decimal.js for correct financial math.
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
    structuralTonnage?: number; // REQ-46
    reinforcingTonnage?: number; // REQ-46
    projectAddress?: string; // REQ-81
    venue?: string; // REQ-81
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
  const GENERAL_CONDITIONS_PCT = options?.generalConditionsPct ?? 0.02;
  const TRAVEL_PCT = options?.travelPct ?? 0.03;
  const SUBMITTALS_PCT = options?.submittalsPct ?? 0.01;
  const PERMITS_FIXED = options?.permitsFixed ?? 500;
  const CMS_PCT = options?.cmsPct ?? 0.02;
  const BOND_PCT = options?.bondPct ?? 0.015;
  const DEMOLITION_FIXED = 5000;

  const qty = new Decimal(s.quantity ?? 1);
  const pitch = s.pitchMm ?? DEFAULT_PITCH_MM;
  const serviceType = s.serviceType ?? DEFAULT_SERVICE_TYPE;
  const formFactor = s.formFactor ?? "Straight";
  const outletDistance = s.outletDistance ?? 0;
  const desiredMargin = new Decimal(s.desiredMargin ?? DEFAULT_MARGIN);

  // VLOOKUP: Find matching product by pixel pitch in catalog
  const catalogEntry = catalog?.find(
    (entry: any) => Math.abs(entry.pixel_pitch - pitch) < 0.1
  ) ?? { cost_per_sqft: DEFAULT_COST_PER_SQFT, service_type: DEFAULT_SERVICE_TYPE };

  const costPerSqFt = new Decimal(s.costPerSqFt ?? catalogEntry.cost_per_sqft ?? DEFAULT_COST_PER_SQFT);

  // Pixel Matrix Math: (H_mm / Pitch) × (W_mm / Pitch)
  const resolveModuleKey = (productType: string | undefined, pitchMm: number) => {
    if (!productType) return null;
    const t = productType.toLowerCase();
    if (t.includes("lg") && Math.abs(pitchMm - 4) < 0.25) return "LG-GSQA-4MM";
    if (t.includes("yaham") && Math.abs(pitchMm - 10) < 0.5) return "YAHAM-10MM-INDOOR";
    return null;
  };

  const moduleKey = s.aiSource?.moduleKey ?? resolveModuleKey(s.productType, pitch);
  const targetHeightFt = s.heightFt ?? 0;
  const targetWidthFt = s.widthFt ?? 0;
  const { matchModules } = require("../services/module-matching");
  const matched = moduleKey && targetHeightFt > 0 && targetWidthFt > 0
    ? matchModules(targetWidthFt, targetHeightFt, moduleKey)
    : null;

  const heightMm = (matched?.actualHeightFt ?? targetHeightFt) * 304.8;
  const widthMm = (matched?.actualWidthFt ?? targetWidthFt) * 304.8;
  const pixelsH = Math.round(heightMm / pitch);
  const pixelsW = Math.round(widthMm / pitch);
  const pixelResolution = pixelsH * pixelsW;
  const pixelMatrix = `${pixelsH} x ${pixelsW} @ ${pitch}mm`;

  // Service Type Branch: Top (Ribbons) = 10%, Front/Rear (Scoreboards) = 20%
  let STRUCTURE_PCT = serviceType.toLowerCase() === "top" ? 0.10 : 0.20;
  let ENGINEERING_PCT = options?.engineeringPct ?? 0.02;

  // Ferrari Logic 2: Infrastructure Credit (RFP Exhibit A, Page 11)
  if (s.isReplacement && s.useExistingStructure) {
    STRUCTURE_PCT = 0.05; // Drop to 5%
    ENGINEERING_PCT = 0.05; // Increase to 5% for site audit/Electrical review
  }

  const height = new Decimal(s.heightFt ?? 0);
  const width = new Decimal(s.widthFt ?? 0);
  const area = roundToCents(height.times(width));
  const totalArea = roundToCents(area.times(qty)); // Total project area

  // Ferrari Logic 1: Spare Parts (RFP Exhibit A, Page 11) - 5% hardware bake-in
  const hardwareBase = roundToCents(area.times(costPerSqFt));
  const sparePartsCost = s.includeSpareParts ? roundToCents(hardwareBase.times(0.05)) : new Decimal(0);
  const hardwareUnit = roundToCents(hardwareBase.plus(sparePartsCost));
  const hardware = roundToCents(hardwareUnit.times(qty));

  // Curved Screen Multipliers
  const isCurved = formFactor.toLowerCase() === "curved";
  const structureMultiplier = isCurved ? 1.25 : 1.0;
  const laborMultiplier = isCurved ? 1.15 : 1.0;

  const baseStructure = hardware.times(STRUCTURE_PCT);
  const structure = roundToCents(baseStructure.times(structureMultiplier));
  const install = roundToCents(new Decimal(INSTALL_FLAT).times(laborMultiplier));
  const labor = roundToCents(hardware.times(LABOR_PCT).times(laborMultiplier));
  const power = roundToCents(hardware.times(POWER_PCT));
  const shipping = roundToCents(totalArea.times(SHIPPING_PER_SQFT));
  const pm = roundToCents(totalArea.times(PM_PER_SQFT));
  const generalConditions = roundToCents(hardware.times(GENERAL_CONDITIONS_PCT));
  const travel = roundToCents(hardware.times(TRAVEL_PCT));
  const submittals = roundToCents(hardware.times(SUBMITTALS_PCT));
  const engineering = roundToCents(hardware.times(ENGINEERING_PCT));
  const permits = roundToCents(PERMITS_FIXED);
  const cms = roundToCents(hardware.times(CMS_PCT));

  const demolition = s.isReplacement ? roundToCents(DEMOLITION_FIXED) : new Decimal(0);

  // Outlet Distance Surcharge: If > 50ft, add $2,500 to Power
  const outletSurcharge = outletDistance > 50 ? 2500 : 0;
  const adjustedPower = roundToCents(power.plus(outletSurcharge));

  // Total Cost (C): Sum of all line items EXCLUDING Bond
  const totalCost = roundToCents(
    hardware.plus(structure).plus(install).plus(labor).plus(adjustedPower)
      .plus(shipping).plus(pm).plus(generalConditions).plus(travel)
      .plus(submittals).plus(engineering).plus(permits).plus(cms)
      .plus(demolition)
  );

  // REQ-110: Margin Validation - Prevent division by zero
  if (desiredMargin.gte(1.0)) {
    throw new Error(`Invalid margin: ${desiredMargin.times(100)}%. Margin must be less than 100% for Divisor Margin model.`);
  }

  // Natalia Math Divisor Model: P = C / (1 - M)
  const sellPrice = roundToCents(totalCost.div(new Decimal(1).minus(desiredMargin)));

  // Bond Fee: 1.5% applied ON TOP of the Sell Price (calculated against Sell Price)
  const bondCost = roundToCents(sellPrice.times(BOND_PCT));

  // REQ-81: Morgantown/WVU B&O Tax (2% of Sell Price + Bond)
  const boTaxRate = shouldApplyMorgantownBoTax({
    projectAddress: options?.projectAddress,
    venue: options?.venue,
  })
    ? MORGANTOWN_BO_TAX
    : 0;
  const boTaxCost = roundToCents(sellPrice.plus(bondCost).times(boTaxRate));

  // REQ-125: Sales Tax included in finalClientTotal per Master Truth mandate
  // Financial Sequence: Selling Price + Bond + B&O Tax + Sales Tax = Final Total
  const salesTaxRate = new Decimal(options?.taxRate ?? 0.095);
  const taxableAmount = sellPrice.plus(bondCost).plus(boTaxCost);
  const salesTaxCost = roundToCents(taxableAmount.times(salesTaxRate));
  const finalClientTotal = roundToCents(taxableAmount.plus(salesTaxCost));

  // ANC Margin (Profit): Sell Price - Total Cost
  const ancMargin = roundToCents(sellPrice.minus(totalCost));

  // Selling SqFt: Final Client Total / Total Sq Ft
  const sellingPricePerSqFt = totalArea.gt(0) ? roundToCents(finalClientTotal.div(totalArea)) : new Decimal(0);

  return {
    name: s.name,
    productType: s.productType ?? "",
    quantity: qty.toNumber(),
    areaSqFt: roundToCents(totalArea).toNumber(),
    pixelResolution,
    pixelMatrix,
    serviceType,
    breakdown: {
      hardware: hardware.toNumber(),
      structure: structure.toNumber(),
      install: install.toNumber(),
      labor: labor.toNumber(),
      demolition: demolition.toNumber(),
      power: adjustedPower.toNumber(),
      shipping: shipping.toNumber(),
      pm: pm.toNumber(),
      generalConditions: generalConditions.toNumber(),
      travel: travel.toNumber(),
      submittals: submittals.toNumber(),
      engineering: engineering.toNumber(),
      permits: permits.toNumber(),
      cms: cms.toNumber(),
      ancMargin: ancMargin.toNumber(),
      sellPrice: sellPrice.toNumber(),
      bondCost: bondCost.toNumber(),
      marginAmount: ancMargin.toNumber(),
      totalCost: totalCost.toNumber(),
      finalClientTotal: finalClientTotal.toNumber(),
      sellingPricePerSqFt: sellingPricePerSqFt.toNumber(),
      boTaxCost: boTaxCost.toNumber(),
      salesTaxCost: salesTaxCost.toNumber(),
      salesTaxRate: salesTaxRate.toNumber(),
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

  // Aggregate totals using Decimal for precision
  let hardware = new Decimal(0);
  let shipping = new Decimal(0);
  let labor = new Decimal(0);
  let pm = new Decimal(0);
  let bond = new Decimal(0);
  let margin = new Decimal(0);
  let totalCost = new Decimal(0);
  let totalPrice = new Decimal(0);

  for (const it of items) {
    hardware = hardware.plus(it.hardware);
    shipping = shipping.plus(it.shipping);
    labor = labor.plus(it.labor);
    pm = pm.plus(it.pm);
    bond = bond.plus(it.bond);
    margin = margin.plus(it.marginAmount);
    totalCost = totalCost.plus(it.totalCost);
    totalPrice = totalPrice.plus(it.totalPrice);
  }

  // Round final aggregated totals (though they should already be clean if inputs are)
  return {
    items,
    totals: {
      hardware: roundToCents(hardware).toNumber(),
      shipping: roundToCents(shipping).toNumber(),
      labor: roundToCents(labor).toNumber(),
      pm: roundToCents(pm).toNumber(),
      bond: roundToCents(bond).toNumber(),
      margin: roundToCents(margin).toNumber(),
      totalCost: roundToCents(totalCost).toNumber(),
      totalPrice: roundToCents(totalPrice).toNumber(),
    }
  };
}

/**
 * calculateProposalAudit
 * Returns both a client-facing summary and a full internal audit object.
 */
export function calculateProposalAudit(
  screens: ScreenInput[],
  options?: {
    defaultCostPerSqFt?: number;
    defaultPitchMm?: number;
    defaultDesiredMargin?: number;
    taxRate?: number; // Override default 9.5%
    bondPct?: number; // Override default 1.5%
    structuralTonnage?: number;
    reinforcingTonnage?: number;
    projectAddress?: string; // REQ-81
    venue?: string; // REQ-81
  }
): { clientSummary: ClientSummary; internalAudit: InternalAudit } {
  const perScreen = screens.map((s) => calculatePerScreenAudit(s, {
    ...options,
    bondPct: options?.bondPct,
    structuralTonnage: options?.structuralTonnage,
    reinforcingTonnage: options?.reinforcingTonnage
  }));

  const totalTonnage = new Decimal(options?.structuralTonnage ?? 0).plus(options?.reinforcingTonnage ?? 0);
  const tonnageCost = roundToCents(totalTonnage.times(STEEL_PRICE_PER_TON));

  if (tonnageCost.gt(0) && perScreen.length > 0) {
    const weights = perScreen.map((ps) => new Decimal(ps.breakdown.structure));
    const totalWeight = weights.reduce((acc, w) => acc.plus(w), new Decimal(0));

    const allocationsUnrounded =
      totalWeight.gt(0)
        ? weights.map((w) => tonnageCost.times(w.div(totalWeight)))
        : perScreen.map(() => tonnageCost.div(perScreen.length));

    const allocations = allocationsUnrounded.map((a) => roundToCents(a));
    const sumAllocations = allocations.reduce((acc, a) => acc.plus(a), new Decimal(0));
    const diff = roundToCents(tonnageCost.minus(sumAllocations));
    // Adjust last allocation with difference
    allocations[allocations.length - 1] = roundToCents(allocations[allocations.length - 1].plus(diff));

    const boTaxRate = shouldApplyMorgantownBoTax({
      projectAddress: options?.projectAddress,
      venue: options?.venue,
    })
      ? MORGANTOWN_BO_TAX
      : 0;

    for (let i = 0; i < perScreen.length; i++) {
      const ps = perScreen[i];
      const b = ps.breakdown;
      const oldStructure = new Decimal(b.structure);
      const newStructure = allocations[i] ?? new Decimal(0);
      if (oldStructure.equals(newStructure)) continue;

      const oldTotalCost = new Decimal(b.totalCost);
      const newTotalCost = roundToCents(oldTotalCost.minus(oldStructure).plus(newStructure));

      const oldSellPrice = new Decimal(b.sellPrice);
      const oldBondCost = new Decimal(b.bondCost);
      
      const desiredMargin = oldSellPrice.gt(0) 
        ? new Decimal(1).minus(oldTotalCost.div(oldSellPrice)) 
        : new Decimal(options?.defaultDesiredMargin ?? 0.25);
        
      const bondPct = oldSellPrice.gt(0) 
        ? oldBondCost.div(oldSellPrice) 
        : new Decimal(options?.bondPct ?? 0.015);

      if (desiredMargin.gte(1.0)) {
        throw new Error(`Invalid margin: ${desiredMargin.times(100)}%. Margin must be less than 100% for Divisor Margin model.`);
      }

      const sellPrice = roundToCents(newTotalCost.div(new Decimal(1).minus(desiredMargin)));
      const bondCost = roundToCents(sellPrice.times(bondPct));
      const boTaxCost = roundToCents(sellPrice.plus(bondCost).times(boTaxRate));
      // REQ-125: Include Sales Tax in finalClientTotal
      const salesTaxRate = new Decimal(options?.taxRate ?? 0.095);
      const taxableAmount = sellPrice.plus(bondCost).plus(boTaxCost);
      const salesTaxCost = roundToCents(taxableAmount.times(salesTaxRate));
      const finalClientTotal = roundToCents(taxableAmount.plus(salesTaxCost));
      const ancMargin = roundToCents(sellPrice.minus(newTotalCost));
      const sellingPricePerSqFt = ps.areaSqFt > 0 ? roundToCents(finalClientTotal.div(ps.areaSqFt)) : new Decimal(0);

      b.structure = newStructure.toNumber();
      b.totalCost = newTotalCost.toNumber();
      b.sellPrice = sellPrice.toNumber();
      b.bondCost = bondCost.toNumber();
      b.boTaxCost = boTaxCost.toNumber();
      b.finalClientTotal = finalClientTotal.toNumber();
      b.ancMargin = ancMargin.toNumber();
      b.marginAmount = ancMargin.toNumber();
      b.sellingPricePerSqFt = sellingPricePerSqFt.toNumber();
    }
  }

  // Aggregate totals
  const totals = {
    hardware: new Decimal(0),
    structure: new Decimal(0),
    install: new Decimal(0),
    labor: new Decimal(0),
    power: new Decimal(0),
    shipping: new Decimal(0),
    pm: new Decimal(0),
    generalConditions: new Decimal(0),
    travel: new Decimal(0),
    submittals: new Decimal(0),
    engineering: new Decimal(0),
    permits: new Decimal(0),
    cms: new Decimal(0),
    ancMargin: new Decimal(0),
    sellPrice: new Decimal(0),
    bondCost: new Decimal(0),
    margin: new Decimal(0),
    totalCost: new Decimal(0),
    boTaxCost: new Decimal(0),
    finalClientTotal: new Decimal(0),
    sellingPricePerSqFt: new Decimal(0),
    demolition: new Decimal(0),
  };

  for (const ps of perScreen) {
    const b = ps.breakdown;
    totals.hardware = totals.hardware.plus(b.hardware);
    totals.structure = totals.structure.plus(b.structure);
    totals.install = totals.install.plus(b.install);
    totals.labor = totals.labor.plus(b.labor);
    totals.power = totals.power.plus(b.power);
    totals.shipping = totals.shipping.plus(b.shipping);
    totals.pm = totals.pm.plus(b.pm);
    totals.generalConditions = totals.generalConditions.plus(b.generalConditions);
    totals.travel = totals.travel.plus(b.travel);
    totals.submittals = totals.submittals.plus(b.submittals);
    totals.engineering = totals.engineering.plus(b.engineering);
    totals.permits = totals.permits.plus(b.permits);
    totals.cms = totals.cms.plus(b.cms);
    totals.ancMargin = totals.ancMargin.plus(b.ancMargin);
    totals.sellPrice = totals.sellPrice.plus(b.sellPrice);
    totals.bondCost = totals.bondCost.plus(b.bondCost);
    totals.boTaxCost = totals.boTaxCost.plus(b.boTaxCost || 0);
    totals.totalCost = totals.totalCost.plus(b.totalCost);
    totals.finalClientTotal = totals.finalClientTotal.plus(b.finalClientTotal);
    totals.sellingPricePerSqFt = totals.sellingPricePerSqFt.plus(new Decimal(b.sellingPricePerSqFt).times(ps.areaSqFt)); // Weighted average sum
    totals.margin = totals.margin.plus(b.ancMargin);
    totals.demolition = totals.demolition.plus(b.demolition || 0);
  }

  // Compute final weighted average for sellingPricePerSqFt
  const totalSqFt = totals.totalCost.gt(0) 
    ? perScreen.reduce((sum, ps) => sum + ps.areaSqFt, 0) 
    : 1;
  const weightedSellingPricePerSqFt = roundToCents(totals.sellingPricePerSqFt.div(totalSqFt));

  const internalAudit: InternalAudit = {
    perScreen,
    totals: {
      hardware: roundToCents(totals.hardware).toNumber(),
      structure: roundToCents(totals.structure).toNumber(),
      install: roundToCents(totals.install).toNumber(),
      labor: roundToCents(totals.labor).toNumber(),
      power: roundToCents(totals.power).toNumber(),
      shipping: roundToCents(totals.shipping).toNumber(),
      pm: roundToCents(totals.pm).toNumber(),
      generalConditions: roundToCents(totals.generalConditions).toNumber(),
      travel: roundToCents(totals.travel).toNumber(),
      submittals: roundToCents(totals.submittals).toNumber(),
      engineering: roundToCents(totals.engineering).toNumber(),
      permits: roundToCents(totals.permits).toNumber(),
      cms: roundToCents(totals.cms).toNumber(),
      ancMargin: roundToCents(totals.ancMargin).toNumber(),
      sellPrice: roundToCents(totals.sellPrice).toNumber(),
      bondCost: roundToCents(totals.bondCost).toNumber(),
      margin: roundToCents(totals.margin).toNumber(),
      totalCost: roundToCents(totals.totalCost).toNumber(),
      boTaxCost: roundToCents(totals.boTaxCost).toNumber(),
      finalClientTotal: roundToCents(totals.finalClientTotal).toNumber(),
      sellingPricePerSqFt: weightedSellingPricePerSqFt.toNumber(),
      demolition: roundToCents(totals.demolition).toNumber(),
    },
  };

  // Apply project tax (default 9.5% or override) to the subtotal to compute grand total
  const subtotal = roundToCents(totals.finalClientTotal);
  const activeTaxRate = new Decimal(options?.taxRate !== undefined ? options.taxRate : 0.095);
  const taxAmount = roundToCents(subtotal.times(activeTaxRate));
  const grandTotal = roundToCents(subtotal.plus(taxAmount));

  const clientSummary: ClientSummary = {
    subtotal: subtotal.toNumber(),
    total: grandTotal.toNumber(),
    breakdown: {
      hardware: roundToCents(totals.hardware).toNumber(),
      structure: roundToCents(totals.structure).toNumber(),
      install: roundToCents(totals.install).toNumber(),
      others: roundToCents(
        totals.shipping.plus(totals.pm).plus(totals.generalConditions).plus(totals.travel)
          .plus(totals.submittals).plus(totals.engineering).plus(totals.permits).plus(totals.cms).plus(totals.demolition)
      ).toNumber(),
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
  price: number; // Total Cost / (1 - Margin) - Divisor Model
  ancMargin: number; // Price - TotalCost
  bondCost: number;
  totalWithBond: number; // Price + BondCost
  sellingSqFt: number; // TotalWithBond / TotalSqFt
  shippingSalePrice: number; // Shipping / (1 - Margin) - Divisor Model
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
    totalDisplayCost: new Decimal(0),
    totalShipping: new Decimal(0),
    totalCost: new Decimal(0),
    totalPrice: new Decimal(0),
    totalAncMargin: new Decimal(0),
    totalBond: new Decimal(0),
    grandTotal: new Decimal(0),
    totalSqFt: new Decimal(0),
  };

  screens.forEach((screen, index) => {
    const quantity = new Decimal(screen.quantity ?? 1);
    const widthFeet = new Decimal(screen.widthFeet);
    const heightFeet = new Decimal(screen.heightFeet);
    
    const sqFt = widthFeet.times(heightFeet);
    const totalSqFt = sqFt.times(quantity);

    // Calculate pixel dimensions
    const pitchFeet = new Decimal(screen.pitchMm).div(304.8);
    const heightPixels = Math.round(screen.heightFeet / pitchFeet.toNumber());
    const widthPixels = Math.round(screen.widthFeet / pitchFeet.toNumber());

    // Display Cost = Total SQ FT × Cost Per Sq Ft
    const costPerSqFt = new Decimal(screen.costPerSqFt ?? 120);
    const displayCost = roundToCents(totalSqFt.times(costPerSqFt));

    // Shipping (flat fee per location or configurable)
    const shipping = roundToCents(screen.shipping ?? SHIPPING_FLAT);

    // Total Cost = Display Cost + Shipping
    const totalCost = roundToCents(displayCost.plus(shipping));

    // Apply margin
    const margin = new Decimal(screen.margin ?? DEFAULT_MARGIN);
    // Price = Total Cost ÷ (1 - margin) for margin-based pricing
    const price = roundToCents(totalCost.div(new Decimal(1).minus(margin)));

    // ANC Margin = Price - Total Cost
    const ancMargin = roundToCents(price.minus(totalCost));

    // Bond = Price × Bond Rate (1.5%)
    const bondCost = roundToCents(price.times(BOND_RATE));

    // Total with Bond = Price + Bond Cost
    const totalWithBond = roundToCents(price.plus(bondCost));

    // Selling Price per Sq Ft = Total with Bond ÷ Total SQ FT
    const sellingSqFt = roundToCents(totalWithBond.div(totalSqFt));

    // REQ-124: Shipping uses Divisor Model (NOT markup) per Master Truth mandate
    // Natalia Math: ALL costs use P = C / (1 - M), shipping is NOT exempt
    const shippingSalePrice = roundToCents(shipping.div(new Decimal(1).minus(margin)));

    const row: ExcelPricingRow = {
      option: `${index + 1}`,
      issue: screen.name,
      vendor: "ANC",
      product: screen.product,
      pitch: `${screen.pitchMm}mm`,
      heightFeet: roundToCents(heightFeet).toNumber(),
      widthFeet: roundToCents(widthFeet).toNumber(),
      heightPixels,
      widthPixels,
      squareFeet: roundToCents(sqFt).toNumber(),
      quantity: quantity.toNumber(),
      totalSqFt: roundToCents(totalSqFt).toNumber(),
      ledNitRequirement: 3500, // Default from Westfield RFP
      ledServiceRequirement: "Front / Rear",
      ledCostPerSqFt: costPerSqFt.toNumber(),
      displayCost: displayCost.toNumber(),
      shipping: shipping.toNumber(),
      totalCost: totalCost.toNumber(),
      margin: margin.times(100).toNumber(), // Convert to percentage
      price: price.toNumber(),
      ancMargin: ancMargin.toNumber(),
      bondCost: bondCost.toNumber(),
      totalWithBond: totalWithBond.toNumber(),
      sellingSqFt: sellingSqFt.toNumber(),
      shippingSalePrice: shippingSalePrice.toNumber(),
    };

    rows.push(row);

    // Accumulate totals
    totals.totalDisplayCost = totals.totalDisplayCost.plus(displayCost);
    totals.totalShipping = totals.totalShipping.plus(shipping);
    totals.totalCost = totals.totalCost.plus(totalCost);
    totals.totalPrice = totals.totalPrice.plus(price);
    totals.totalAncMargin = totals.totalAncMargin.plus(ancMargin);
    totals.totalBond = totals.totalBond.plus(bondCost);
    totals.grandTotal = totals.grandTotal.plus(totalWithBond);
    totals.totalSqFt = totals.totalSqFt.plus(totalSqFt);
  });

  return {
    rows,
    totals: {
      totalDisplayCost: roundToCents(totals.totalDisplayCost).toNumber(),
      totalShipping: roundToCents(totals.totalShipping).toNumber(),
      totalCost: roundToCents(totals.totalCost).toNumber(),
      totalPrice: roundToCents(totals.totalPrice).toNumber(),
      totalAncMargin: roundToCents(totals.totalAncMargin).toNumber(),
      totalBond: roundToCents(totals.totalBond).toNumber(),
      grandTotal: roundToCents(totals.grandTotal).toNumber(),
      totalSqFt: roundToCents(totals.totalSqFt).toNumber(),
    },
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
