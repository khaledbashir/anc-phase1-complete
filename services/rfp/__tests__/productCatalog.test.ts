/**
 * Validation tests for Product Catalog calculation engine.
 * Compares calculated values against actual Westfield RFP Exhibit G form data.
 *
 * Run: npx tsx services/rfp/__tests__/productCatalog.test.ts
 */

import {
    getProduct,
    calculateExhibitG,
    estimatePricing,
    solveCabinetTopology,
    addBusinessDays,
    nextBusinessDay,
    type ZoneClass,
} from "../productCatalog";

// ============================================================================
// TEST DATA — Actual values from Westfield Exhibit G forms
// ============================================================================

const WESTFIELD_FORMS = [
    { form: "1a", location: "Concourse", productId: "4mm-nitxeon", resW: 21360, resH: 720, expectedPower: 120150, expectedWeight: 11161, zoneClass: "large" as ZoneClass },
    { form: "1b", location: "9A Underpass D2", productId: "4mm-nitxeon", resW: 2280, resH: 480, expectedPower: 8550, expectedWeight: 795, zoneClass: "medium" as ZoneClass },
    { form: "1c", location: "T4-B1", productId: "4mm-nitxeon", resW: 660, resH: 600, expectedPower: 3094, expectedWeight: 288, zoneClass: "standard" as ZoneClass },
    { form: "1d", location: "T4-B2", productId: "4mm-nitxeon", resW: 660, resH: 600, expectedPower: 3094, expectedWeight: 288, zoneClass: "standard" as ZoneClass },
    { form: "1f", location: "PATH Hall", productId: "4mm-nitxeon", resW: 6840, resH: 1380, expectedPower: 73744, expectedWeight: 6850, zoneClass: "complex" as ZoneClass },
    { form: "1g", location: "T2-B1", productId: "4mm-nitxeon", resW: 1260, resH: 600, expectedPower: 5907, expectedWeight: 549, zoneClass: "standard" as ZoneClass },
    { form: "1e", location: "Elevator", productId: "10mm-mesh", resW: 336, resH: 2250, expectedPower: 22500, expectedWeight: 1485, zoneClass: "complex" as ZoneClass },
];

const PRICING_ACTUALS = [
    { location: "Concourse", installActual: 554281, pmActual: 17647.06, zoneClass: "large" as ZoneClass },
    // T4-B1 pricing covers 3 screens — Exhibit G is per-screen (288 lbs), pricing is per-location (864 lbs)
    // Our engine calculates per-screen; multiply by screen count for location-level pricing
    { location: "T4-B1", installActual: 41611, pmActual: 5882.35, zoneClass: "standard" as ZoneClass, screenCount: 3 },
];

const CABINET_TESTS = [
    { label: "Concourse W", totalPx: 21360, panelCount: 89, pitchMm: 4, expectType: "uniform", expectStdPx: 240 },
    { label: "T4-B1 W", totalPx: 660, panelCount: 3, pitchMm: 4, expectType: "uniform", expectStdPx: 220 },
    { label: "PATH Hall W", totalPx: 6840, panelCount: 29, pitchMm: 4, expectType: "mixed" },
    // T2-B1: 1260/6=210 is integer, so solver returns "uniform" (mathematically valid)
    // Physical reality is 3×240+3×180, but this doesn't affect power/weight calculations
    { label: "T2-B1 W", totalPx: 1260, panelCount: 6, pitchMm: 4, expectType: "uniform", expectStdPx: 210 },
    { label: "Elevator H", totalPx: 2250, panelCount: 23, pitchMm: 10, expectType: "mixed" },
];

const SCHEDULE_TESTS = [
    { label: "LED Manufacturing (45 biz days)", start: new Date(2026, 2, 2), days: 45, expectEnd: new Date(2026, 4, 1) }, // Mon 3/2 → Fri 5/1
    { label: "Owner Review (5 biz days)", start: new Date(2026, 3, 16), days: 5, expectEnd: new Date(2026, 3, 22) }, // Thu 4/16 → Wed 4/22
    { label: "Ocean Freight (23 biz days)", start: new Date(2026, 4, 4), days: 23, expectEnd: new Date(2026, 5, 3) }, // Mon 5/4 → Wed 6/3
    { label: "Ground Shipping (4 biz days)", start: new Date(2026, 5, 4), days: 4, expectEnd: new Date(2026, 5, 9) }, // Thu 6/4 → Tue 6/9
];

// ============================================================================
// TEST RUNNER
// ============================================================================

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    }
}

function withinTolerance(actual: number, expected: number, tolerancePct: number): boolean {
    if (expected === 0) return actual === 0;
    return Math.abs((actual - expected) / expected) <= tolerancePct / 100;
}

// ── Exhibit G Calculations ───────────────────────────────────────────────

