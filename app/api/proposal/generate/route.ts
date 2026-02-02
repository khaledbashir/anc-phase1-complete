export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";

// Services
import { generateProposalPdfServiceV2 } from "@/services/proposal/server/generateProposalPdfServiceV2";

export async function POST(req: NextRequest) {
    const result = await generateProposalPdfServiceV2(req);
    return result;
}
