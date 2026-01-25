import { NextRequest } from "next/server";

// Services
import { exportProposalService } from "@/services/invoice/server/exportProposalService";

export async function POST(req: NextRequest) {
    const result = await exportProposalService(req);
    return result;
}
