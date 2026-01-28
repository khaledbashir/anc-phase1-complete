export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";

// Services
import { generateProposalPdfService } from "@/services/proposal/server/generateProposalPdfService";

export async function POST(req: NextRequest) {
    const result = await generateProposalPdfService(req);
    return result;
}
