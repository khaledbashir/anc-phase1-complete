/**
 * /api/spec/query — Structured Product Query + Spec Calculation
 *
 * Phase 2A: Pure database query + deterministic math.
 * No AI involved — this is SQL WHERE clauses + ProductEngine calculations.
 *
 * Accepts query parameters like pixelPitch, environment, brightness, dimensions.
 * Returns matched products with full calculated specifications:
 * panel counts, actual dimensions (imperial + metric), weight, power, resolution.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, ManufacturerProduct } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

interface SpecQueryParams {
    pixelPitch?: number;
    environment?: "indoor" | "outdoor" | "indoor_outdoor";
    brightnessMin?: number;
    manufacturer?: string;
    targetWidthFt?: number;
    targetHeightFt?: number;
    quantity?: number;
    serviceType?: "front" | "rear" | "front_rear";
}

interface CalculatedSpec {
    // Product info
    product: {
        id: string;
        manufacturer: string;
        productFamily: string;
        modelNumber: string;
        displayName: string;
        pixelPitch: number;
        environment: string;
        serviceType: string;
        ipRating: string | null;
        supportsHalfModule: boolean;
        isCurved: boolean;
        extendedSpecs: unknown;
    };

    // Cabinet dimensions (both units — Matt's requirement)
    cabinet: {
        widthMm: number;
        heightMm: number;
        depthMm: number | null;
        widthInches: number;
        heightInches: number;
        weightKg: number;
        weightLbs: number;
    };

    // Screen layout (per-screen)
    layout: {
        modulesWide: number;
        modulesHigh: number;
        totalModules: number;
        rows: number; // Same as modulesHigh — Matt uses "rows" terminology
        cabinetsPerRow: number; // Same as modulesWide
    };

    // Actual screen dimensions (per-screen)
    screenDimensions: {
        widthMm: number;
        heightMm: number;
        widthFt: number;
        heightFt: number;
        widthInches: number;
        heightInches: number;
        fitPercentage: number; // How close to target dimensions
    };

    // Resolution (per-screen)
    resolution: {
        horizontal: number;
        vertical: number;
        total: string; // Formatted: "1920x1080"
    };

    // Weight (per-screen and total across quantity)
    weight: {
        perScreenKg: number;
        perScreenLbs: number;
        totalKg: number;
        totalLbs: number;
    };

    // Power (per-screen and total)
    power: {
        maxPerScreenWatts: number;
        typicalPerScreenWatts: number | null;
        maxTotalWatts: number;
        typicalTotalWatts: number | null;
        maxPerScreenKW: number;
        maxTotalKW: number;
    };

    // Brightness
    brightness: {
        maxNits: number;
        typicalNits: number | null;
    };

    // Quantity context
    quantity: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MM_PER_FT = 304.8;
const MM_PER_INCH = 25.4;
const LB_PER_KG = 2.20462;

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const body: SpecQueryParams = await request.json();
        const {
            pixelPitch,
            environment,
            brightnessMin,
            manufacturer,
            targetWidthFt,
            targetHeightFt,
            quantity = 1,
            serviceType,
        } = body;

        // Build Prisma WHERE clause — only include filters that were provided
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { isActive: true };

        if (pixelPitch !== undefined) {
            // Allow ±0.5mm tolerance for pitch matching
            where.pixelPitch = {
                gte: pixelPitch - 0.5,
                lte: pixelPitch + 0.5,
            };
        }

        if (environment) {
            // "indoor_outdoor" products should match both indoor and outdoor queries
            where.OR = [
                { environment },
                { environment: "indoor_outdoor" },
            ];
        }

        if (brightnessMin !== undefined) {
            where.maxNits = { gte: brightnessMin };
        }

        if (manufacturer) {
            where.manufacturer = {
                equals: manufacturer,
                mode: "insensitive",
            };
        }

        if (serviceType) {
            where.serviceType = {
                in: [serviceType, "front_rear"], // front_rear always qualifies
            };
        }

        // Query database
        const products = await prisma.manufacturerProduct.findMany({
            where,
            orderBy: [
                { pixelPitch: "asc" }, // Closest pitch first
                { maxNits: "desc" },   // Highest brightness first
            ],
        });

        if (products.length === 0) {
            return NextResponse.json(
                {
                    matches: [],
                    query: body,
                    message: "No products match the specified criteria. Try relaxing your filters.",
                },
                { status: 200 }
            );
        }

        // Calculate specs for each matched product
        const matches: CalculatedSpec[] = products.map((product) =>
            calculateFullSpec(product, targetWidthFt, targetHeightFt, quantity)
        );

        // Sort by fit percentage if dimensions were provided
        if (targetWidthFt && targetHeightFt) {
            matches.sort((a, b) => b.screenDimensions.fitPercentage - a.screenDimensions.fitPercentage);
        }

        return NextResponse.json({
            matches,
            query: body,
            totalProducts: matches.length,
        });
    } catch (error) {
        console.error("[spec/query] Error:", error);
        return NextResponse.json(
            { error: "Failed to query products" },
            { status: 500 }
        );
    }
}

// Also support GET for simple queries
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const body: SpecQueryParams = {};
    if (searchParams.get("pixelPitch")) body.pixelPitch = parseFloat(searchParams.get("pixelPitch")!);
    if (searchParams.get("environment")) body.environment = searchParams.get("environment") as SpecQueryParams["environment"];
    if (searchParams.get("brightnessMin")) body.brightnessMin = parseFloat(searchParams.get("brightnessMin")!);
    if (searchParams.get("manufacturer")) body.manufacturer = searchParams.get("manufacturer")!;
    if (searchParams.get("targetWidthFt")) body.targetWidthFt = parseFloat(searchParams.get("targetWidthFt")!);
    if (searchParams.get("targetHeightFt")) body.targetHeightFt = parseFloat(searchParams.get("targetHeightFt")!);
    if (searchParams.get("quantity")) body.quantity = parseInt(searchParams.get("quantity")!);
    if (searchParams.get("serviceType")) body.serviceType = searchParams.get("serviceType") as SpecQueryParams["serviceType"];

    // Reuse POST handler logic via internal call
    const fakeRequest = new NextRequest(request.url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });

    return POST(fakeRequest);
}

// ============================================================================
// CALCULATION ENGINE
// ============================================================================

function calculateFullSpec(
    product: ManufacturerProduct,
    targetWidthFt?: number,
    targetHeightFt?: number,
    quantity: number = 1
): CalculatedSpec {
    // Cabinet dimensions — both units
    const cabinetWidthInches = product.cabinetWidthMm / MM_PER_INCH;
    const cabinetHeightInches = product.cabinetHeightMm / MM_PER_INCH;
    const cabinetWeightLbs = product.weightKgPerCabinet * LB_PER_KG;

    // Screen layout calculation (if dimensions provided)
    let modulesWide = 1;
    let modulesHigh = 1;

    if (targetWidthFt && targetHeightFt) {
        const targetWidthMm = targetWidthFt * MM_PER_FT;
        const targetHeightMm = targetHeightFt * MM_PER_FT;

        // P0 "Slightly Smaller" rule: Math.floor ensures we never exceed target
        modulesWide = Math.max(1, Math.floor(targetWidthMm / product.cabinetWidthMm));
        modulesHigh = Math.max(1, Math.floor(targetHeightMm / product.cabinetHeightMm));
    }

    const totalModules = modulesWide * modulesHigh;

    // Actual screen dimensions
    const screenWidthMm = modulesWide * product.cabinetWidthMm;
    const screenHeightMm = modulesHigh * product.cabinetHeightMm;
    const screenWidthFt = screenWidthMm / MM_PER_FT;
    const screenHeightFt = screenHeightMm / MM_PER_FT;
    const screenWidthInches = screenWidthMm / MM_PER_INCH;
    const screenHeightInches = screenHeightMm / MM_PER_INCH;

    // Fit percentage
    const fitPercentage =
        targetWidthFt && targetHeightFt
            ? Math.min(100, (screenWidthFt * screenHeightFt) / (targetWidthFt * targetHeightFt) * 100)
            : 100;

    // Resolution
    const resolutionX = Math.round(screenWidthMm / product.pixelPitch);
    const resolutionY = Math.round(screenHeightMm / product.pixelPitch);

    // Weight
    const perScreenWeightKg = totalModules * product.weightKgPerCabinet;
    const perScreenWeightLbs = perScreenWeightKg * LB_PER_KG;

    // Power
    const maxPerScreenWatts = totalModules * product.maxPowerWattsPerCab;
    const typicalPerScreenWatts = product.typicalPowerWattsPerCab
        ? totalModules * product.typicalPowerWattsPerCab
        : null;

    return {
        product: {
            id: product.id,
            manufacturer: product.manufacturer,
            productFamily: product.productFamily,
            modelNumber: product.modelNumber,
            displayName: product.displayName,
            pixelPitch: product.pixelPitch,
            environment: product.environment,
            serviceType: product.serviceType,
            ipRating: product.ipRating,
            supportsHalfModule: product.supportsHalfModule,
            isCurved: product.isCurved,
            extendedSpecs: product.extendedSpecs,
        },
        cabinet: {
            widthMm: product.cabinetWidthMm,
            heightMm: product.cabinetHeightMm,
            depthMm: product.cabinetDepthMm,
            widthInches: round2(cabinetWidthInches),
            heightInches: round2(cabinetHeightInches),
            weightKg: round2(product.weightKgPerCabinet),
            weightLbs: round2(cabinetWeightLbs),
        },
        layout: {
            modulesWide,
            modulesHigh,
            totalModules,
            rows: modulesHigh,
            cabinetsPerRow: modulesWide,
        },
        screenDimensions: {
            widthMm: round2(screenWidthMm),
            heightMm: round2(screenHeightMm),
            widthFt: round2(screenWidthFt),
            heightFt: round2(screenHeightFt),
            widthInches: round2(screenWidthInches),
            heightInches: round2(screenHeightInches),
            fitPercentage: round2(fitPercentage),
        },
        resolution: {
            horizontal: resolutionX,
            vertical: resolutionY,
            total: `${resolutionX}x${resolutionY}`,
        },
        weight: {
            perScreenKg: round2(perScreenWeightKg),
            perScreenLbs: round2(perScreenWeightLbs),
            totalKg: round2(perScreenWeightKg * quantity),
            totalLbs: round2(perScreenWeightLbs * quantity),
        },
        power: {
            maxPerScreenWatts: round2(maxPerScreenWatts),
            typicalPerScreenWatts: typicalPerScreenWatts ? round2(typicalPerScreenWatts) : null,
            maxTotalWatts: round2(maxPerScreenWatts * quantity),
            typicalTotalWatts: typicalPerScreenWatts ? round2(typicalPerScreenWatts * quantity) : null,
            maxPerScreenKW: round2(maxPerScreenWatts / 1000),
            maxTotalKW: round2((maxPerScreenWatts * quantity) / 1000),
        },
        brightness: {
            maxNits: product.maxNits,
            typicalNits: product.typicalNits,
        },
        quantity,
    };
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
