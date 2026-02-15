import { NextResponse } from "next/server";
import { getFullRateCard } from "@/services/rfp/rateCardLoader";

/**
 * GET /api/estimator/rates
 * Returns the full rate card as Record<string, number>.
 * Merges DB values over hardcoded defaults (30s cache in rateCardLoader).
 */
export async function GET() {
    try {
        const rates = await getFullRateCard();
        return NextResponse.json({ rates });
    } catch (error) {
        console.error("GET /api/estimator/rates error:", error);
        return NextResponse.json(
            { error: "Failed to load rate card" },
            { status: 500 }
        );
    }
}
