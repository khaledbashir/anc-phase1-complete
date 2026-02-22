/**
 * POST /api/rfp/analyze/upload — Save PDF to temp storage
 *
 * Accepts a raw PDF binary body (not FormData) to avoid buffering
 * the entire file in memory. Filename passed via X-Filename header.
 *
 * Streams directly to disk for files of any size.
 * Returns a session ID + basic metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { existsSync, createWriteStream, statSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/tmp/rfp-uploads";

export async function POST(request: NextRequest) {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const sessionId = randomUUID();
    const filename = request.headers.get("x-filename") || "document.pdf";
    const filePath = path.join(UPLOAD_DIR, `${sessionId}.pdf`);

    // Stream request body directly to disk — zero full-file buffering
    const body = request.body;
    if (!body) {
      return NextResponse.json({ error: "No file body" }, { status: 400 });
    }

    const reader = body.getReader();
    const writer = createWriteStream(filePath);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const canContinue = writer.write(value);
        if (!canContinue) {
          await new Promise<void>((resolve) => writer.once("drain", resolve));
        }
      }
    } finally {
      writer.end();
      await new Promise<void>((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    }

    const fileSize = statSync(filePath).size;
    if (fileSize === 0) {
      return NextResponse.json({ error: "Empty file received" }, { status: 400 });
    }

    const sizeMb = (fileSize / 1024 / 1024).toFixed(1);

    // Get page count — read from disk (single copy in memory)
    let pageCount = 0;
    try {
      const { PDFDocument } = await import("pdf-lib");
      const { readFile } = await import("fs/promises");
      const buf = await readFile(filePath);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
    } catch {
      // Fallback: estimate (~50KB per page average for construction RFPs)
      pageCount = Math.max(1, Math.round(fileSize / 50000));
    }

    return NextResponse.json({
      sessionId,
      filename,
      pageCount,
      sizeBytes: fileSize,
      sizeMb,
    });
  } catch (err) {
    console.error("[/api/rfp/analyze/upload] Error:", err);
    return NextResponse.json(
      { error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
