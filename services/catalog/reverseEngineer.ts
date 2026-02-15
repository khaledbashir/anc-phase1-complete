import { prisma } from "@/lib/prisma";

export interface ReverseQuery {
    targetBudget: number;
    widthFt: number;
    heightFt: number;
    isIndoor: boolean;
    marginPercent?: number;
    includeBondTax?: boolean;
    bondRate?: number;
    salesTaxRate?: number;
}

export interface FeasibleOption {
    product: {
        id: string;
        manufacturer: string;
        modelNumber: string;
        displayName: string;
        pixelPitch: number;
        maxNits: number;
        environment: string;
    };
    layout: {
        columns: number;
        rows: number;
        totalCabinets: number;
        actualWidthFt: number;
        actualHeightFt: number;
        actualAreaSqFt: number;
    };
    pricing: {
        hardwareCost: number;
        hardwareSell: number;
        estimatedServicesCost: number;
        estimatedTotal: number;
        headroom: number;
        percentOfBudget: number;
    };
    fitScore: number;
    rank: number;
}

const PITCH_COST_FALLBACK: Record<string, number> = {
    "2.5": 175,
    "3.9": 120,
    "6": 80,
    "10": 45,
};

function estimateCostPerSqFt(pixelPitch: number): number {
    // Find the closest known pitch and interpolate
    const pitches = Object.keys(PITCH_COST_FALLBACK)
        .map(Number)
        .sort((a, b) => a - b);

    if (pixelPitch <= pitches[0]) return PITCH_COST_FALLBACK[pitches[0].toString()];
    if (pixelPitch >= pitches[pitches.length - 1])
        return PITCH_COST_FALLBACK[pitches[pitches.length - 1].toString()];

    // Linear interpolation between two nearest pitches
    for (let i = 0; i < pitches.length - 1; i++) {
        if (pixelPitch >= pitches[i] && pixelPitch <= pitches[i + 1]) {
            const ratio =
                (pixelPitch - pitches[i]) / (pitches[i + 1] - pitches[i]);
            const costLow = PITCH_COST_FALLBACK[pitches[i].toString()];
            const costHigh = PITCH_COST_FALLBACK[pitches[i + 1].toString()];
            return costLow + ratio * (costHigh - costLow);
        }
    }

    return 120; // safe default
}

export async function reverseEngineer(
    query: ReverseQuery
): Promise<FeasibleOption[]> {
    const margin = query.marginPercent ?? 30;
    const marginFraction = margin / 100;
    const bondRate = query.bondRate ?? 0.015;
    const taxRate = query.salesTaxRate ?? 0.095;
    const applyBondTax = query.includeBondTax ?? true;

    const targetEnv = query.isIndoor ? "indoor" : "outdoor";

    // Fetch all active products matching environment
    const dbProducts = await prisma.manufacturerProduct.findMany({
        where: {
            isActive: true,
            OR: [
                { environment: targetEnv },
                { environment: "indoor_outdoor" },
            ],
        },
        orderBy: { pixelPitch: "asc" },
    });

    if (dbProducts.length === 0) return [];

    const targetWidthMm = query.widthFt * 304.8;
    const targetHeightMm = query.heightFt * 304.8;

    const options: FeasibleOption[] = [];

    for (const product of dbProducts) {
        // Cabinet layout
        const columns = Math.max(
            1,
            Math.ceil(targetWidthMm / product.cabinetWidthMm)
        );
        const rows = Math.max(
            1,
            Math.ceil(targetHeightMm / product.cabinetHeightMm)
        );
        const totalCabinets = columns * rows;

        const actualWidthMm = columns * product.cabinetWidthMm;
        const actualHeightMm = rows * product.cabinetHeightMm;
        const actualWidthFt = actualWidthMm / 304.8;
        const actualHeightFt = actualHeightMm / 304.8;
        const actualAreaSqFt = actualWidthFt * actualHeightFt;

        // Hardware cost
        const costPerSqFt = product.costPerSqFt
            ? Number(product.costPerSqFt)
            : estimateCostPerSqFt(product.pixelPitch);

        const hardwareCost = actualAreaSqFt * costPerSqFt;
        const hardwareSell = hardwareCost / (1 - marginFraction);

        // Services estimate: 35% of hardware cost (ROM)
        const estimatedServicesCost = hardwareCost * 0.35;
        const servicesSell = estimatedServicesCost / (1 - 0.2); // 20% services margin

        let subtotal = hardwareSell + servicesSell;

        // Bond + tax
        if (applyBondTax) {
            const bond = subtotal * bondRate;
            const tax = subtotal * taxRate;
            subtotal = subtotal + bond + tax;
        }

        const estimatedTotal = Math.round(subtotal);

        // Skip if over budget
        if (estimatedTotal > query.targetBudget) continue;

        // Fit score: how close the actual area is to the requested area
        const requestedAreaSqFt = query.widthFt * query.heightFt;
        const areaRatio =
            Math.min(actualAreaSqFt, requestedAreaSqFt) /
            Math.max(actualAreaSqFt, requestedAreaSqFt);
        const widthRatio =
            Math.min(actualWidthFt, query.widthFt) /
            Math.max(actualWidthFt, query.widthFt);
        const heightRatio =
            Math.min(actualHeightFt, query.heightFt) /
            Math.max(actualHeightFt, query.heightFt);
        const fitScore = Math.round(areaRatio * widthRatio * heightRatio * 100);

        const headroom = query.targetBudget - estimatedTotal;
        const percentOfBudget = Math.round(
            (estimatedTotal / query.targetBudget) * 100
        );

        options.push({
            product: {
                id: product.id,
                manufacturer: product.manufacturer,
                modelNumber: product.modelNumber,
                displayName: product.displayName,
                pixelPitch: product.pixelPitch,
                maxNits: product.maxNits,
                environment: product.environment,
            },
            layout: {
                columns,
                rows,
                totalCabinets,
                actualWidthFt: Math.round(actualWidthFt * 100) / 100,
                actualHeightFt: Math.round(actualHeightFt * 100) / 100,
                actualAreaSqFt: Math.round(actualAreaSqFt * 100) / 100,
            },
            pricing: {
                hardwareCost: Math.round(hardwareCost),
                hardwareSell: Math.round(hardwareSell),
                estimatedServicesCost: Math.round(estimatedServicesCost),
                estimatedTotal,
                headroom,
                percentOfBudget,
            },
            fitScore,
            rank: 0, // assigned after sort
        });
    }

    // Sort: fitScore descending, then headroom ascending (tighter budget = better)
    options.sort((a, b) => {
        if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
        return a.pricing.headroom - b.pricing.headroom;
    });

    // Assign ranks and return top 10
    return options.slice(0, 10).map((opt, i) => ({ ...opt, rank: i + 1 }));
}
