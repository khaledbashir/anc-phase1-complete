/**
 * GET /api/intelligence/download/[id]
 *
 * Serves a generated Excel file from the temp export directory.
 * One-time download: file is deleted after successful delivery.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink, stat } from "fs/promises";
import path from "path";

const EXPORT_DIR = "/tmp/anc-exports";

// Auto-cleanup: files older than 1 hour
const MAX_AGE_MS = 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Sanitize ID to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9\-]/g, "");
    if (safeId !== id) {
      return NextResponse.json({ error: "Invalid download ID." }, { status: 400 });
    }

    const filePath = path.join(EXPORT_DIR, `${safeId}.xlsx`);

    // Check file exists and age
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found or expired. Generate a new export." },
        { status: 404 }
      );
    }

    // Reject expired files
    const age = Date.now() - fileStat.mtimeMs;
    if (age > MAX_AGE_MS) {
      await unlink(filePath).catch(() => {});
      return NextResponse.json(
        { error: "Download link expired. Generate a new export." },
        { status: 410 }
      );
    }

    // Read and serve
    const buffer = await readFile(filePath);
    const filename = req.nextUrl.searchParams.get("filename") || "ANC_Margin_Analysis.xlsx";

    // Clean up after serving (fire-and-forget)
    unlink(filePath).catch(() => {});

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[intelligence/download] Error:", message);
    return NextResponse.json({ error: `Download failed: ${message}` }, { status: 500 });
  }
}
