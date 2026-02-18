/**
 * /api/agent-skill/demo-files — Serve test Excel files for demos
 *
 * GET ?file=indiana-fever    → serves Indiana Fever Excel
 * GET ?file=nbcu             → serves NBCU Excel
 * GET ?file=usc              → serves USC Williams-Brice Excel
 * GET ?file=atlanta          → serves Atlanta Pigeons LOI Excel
 * GET (no params)            → lists available files with URLs
 *
 * Under /api/agent-skill/ so no auth required.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const FILES: Record<string, { filename: string; name: string }> = {
  "indiana-fever": {
    filename: "Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx",
    name: "Cost Analysis - Indiana Fever.xlsx",
  },
  "nbcu": {
    filename: "Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx",
    name: "Cost Analysis - NBCU 2025 Project.xlsx",
  },
  "usc": {
    filename: "USC - Williams-Brice Stadium - Additional LED Displays - Cost Analysis (Budget) - DJC & JSR - 2026-02-09 (1).xlsx",
    name: "USC Williams-Brice Stadium Cost Analysis.xlsx",
  },
  "atlanta": {
    filename: "ANC_Atlanta_Pigeons_LED_Displays_LOI_2_9_2026.xlsx",
    name: "ANC Atlanta Pigeons LOI.xlsx",
  },
};

// Search these directories for specimen files
const SEARCH_DIRS = [
  "/tmp/specimens",
  path.join(process.cwd(), "specimens"),
  path.join(process.cwd(), "test-fixtures/pricing"),
  path.join(process.cwd(), "public/demo"),
];

function findFile(filename: string): string | null {
  for (const dir of SEARCH_DIRS) {
    const fullPath = path.join(dir, filename);
    if (existsSync(fullPath)) return fullPath;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileKey = searchParams.get("file");

  if (!fileKey) {
    const origin = request.headers.get("x-forwarded-proto")
      ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host") || request.headers.get("host")}`
      : new URL(request.url).origin;

    const available = Object.entries(FILES).map(([key, info]) => ({
      key,
      name: info.name,
      url: `${origin}/api/agent-skill/demo-files?file=${key}`,
    }));

    return NextResponse.json({ files: available });
  }

  const entry = FILES[fileKey];
  if (!entry) {
    return NextResponse.json(
      { error: `Unknown file: ${fileKey}`, available: Object.keys(FILES) },
      { status: 404 }
    );
  }

  const filePath = findFile(entry.filename);

  if (!filePath) {
    return NextResponse.json(
      { error: `File not found: ${entry.name}`, searched: SEARCH_DIRS },
      { status: 404 }
    );
  }

  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${entry.name}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
