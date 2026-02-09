/**
 * Dashboard Intelligence — P77
 *
 * Provides pipeline view, total value, activity feed, and quick stats
 * for the /dashboard page. Queries Prisma for proposal aggregates.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineStage {
    status: string;
    count: number;
    totalValue: number;
    label: string;
    color: string;
}

export interface DashboardStats {
    totalProposals: number;
    totalPipelineValue: number;
    avgDealSize: number;
    proposalsThisMonth: number;
    winRate: number; // percentage
    pipeline: PipelineStage[];
    recentActivity: ActivityItem[];
    topClients: Array<{ name: string; count: number; totalValue: number }>;
}

export interface ActivityItem {
    id: string;
    type: "created" | "updated" | "signed" | "shared" | "exported";
    proposalName: string;
    clientName: string;
    timestamp: string;
    description: string;
}

// ============================================================================
// PIPELINE STAGES
// ============================================================================

const PIPELINE_STAGES: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "#6B7280" },
    REVIEW: { label: "In Review", color: "#F59E0B" },
    SENT: { label: "Sent", color: "#3B82F6" },
    NEGOTIATION: { label: "Negotiation", color: "#8B5CF6" },
    SIGNED: { label: "Signed", color: "#10B981" },
    CLOSED: { label: "Closed", color: "#EF4444" },
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Build dashboard stats from raw proposal data.
 * This is a pure function — call it with data from Prisma.
 */
export function buildDashboardStats(
    proposals: Array<{
        id: string;
        clientName: string;
        status: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        internalAudit?: string | null;
        clientSummary?: string | null;
        details?: any;
    }>
): DashboardStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Extract total values from proposals
    const proposalValues = proposals.map((p) => {
        let totalValue = 0;
        try {
            if (p.internalAudit) {
                const audit = typeof p.internalAudit === "string" ? JSON.parse(p.internalAudit) : p.internalAudit;
                totalValue = audit?.totals?.finalClientTotal || 0;
            }
        } catch { /* ignore parse errors */ }
        return { ...p, totalValue };
    });

    // Pipeline stages
    const pipeline: PipelineStage[] = Object.entries(PIPELINE_STAGES).map(([status, meta]) => {
        const matching = proposalValues.filter((p) => p.status === status);
        return {
            status,
            count: matching.length,
            totalValue: matching.reduce((sum, p) => sum + p.totalValue, 0),
            label: meta.label,
            color: meta.color,
        };
    });

    // Total pipeline value
    const totalPipelineValue = proposalValues.reduce((sum, p) => sum + p.totalValue, 0);
    const avgDealSize = proposals.length > 0 ? totalPipelineValue / proposals.length : 0;

    // This month
    const proposalsThisMonth = proposals.filter(
        (p) => new Date(p.createdAt) >= monthStart
    ).length;

    // Win rate
    const signedCount = proposals.filter((p) => p.status === "SIGNED").length;
    const sentOrBeyond = proposals.filter((p) =>
        ["SENT", "NEGOTIATION", "SIGNED", "CLOSED"].includes(p.status)
    ).length;
    const winRate = sentOrBeyond > 0 ? (signedCount / sentOrBeyond) * 100 : 0;

    // Recent activity (last 10 updated)
    const recentActivity: ActivityItem[] = [...proposals]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10)
        .map((p) => ({
            id: p.id,
            type: p.status === "SIGNED" ? "signed" as const : "updated" as const,
            proposalName: (p.details as any)?.proposalName || `Proposal for ${p.clientName}`,
            clientName: p.clientName,
            timestamp: new Date(p.updatedAt).toISOString(),
            description: `${p.clientName} — ${PIPELINE_STAGES[p.status]?.label || p.status}`,
        }));

    // Top clients
    const clientMap = new Map<string, { count: number; totalValue: number }>();
    for (const p of proposalValues) {
        const existing = clientMap.get(p.clientName) || { count: 0, totalValue: 0 };
        existing.count++;
        existing.totalValue += p.totalValue;
        clientMap.set(p.clientName, existing);
    }
    const topClients = Array.from(clientMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

    return {
        totalProposals: proposals.length,
        totalPipelineValue,
        avgDealSize,
        proposalsThisMonth,
        winRate,
        pipeline,
        recentActivity,
        topClients,
    };
}
