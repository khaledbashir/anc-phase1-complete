
const { calculateTotalWithBond, calculatePerScreenAudit } = require('./lib/estimator');

// Mock helper if roundToCents is not exported or available globally in that file context when running via node
// (Assuming roundToCents is local to estimator.ts or imported. If imported, this script might fail if run directly content-wise. 
//  I'll just try to require the file. If it fails due to imports, I'll need to use ts-node or just copy the logic to test.)

// Let's rely on the function logic verification.
// Test Case: Cost $200,000, Margin 20%
const cost = 200000;
const margin = 20; // 20%

const result = calculateTotalWithBond(cost, margin);
console.log(`Test 1 (calculateTotalWithBond): Cost $${cost}, Margin ${margin}%`);
console.log(`Sell Price: $${result.sellPrice} (Expected: $250,000)`);
console.log(`Bond: $${result.bond} (Expected: $3,750)`);
console.log(`Total: $${result.total} (Expected: $253,750)`);

if (result.total === 253750) {
    console.log("PASS: Math verified.");
} else {
    console.log("FAIL: Math incorrect.");
}

// Test 2: Area Calculation
// User reported Width x Height returning 0.
const screenInput = {
    name: "Test Screen",
    widthFt: 10,
    heightFt: 10,
    quantity: 1,
    costPerSqFt: 100, // $100/sqft -> $10,000 hardware
    desiredMargin: 0.20,
    pitchMm: 10,
    serviceType: "Front/Rear", // 20% overhead
    formFactor: "Straight"
};

// Start logic for verify
// Hardware = 10 * 10 * 100 = 10,000
// Structure (20%) = 2,000
// Labor (15%) = 1,500
// Power (15%) = 1,500
// Shipping (0.14 * 100) = 14
// PM (0.5 * 100) = 50
// GC (2%) = 200
// Travel (3%) = 300
// Submittals (1%) = 100
// Engineering (2%) = 200
// Permits = 500
// CMS (2%) = 200
// Install = 5000
// Total Cost = Sum of above
// Sell Price = Total Cost / 0.8
// Bond = Sell Price * 0.015
// Total = Sell Price + Bond

console.log("\nTest 2: Full Audit Logic Check");
// We can't easily run calculatePerScreenAudit because of imports in the file ('./catalog'). 
// I will just inspect the code again.
