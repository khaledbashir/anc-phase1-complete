/**
 * POST /api/rfp/analyze/upload — Save PDF to temp storage
 *
 * Accepts a single large PDF file.
 * Saves to /tmp, returns a session ID + page count.
 * No OCR here — just storage + metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/tmp/rfp-uploads";

export async function POST(request: NextRequest) {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const sessionId = randomUUID();
    const filename = file.name || "document.pdf";
    const filePath = path.join(UPLOAD_DIR, `${sessionId}.pdf`);

    // Write file to temp
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Get page count using pdf-lib (fast, no OCR)
    let pageCount = 0;
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
    } catch {
      // Fallback: estimate from file size
      pageCount = Math.max(1, Math.round(buffer.length / 50000));
    }

    const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);

    return NextResponse.json({
      sessionId,
      filename,
      pageCount,
      sizeBytes: buffer.length,
      sizeMb,
      filePath,
    });
  } catch (err) {
    console.error("[/api/rfp/analyze/upload] Error:", err);
    return NextResponse.json(
      { error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
