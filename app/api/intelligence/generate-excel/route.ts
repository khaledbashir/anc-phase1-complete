/**
 * POST /api/intelligence/generate-excel
 *
 * Accepts the structured project JSON from Intelligence Mode,
 * generates a multi-sheet Excel workbook, stores it temporarily,
 * and returns a download URL.
 *
 * Called by the AnythingLLM `generate_margin_analysis` skill.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateMarginAnalysisExcel, ProjectData } from "@/services/intelligence/generateMarginExcel";

const EXPORT_DIR = "/tmp/anc-exports";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept either raw object or nested under project_data_json (string)
    let projectData: ProjectData;
    if (typeof body.project_data_json === "string") {
      projectData = JSON.parse(body.project_data_json);
    } else if (body.project_name) {
      projectData = body as ProjectData;
    } else if (typeof body === "object" && body.project_data_json) {
      projectData = body.project_data_json as ProjectData;
    } else {
      return NextResponse.json(
        { error: "Missing project_data_json. Send the full project data object." },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!projectData.project_name || !projectData.displays || !Array.isArray(projectData.displays)) {
      return NextResponse.json(
        { error: "Invalid project data: requires project_name and displays array." },
        { status: 400 }
      );
    }

    // Generate Excel
    const buffer = await generateMarginAnalysisExcel(projectData);

    // Save to temp directory
    await mkdir(EXPORT_DIR, { recursive: true });
    const id = randomUUID();
    const safeName = projectData.project_name.replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_");
    const filename = `${safeName}_Margin_Analysis_${projectData.date || new Date().toISOString().split("T")[0]}.xlsx`;
    const filePath = path.join(EXPORT_DIR, `${id}.xlsx`);

    await writeFile(filePath, buffer);

    // Build download URL (relative — the skill will prepend the base URL)
    const downloadUrl = `/api/intelligence/download/${id}?filename=${encodeURIComponent(filename)}`;

    return NextResponse.json({
      success: true,
      download_url: downloadUrl,
      filename,
      id,
      expires_in: "1 hour",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[intelligence/generate-excel] Error:", message);
    return NextResponse.json({ error: `Excel generation failed: ${message}` }, { status: 500 });
  }
}
