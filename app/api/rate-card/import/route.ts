/**
 * /api/rate-card/import — Bulk import rate card entries from CSV
 *
 * POST: Upload CSV with columns: category, key, label, value, unit, provenance, confidence
 * Upserts on `key` — existing entries get updated, new ones created.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const text = await file.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

        if (lines.length < 2) {
            return NextResponse.json({ error: "CSV must have header + at least 1 data row" }, { status: 400 });
        }

        // Parse header
        const headerLine = lines[0];
        const headers = parseCSVRow(headerLine).map((h) => h.toLowerCase().trim());

        const requiredCols = ["category", "key", "label", "value", "unit"];
        const missing = requiredCols.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
            return NextResponse.json(
                { error: `Missing required CSV columns: ${missing.join(", ")}` },
                { status: 400 }
            );
        }

        const colIdx: Record<string, number> = {};
        for (const h of headers) {
            colIdx[h] = headers.indexOf(h);
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVRow(lines[i]);
            if (row.length < requiredCols.length) {
                skipped++;
                continue;
            }

            const category = row[colIdx.category]?.trim();
            const key = row[colIdx.key]?.trim();
            const label = row[colIdx.label]?.trim();
            const valueStr = row[colIdx.value]?.trim();
            const unit = row[colIdx.unit]?.trim();
            const provenance = colIdx.provenance != null ? row[colIdx.provenance]?.trim() : null;
            const confidence = colIdx.confidence != null ? row[colIdx.confidence]?.trim() : "extracted";

            if (!category || !key || !label || !valueStr || !unit) {
                errors.push(`Row ${i + 1}: missing required field`);
                skipped++;
                continue;
            }

            const value = parseFloat(valueStr);
            if (!Number.isFinite(value)) {
                errors.push(`Row ${i + 1}: invalid value "${valueStr}"`);
                skipped++;
                continue;
            }

            try {
                const existing = await prisma.rateCardEntry.findUnique({ where: { key } });
                if (existing) {
                    await prisma.rateCardEntry.update({
                        where: { key },
                        data: { category, label, value, unit, provenance, confidence: confidence || "extracted" },
                    });
                    updated++;
                } else {
                    await prisma.rateCardEntry.create({
                        data: { category, key, label, value, unit, provenance, confidence: confidence || "extracted" },
                    });
                    created++;
                }
            } catch (err: any) {
                errors.push(`Row ${i + 1} (${key}): ${err.message}`);
                skipped++;
            }
        }

        return NextResponse.json({
            created,
            updated,
            skipped,
            total: lines.length - 1,
            errors: errors.slice(0, 20),
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                result.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
    }
    result.push(current);
    return result;
}
