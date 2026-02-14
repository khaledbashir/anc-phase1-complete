/**
 * /api/rate-card/seed — One-click seed of all 27 validated rate card entries
 *
 * POST: Upserts all extracted rates into the database. Safe to call multiple times.
 * Admin-only. Replaces the need for scripts/seed-rate-card.mjs inside Docker.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const SEED_DATA = [
    { category: "margin", key: "margin.led_hardware", label: "LED Hardware Margin", value: 0.3, unit: "pct", provenance: "NBCU LED Cost Sheet all 9 displays", confidence: "validated" },
    { category: "margin", key: "margin.services_large", label: "Services Margin (large)", value: 0.2, unit: "pct", provenance: "Indiana Fever 6 sheets + USC + NBCU 9C", confidence: "validated" },
    { category: "margin", key: "margin.services_small", label: "Services Margin (<100sqft)", value: 0.3, unit: "pct", provenance: "NBCU Ribbon/History/Lounge", confidence: "validated" },
    { category: "margin", key: "margin.livesync_cms", label: "LiveSync/CMS Margin", value: 0.35, unit: "pct", provenance: "NBCU Margin Analysis rows 44-48", confidence: "validated" },
    { category: "bond", key: "bond.rate", label: "Performance Bond", value: 0.015, unit: "pct", provenance: "21 hits across all files", confidence: "validated" },
    { category: "tax", key: "tax.nyc", label: "NYC Sales Tax", value: 0.08875, unit: "pct", provenance: "NBCU Margin Analysis", confidence: "validated" },
    { category: "tax", key: "tax.default", label: "Default Sales Tax", value: 0.095, unit: "pct", provenance: "System default", confidence: "estimated" },
    { category: "spare", key: "spare.default", label: "Spare Parts", value: 0.05, unit: "pct", provenance: "Indiana Fever", confidence: "validated" },
    { category: "warranty", key: "warranty.escalation", label: "Warranty Annual Escalation", value: 0.1, unit: "pct", provenance: "Indiana Fever years 4-10", confidence: "validated" },
    { category: "install", key: "install.steel_fab.simple", label: "Steel Fab Simple", value: 25, unit: "per_lb", provenance: "USC Install Base", confidence: "validated" },
    { category: "install", key: "install.steel_fab.standard", label: "Steel Fab Standard", value: 35, unit: "per_lb", provenance: "Indiana Fever Locker/Gym", confidence: "validated" },
    { category: "install", key: "install.steel_fab.complex", label: "Steel Fab Complex", value: 55, unit: "per_lb", provenance: "Indiana Fever HOE", confidence: "validated" },
    { category: "install", key: "install.steel_fab.heavy", label: "Steel Fab Heavy", value: 75, unit: "per_lb", provenance: "Indiana Fever Round", confidence: "validated" },
    { category: "install", key: "install.led.simple", label: "LED Install Simple", value: 75, unit: "per_sqft", provenance: "USC Install Base", confidence: "validated" },
    { category: "install", key: "install.led.standard", label: "LED Install Standard", value: 105, unit: "per_sqft", provenance: "Indiana Fever standard", confidence: "validated" },
    { category: "install", key: "install.led.complex", label: "LED Install Complex", value: 145, unit: "per_sqft", provenance: "Indiana Fever round", confidence: "validated" },
    { category: "install", key: "install.heavy_equipment", label: "Heavy Equipment", value: 30, unit: "per_lb", provenance: "USC Install Base", confidence: "validated" },
    { category: "install", key: "install.pm_gc_travel", label: "PM GC Travel", value: 5, unit: "per_lb", provenance: "USC Install Base", confidence: "validated" },
    { category: "install", key: "install.electrical", label: "Electrical Materials", value: 125, unit: "per_sqft", provenance: "USC Install Base", confidence: "validated" },
    { category: "led_cost", key: "led_cost.1_2mm", label: "LED 1.2mm", value: 430, unit: "per_sqft", provenance: "Indiana Fever", confidence: "validated" },
    { category: "led_cost", key: "led_cost.1_5mm", label: "LED 1.5mm", value: 380, unit: "per_sqft", provenance: "Interpolated", confidence: "estimated" },
    { category: "led_cost", key: "led_cost.2_5mm", label: "LED 2.5mm", value: 335, unit: "per_sqft", provenance: "NBCU calculated", confidence: "estimated" },
    { category: "led_cost", key: "led_cost.4mm", label: "LED 4mm", value: 220, unit: "per_sqft", provenance: "Cross-project avg", confidence: "estimated" },
    { category: "led_cost", key: "led_cost.10mm", label: "LED 10mm", value: 120, unit: "per_sqft", provenance: "System default", confidence: "estimated" },
    { category: "structure", key: "structure.front_rear", label: "Structure Front/Rear", value: 0.2, unit: "pct", provenance: "Estimator validated", confidence: "validated" },
    { category: "structure", key: "structure.top", label: "Structure Top Only", value: 0.1, unit: "pct", provenance: "Estimator validated", confidence: "validated" },
    { category: "demolition", key: "demolition.flat", label: "Demolition Flat Fee", value: 5000, unit: "usd", provenance: "Standard ANC", confidence: "estimated" },
];

export async function POST() {
    const session = await auth();
    if (!session?.user || (session.user as any).authRole !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let created = 0;
    let updated = 0;

    for (const entry of SEED_DATA) {
        const existing = await prisma.rateCardEntry.findUnique({ where: { key: entry.key } });
        if (existing) {
            await prisma.rateCardEntry.update({
                where: { key: entry.key },
                data: { ...entry, isActive: true },
            });
            updated++;
        } else {
            await prisma.rateCardEntry.create({ data: { ...entry, isActive: true } });
            created++;
        }
    }

    return NextResponse.json({
        success: true,
        created,
        updated,
        total: SEED_DATA.length,
        message: `Seeded ${created} new + ${updated} existing = ${SEED_DATA.length} rate card entries`,
    });
}
