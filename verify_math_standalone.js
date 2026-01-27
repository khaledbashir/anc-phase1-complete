
// Standalone verification of the logic implemented in lib/estimator.ts

function calculateTotalWithBond(cost, marginPct) {
    // Ferrari Edition Divisor Model: P = C / (1 - M)
    const sellPrice = cost / (1 - (marginPct / 100));
    // Bond is 1.5% of the Sell Price
    const bond = sellPrice * 0.015;
    const total = sellPrice + bond;

    return {
        sellPrice: Math.round(sellPrice * 100) / 100,
        bond: Math.round(bond * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}

// Test Case: Cost $200,000, Margin 20%
const cost = 200000;
const margin = 20; // 20%

console.log("--- MATH VERIFICATION ---");
const result = calculateTotalWithBond(cost, margin);
console.log(`Input: Cost $${cost.toLocaleString()}, Margin ${margin}%`);
console.log(`Sell Price: $${result.sellPrice.toLocaleString()} (Expected: $250,000)`);
console.log(`Bond: $${result.bond.toLocaleString()} (Expected: $3,750)`);
console.log(`Total: $${result.total.toLocaleString()} (Expected: $253,750)`);

if (result.total === 253750) {
    console.log("✅ PASS: Math verified.");
} else {
    console.log("❌ FAIL: Math incorrect.");
    process.exit(1);
}
