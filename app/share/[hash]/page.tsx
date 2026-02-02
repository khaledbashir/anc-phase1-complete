import { notFound } from "next/navigation";
import ProposalTemplate2 from "@/app/components/templates/proposal-pdf/ProposalTemplate2";
import { ProposalType } from "@/types";
import LogoSelector from "@/app/components/reusables/LogoSelector";
import { prisma } from "@/lib/prisma";

async function getProjectByHash(hash: string) {
    // REQ-34: Read-Only Share Link Snapshotting
    // Retrieve the static, sanitized JSON snapshot instead of live data
    const snapshot = await prisma.proposalSnapshot.findUnique({
        where: { shareHash: hash }
    });

    if (!snapshot) {
        // Fallback for legacy links? Or return null to force 404?
        // For now, let's return null to ensure security (only serve snapshots)
        return null;
    }

    try {
        const data = JSON.parse(snapshot.snapshotData);
        return data;
    } catch (e) {
        console.error("Failed to parse proposal snapshot", e);
        return null;
    }
}

export default async function SharePage({ params }: { params: Promise<{ hash: string }> }) {
    const { hash } = await params;
    const project = await getProjectByHash(hash);

    if (!project) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center py-12 px-4">
            {/* Branding Header for Share View */}
            <div className="w-full max-w-[850px] flex justify-between items-center mb-8">
                <LogoSelector theme="light" width={140} height={50} />
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Portal</p>
                    <p className="text-xs font-medium text-slate-400">Secure Proposal View</p>
                </div>
            </div>

            {/* The Proposal Container */}
            <div className="w-full max-w-[850px] bg-white shadow-2xl min-h-[1100px] overflow-hidden">
                <ProposalTemplate2 {...(project as ProposalType)} isSharedView={true} />
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                Proprietary & Confidential
            </div>
        </div>
    );
}