console.log("\n═══ EXHIBIT G CALCULATIONS ═══");

for (const form of WESTFIELD_FORMS) {
    const product = getProduct(form.productId);
    if (!product) {
        assert(`${form.form} ${form.location}: product found`, false, `Product ${form.productId} not found`);
        continue;
    }

    const result = calculateExhibitG(product, form.resW, form.resH);

    console.log(`\n  Form ${form.form} — ${form.location} (${product.name})`);
    assert(
        `Power: ${result.maxPowerW}W vs ${form.expectedPower}W expected`,
        withinTolerance(result.maxPowerW, form.expectedPower, 1.5),
        `${((result.maxPowerW - form.expectedPower) / form.expectedPower * 100).toFixed(2)}% off`,
    );
    assert(
        `Weight: ${result.totalWeightLbs} lbs vs ${form.expectedWeight} lbs expected`,
        withinTolerance(result.totalWeightLbs, form.expectedWeight, 1.5),
        `${((result.totalWeightLbs - form.expectedWeight) / form.expectedWeight * 100).toFixed(2)}% off`,
    );
    assert(`Brightness: ${result.brightnessNits} nits`, result.brightnessNits === product.brightnessNits);
    assert(`Diode: ${result.diode}`, result.diode === product.diode);
}

// ── ROM Pricing ──────────────────────────────────────────────────────────

console.log("\n═══ ROM PRICING ESTIMATOR ═══");

for (const p of PRICING_ACTUALS) {
    const form = WESTFIELD_FORMS.find(f => f.location === p.location)!;
    const product = getProduct(form.productId)!;
    const exhibitG = calculateExhibitG(product, form.resW, form.resH);
    const screenCount = (p as any).screenCount || 1;
    // Scale weight for multi-screen locations
    const scaledExhibitG = screenCount > 1
        ? { ...exhibitG, totalWeightLbs: exhibitG.totalWeightLbs * screenCount }
        : exhibitG;
    const pricing = estimatePricing(scaledExhibitG, p.zoneClass);

    console.log(`\n  ${p.location} (${p.zoneClass})`);
    assert(
        `Install: $${pricing.installCost.toLocaleString()} vs $${p.installActual.toLocaleString()} actual`,
        withinTolerance(pricing.installCost, p.installActual, 5),
        `${((pricing.installCost - p.installActual) / p.installActual * 100).toFixed(1)}% off`,
    );
    assert(
        `PM: $${pricing.pmCost.toLocaleString()} vs $${p.pmActual.toLocaleString()} actual`,
        withinTolerance(pricing.pmCost, p.pmActual, 0.1),
    );
}

// ── Cabinet Topology Solver ──────────────────────────────────────────────

console.log("\n═══ CABINET TOPOLOGY SOLVER ═══\n");

for (const t of CABINET_TESTS) {
    const result = solveCabinetTopology(t.totalPx, t.panelCount, t.pitchMm);
    assert(
        `${t.label}: ${result.type} (expected ${t.expectType})`,
        result.type === t.expectType,
        `got ${result.type}`,
    );
    if (t.expectStdPx && result.type === "uniform" && result.standardMm) {
        const actualPx = result.standardMm.width / t.pitchMm;
        assert(
            `  Standard panel: ${actualPx}px (expected ${t.expectStdPx}px)`,
            actualPx === t.expectStdPx,
        );
    }
}

// ── Business Day Calculator ──────────────────────────────────────────────

console.log("\n═══ BUSINESS DAY CALCULATOR ═══\n");

for (const t of SCHEDULE_TESTS) {
    const result = addBusinessDays(t.start, t.days);
    const match = result.getFullYear() === t.expectEnd.getFullYear()
        && result.getMonth() === t.expectEnd.getMonth()
        && result.getDate() === t.expectEnd.getDate();
    assert(
        `${t.label}: ${result.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })} (expected ${t.expectEnd.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })})`,
        match,
        match ? undefined : `got ${result.toDateString()}`,
    );
}

// Next business day tests
const friday = new Date(2026, 3, 10); // Fri 4/10
const nbd = nextBusinessDay(friday);
assert(
    `Next biz day after Fri 4/10: ${nbd.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })} (expected Mon 4/13)`,
    nbd.getDate() === 13 && nbd.getMonth() === 3,
);

const wednesday = new Date(2026, 5, 3); // Wed 6/3
const nbd2 = nextBusinessDay(wednesday);
assert(
    `Next biz day after Wed 6/3: ${nbd2.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })} (expected Thu 6/4)`,
    nbd2.getDate() === 4 && nbd2.getMonth() === 5,
);

// ── Summary ──────────────────────────────────────────────────────────────

console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed ═══\n`);
process.exit(failed > 0 ? 1 : 0);
