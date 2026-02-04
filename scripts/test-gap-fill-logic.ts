/**
 * Test Gap Fill Logic Engine
 * 
 * Verifies that generateGapFillQuestions correctly identifies missing P0/P1 fields
 * per the "17/20 Rule" defined in the PRD.
 * 
 * Usage:
 *   npx tsx scripts/test-gap-fill-logic.ts
 */

import { generateGapFillQuestions } from "../lib/gap-fill-questions";

/**
 * Create mock proposal with missing P0/P1 fields
 */
function createMockProposal() {
    return {
        receiver: {
            name: "Test Client",
            email: "client@example.com",
        },
        details: {
            proposalName: "Test Proposal",
            venue: "Test Venue",
            screens: [
                {
                    name: "North Upper Display",
                    pitchMm: null, // MISSING P0 field (Pixel Pitch)
                    serviceType: null, // MISSING P1 field (Service Type)
                    cabinetHeight: 20, // EXISTING data (should be ignored)
                    widthFt: 40,
                    heightFt: 20,
                    quantity: 1,
                },
                {
                    name: "South Lower Display",
                    pitchMm: 10, // EXISTING data (should be ignored)
                    serviceType: "front", // EXISTING data (should be ignored)
                    cabinetHeight: 18,
                    widthFt: 30,
                    heightFt: 15,
                    quantity: 1,
                },
                {
                    name: "Center Hung Display",
                    pitchMm: null, // MISSING P0 field
                    serviceType: null, // MISSING P1 field
                    cabinetHeight: null, // Missing but not P0/P1
                    widthFt: 50,
                    heightFt: 25,
                    quantity: 1,
                },
            ],
        },
        aiFilledFields: [], // No AI-filled fields for this test
        verifiedFields: {}, // No verified fields
    };
}

/**
 * Main test execution
 */
async function main() {
    console.log("🧪 Gap Fill Logic Engine Test");
    console.log("=".repeat(60));
    console.log("Testing: generateGapFillQuestions()");
    console.log("=".repeat(60) + "\n");

    try {
        // Create mock proposal with missing fields
        const mockProposal = createMockProposal();
        
        console.log("📋 Mock Proposal Structure:");
        console.log("   Screens:", mockProposal.details.screens.length);
        console.log("   Screen 1: pitchMm =", mockProposal.details.screens[0].pitchMm, "(MISSING P0)");
        console.log("   Screen 1: serviceType =", mockProposal.details.screens[0].serviceType, "(MISSING P1)");
        console.log("   Screen 1: cabinetHeight =", mockProposal.details.screens[0].cabinetHeight, "(EXISTS)");
        console.log("   Screen 2: pitchMm =", mockProposal.details.screens[1].pitchMm, "(EXISTS)");
        console.log("   Screen 3: pitchMm =", mockProposal.details.screens[2].pitchMm, "(MISSING P0)");
        console.log("");

        // Generate gap fill questions
        console.log("🔍 Generating gap fill questions...\n");
        const questions = generateGapFillQuestions(mockProposal as any);

        console.log("📊 Results:");
        console.log("   Total Questions:", questions.length);
        console.log("");

        if (questions.length === 0) {
            console.log("⚠️  WARNING: No questions generated!");
            console.log("   Expected: Questions for missing pitchMm and serviceType");
            process.exit(1);
        }

        // Analyze questions
        const pitchQuestions = questions.filter(q => 
            q.fieldPath?.includes("pitchMm") || 
            q.fieldPath?.includes("pixelPitch") ||
            q.question?.toLowerCase().includes("pixel pitch") ||
            q.question?.toLowerCase().includes("pitch")
        );

        const serviceTypeQuestions = questions.filter(q =>
            q.fieldPath?.includes("serviceType") ||
            q.question?.toLowerCase().includes("service type") ||
            q.question?.toLowerCase().includes("front") ||
            q.question?.toLowerCase().includes("rear")
        );

        const cabinetHeightQuestions = questions.filter(q =>
            q.fieldPath?.includes("cabinetHeight")
        );

        console.log("✅ Question Analysis:");
        console.log("   Pixel Pitch Questions:", pitchQuestions.length, pitchQuestions.length > 0 ? "✅" : "❌");
        console.log("   Service Type Questions:", serviceTypeQuestions.length, serviceTypeQuestions.length > 0 ? "✅" : "❌");
        console.log("   Cabinet Height Questions:", cabinetHeightQuestions.length, cabinetHeightQuestions.length === 0 ? "✅ (correctly ignored)" : "❌ (should be ignored)");
        console.log("");

        // Display all questions
        console.log("📝 Generated Questions:");
        console.log("=".repeat(60));
        questions.forEach((q, index) => {
            console.log(`\n${index + 1}. ${q.question}`);
            console.log(`   Field: ${q.fieldPath || "N/A"}`);
            console.log(`   Type: ${q.type || "N/A"}`);
            console.log(`   Priority: ${q.priority || "N/A"}`);
            if (q.options) {
                console.log(`   Options: ${q.options.join(", ")}`);
            }
        });
        console.log("\n" + "=".repeat(60));

        // Verification
        console.log("\n🎯 Verification Results:");
        console.log("=".repeat(60));
        
        const hasPitchQuestion = pitchQuestions.length > 0;
        const hasServiceTypeQuestion = serviceTypeQuestions.length > 0;
        const ignoresCabinetHeight = cabinetHeightQuestions.length === 0;

        console.log("   Pixel Pitch (P0) Question Generated:", hasPitchQuestion ? "✅ YES" : "❌ NO");
        console.log("   Service Type (P1) Question Generated:", hasServiceTypeQuestion ? "✅ YES" : "❌ NO");
        console.log("   Cabinet Height Ignored:", ignoresCabinetHeight ? "✅ YES" : "❌ NO");

        const allChecksPassed = hasPitchQuestion && hasServiceTypeQuestion && ignoresCabinetHeight;

        console.log("\n" + "=".repeat(60));
        if (allChecksPassed) {
            console.log("✅ ALL VERIFICATIONS PASSED");
            console.log("   Gap Fill logic correctly identifies missing P0/P1 fields");
            console.log("   Gap Fill logic correctly ignores existing fields");
        } else {
            console.log("⚠️  SOME VERIFICATIONS FAILED");
            if (!hasPitchQuestion) console.log("   ❌ Missing Pixel Pitch question (P0 field)");
            if (!hasServiceTypeQuestion) console.log("   ❌ Missing Service Type question (P1 field)");
            if (!ignoresCabinetHeight) console.log("   ❌ Should ignore Cabinet Height (not P0/P1)");
        }
        console.log("=".repeat(60));

        // Output JSON for inspection
        console.log("\n📋 JSON Output:");
        console.log(JSON.stringify(questions, null, 2));

        process.exit(allChecksPassed ? 0 : 1);
    } catch (error: any) {
        console.error("\n❌ Test failed:", error.message);
        if (error.stack) {
            console.error("\nStack trace:", error.stack);
        }
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

export { createMockProposal };
