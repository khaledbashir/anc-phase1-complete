/**
 * RAG Accuracy Stress Test
 * 
 * Validates Enhanced RAG Extraction logic against real-world RFPs:
 * - Jacksonville Jaguars (Section 11 06 60 - LED Display Systems Schedule)
 * - WVU Coliseum (Section 11 63 10.01 - Coliseum LED Display Systems)
 * 
 * Verification Criteria:
 * - Jacksonville: Extract "NE Low Head Height Entry" as 4mm pixel pitch
 * - WVU: Extract "Center Hung LED Assembly" weight limit as 60,000 lbs
 * - Citations: Every value includes [Source: Section X, Page Y]
 * - Confidence: List High (>0.95) vs Low (<0.60) confidence fields
 */

import { RfpExtractionService } from "../services/rfp/server/RfpExtractionService";

interface ExtractionTestResult {
    document: string;
    workspaceSlug: string;
    extractionAccuracy: "High" | "Standard";
    screens: Array<{
        name: string;
        pixelPitch?: { value: number; citation: string; confidence: number };
        weightLimit?: { value: number; citation: string; confidence: number };
        [key: string]: any;
    }>;
    highConfidenceFields: number;
    lowConfidenceFields: number;
    missingFields: string[];
    citations: Array<{ field: string; citation: string }>;
    validationResults: {
        jacksonville4mmPitch?: boolean;
        wvu60000lbsWeight?: boolean;
        allFieldsHaveCitations?: boolean;
    };
}

/**
 * Test Jacksonville Jaguars RFP extraction
 */
async function testJacksonvilleExtraction(): Promise<ExtractionTestResult> {
    console.log("🔍 Testing Jacksonville Jaguars RFP extraction...");
    
    const workspaceSlug = "jacksonville-jaguars"; // Adjust based on actual workspace name
    
    try {
        const extractedData = await RfpExtractionService.extractFromWorkspace(workspaceSlug);
        
        // Find "NE Low Head Height Entry" screen
        const neLowHeadScreen = extractedData.screens?.find((s: any) => 
            s.name?.value?.toLowerCase().includes("ne low head") ||
            s.name?.value?.toLowerCase().includes("low head height")
        );
        
        // Validate 4mm pixel pitch
        const pitch4mm = neLowHeadScreen?.pixelPitch?.value === 4 ||
                         neLowHeadScreen?.pixelPitch?.value === "4mm" ||
                         neLowHeadScreen?.pitchMm?.value === 4;
        
        // Collect citations
        const citations: Array<{ field: string; citation: string }> = [];
        extractedData.screens?.forEach((screen: any, idx: number) => {
            Object.entries(screen).forEach(([key, value]: [string, any]) => {
                if (value && typeof value === 'object' && value.citation) {
                    citations.push({ field: `screens[${idx}].${key}`, citation: value.citation });
                }
            });
        });
        
        // Count confidence levels
        let highConfidence = 0;
        let lowConfidence = 0;
        const missingFields: string[] = [];
        
        extractedData.screens?.forEach((screen: any) => {
            Object.entries(screen).forEach(([key, value]: [string, any]) => {
                if (value && typeof value === 'object' && 'confidence' in value) {
                    if (value.confidence >= 0.95) highConfidence++;
                    else if (value.confidence < 0.60) lowConfidence++;
                } else if (value === null || value === undefined) {
                    missingFields.push(key);
                }
            });
        });
        
        return {
            document: "Jacksonville Jaguars RFP",
            workspaceSlug,
            extractionAccuracy: extractedData.extractionAccuracy || "Standard",
            screens: extractedData.screens || [],
            highConfidenceFields: highConfidence,
            lowConfidenceFields: lowConfidence,
            missingFields,
            citations,
            validationResults: {
                jacksonville4mmPitch: pitch4mm,
                allFieldsHaveCitations: citations.length > 0 && citations.every(c => c.citation.includes("Source:")),
            },
        };
    } catch (error: any) {
        console.error("Jacksonville extraction error:", error);
        return {
            document: "Jacksonville Jaguars RFP",
            workspaceSlug,
            extractionAccuracy: "Standard",
            screens: [],
            highConfidenceFields: 0,
            lowConfidenceFields: 0,
            missingFields: [],
            citations: [],
            validationResults: {},
        };
    }
}

/**
 * Test WVU Coliseum RFP extraction
 */
async function testWVUExtraction(): Promise<ExtractionTestResult> {
    console.log("🔍 Testing WVU Coliseum RFP extraction...");
    
    const workspaceSlug = "wvu-coliseum"; // Adjust based on actual workspace name
    
    try {
        const extractedData = await RfpExtractionService.extractFromWorkspace(workspaceSlug);
        
        // Find "Center Hung LED Assembly" screen
        const centerHungScreen = extractedData.screens?.find((s: any) => 
            s.name?.value?.toLowerCase().includes("center hung") ||
            s.name?.value?.toLowerCase().includes("center-hung")
        );
        
        // Look for weight limit (60,000 lbs) - might be in structural tonnage or rules
        const weight60000lbs = 
            centerHungScreen?.weightLimit?.value === 60000 ||
            centerHungScreen?.structuralTonnage?.value === 60000 ||
            extractedData.rulesDetected?.structuralTonnage?.value === 60000 ||
            extractedData.rulesDetected?.weightLimit?.value === 60000;
        
        // Collect citations
        const citations: Array<{ field: string; citation: string }> = [];
        extractedData.screens?.forEach((screen: any, idx: number) => {
            Object.entries(screen).forEach(([key, value]: [string, any]) => {
                if (value && typeof value === 'object' && value.citation) {
                    citations.push({ field: `screens[${idx}].${key}`, citation: value.citation });
                }
            });
        });
        
        // Count confidence levels
        let highConfidence = 0;
        let lowConfidence = 0;
        const missingFields: string[] = [];
        
        extractedData.screens?.forEach((screen: any) => {
            Object.entries(screen).forEach(([key, value]: [string, any]) => {
                if (value && typeof value === 'object' && 'confidence' in value) {
                    if (value.confidence >= 0.95) highConfidence++;
                    else if (value.confidence < 0.60) lowConfidence++;
                } else if (value === null || value === undefined) {
                    missingFields.push(key);
                }
            });
        });
        
        return {
            document: "WVU Coliseum RFP",
            workspaceSlug,
            extractionAccuracy: extractedData.extractionAccuracy || "Standard",
            screens: extractedData.screens || [],
            highConfidenceFields: highConfidence,
            lowConfidenceFields: lowConfidence,
            missingFields,
            citations,
            validationResults: {
                wvu60000lbsWeight: weight60000lbs,
                allFieldsHaveCitations: citations.length > 0 && citations.every(c => c.citation.includes("Source:")),
            },
        };
    } catch (error: any) {
        console.error("WVU extraction error:", error);
        return {
            document: "WVU Coliseum RFP",
            workspaceSlug,
            extractionAccuracy: "Standard",
            screens: [],
            highConfidenceFields: 0,
            lowConfidenceFields: 0,
            missingFields: [],
            citations: [],
            validationResults: {},
        };
    }
}

/**
 * Run stress test and generate report
 */
async function runStressTest() {
    console.log("🚀 Starting RAG Accuracy Stress Test...\n");
    
    const results: ExtractionTestResult[] = [];
    
    // Test Jacksonville
    const jacksonvilleResult = await testJacksonvilleExtraction();
    results.push(jacksonvilleResult);
    
    // Test WVU
    const wvuResult = await testWVUExtraction();
    results.push(wvuResult);
    
    // Generate summary report
    console.log("\n" + "=".repeat(80));
    console.log("📊 RAG ACCURACY STRESS TEST RESULTS");
    console.log("=".repeat(80) + "\n");
    
    results.forEach(result => {
        console.log(`📄 ${result.document}`);
        console.log(`   Workspace: ${result.workspaceSlug}`);
        console.log(`   Extraction Accuracy: ${result.extractionAccuracy}`);
        console.log(`   Screens Found: ${result.screens.length}`);
        console.log(`   High Confidence Fields: ${result.highConfidenceFields}`);
        console.log(`   Low Confidence Fields: ${result.lowConfidenceFields}`);
        console.log(`   Missing Fields: ${result.missingFields.length}`);
        console.log(`   Citations: ${result.citations.length}`);
        
        console.log("\n   Validation Results:");
        if (result.document.includes("Jacksonville")) {
            console.log(`   ✅ 4mm Pixel Pitch Found: ${result.validationResults.jacksonville4mmPitch ? "YES" : "NO"}`);
        }
        if (result.document.includes("WVU")) {
            console.log(`   ✅ 60,000 lbs Weight Limit Found: ${result.validationResults.wvu60000lbsWeight ? "YES" : "NO"}`);
        }
        console.log(`   ✅ All Fields Have Citations: ${result.validationResults.allFieldsHaveCitations ? "YES" : "NO"}`);
        
        console.log("\n   Sample Citations:");
        result.citations.slice(0, 5).forEach(c => {
            console.log(`   - ${c.field}: ${c.citation}`);
        });
        
        console.log("\n" + "-".repeat(80) + "\n");
    });
    
    // Overall assessment
    const allTestsPassed = results.every(r => 
        (r.validationResults.jacksonville4mmPitch !== false) &&
        (r.validationResults.wvu60000lbsWeight !== false) &&
        r.validationResults.allFieldsHaveCitations
    );
    
    console.log("🎯 OVERALL ASSESSMENT:");
    console.log(`   Division 11 Priority: ${results.some(r => r.extractionAccuracy === "High") ? "✅ WORKING" : "⚠️ NEEDS REVIEW"}`);
    console.log(`   Citation System: ${results.every(r => r.citations.length > 0) ? "✅ WORKING" : "⚠️ NEEDS REVIEW"}`);
    console.log(`   Confidence Scoring: ${results.some(r => r.highConfidenceFields > 0) ? "✅ WORKING" : "⚠️ NEEDS REVIEW"}`);
    console.log(`   Master Truth Validation: ${allTestsPassed ? "✅ PASSED" : "⚠️ NEEDS REVIEW"}`);
    
    return results;
}

// Run if executed directly
if (require.main === module) {
    runStressTest()
        .then(() => {
            console.log("\n✅ Stress test completed");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ Stress test failed:", error);
            process.exit(1);
        });
}

export { runStressTest, testJacksonvilleExtraction, testWVUExtraction };
