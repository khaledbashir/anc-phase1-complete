import { NextRequest, NextResponse } from "next/server";
import { uploadDocument, addToWorkspace, queryVault } from "@/lib/anything-llm";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { smartFilterPdf } from "@/services/ingest/smart-filter";
import { screenshotPdfPage } from "@/services/ingest/pdf-screenshot";
import { DrawingService } from "@/services/vision/drawing-service";
import { extractJson } from "@/lib/json-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proposalId = searchParams.get("proposalId");

    if (!proposalId) {
      return NextResponse.json({ error: "proposalId required" }, { status: 400 });
    }

    const docs = await prisma.rfpDocument.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.rfpDocument.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const proposalId = formData.get("proposalId") as string | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    let workspaceSlug = process.env.ANYTHING_LLM_WORKSPACE || "anc-estimator";

    if (proposalId && proposalId !== "new") {
      try {
        const proposal = await prisma.proposal.findUnique({
          where: { id: proposalId },
          select: { aiWorkspaceSlug: true, clientName: true },
        });

        if (proposal?.aiWorkspaceSlug) {
          workspaceSlug = proposal.aiWorkspaceSlug;
        } else if (ANYTHING_LLM_BASE_URL && ANYTHING_LLM_KEY) {
          const safeNameBase = (proposal?.clientName || proposalId)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 24);
          const requestedName = `${safeNameBase || "project"}-${proposalId.slice(-6)}`;

          const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({ name: requestedName }),
          });

          if (res.ok) {
            const created = await res.json();
            const slug = created?.workspace?.slug || created?.slug || null;
            if (slug) {
              workspaceSlug = slug;
              await prisma.proposal.update({
                where: { id: proposalId },
                data: { aiWorkspaceSlug: slug },
              });
            }
          } else {
            const text = await res.text();
            console.warn(`[RFP Upload] AnythingLLM workspace creation failed: ${res.status} ${text}`);
          }
        }
      } catch (e) {
        console.warn("[RFP Upload] Failed to resolve per-project workspace, falling back to default.", e);
      }
    }

    // SMART INGEST PIPELINE
    let fileToEmbed: Buffer | File = file;
    let filenameToEmbed = file.name;
    let originalDocPath = "";
    let filterStats = null;

    // 0. Pre-process if PDF
    if (file.name.toLowerCase().endsWith(".pdf")) {
      console.log(`[RFP Upload] Smart Filtering PDF: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const filterResult = await smartFilterPdf(buffer);
        console.log(`[RFP Upload] Filtered ${filterResult.totalPages} pages down to ${filterResult.retainedPages} signal pages.`);

        // --- AUTO-VISION EXTRACTION ---
        if (filterResult.drawingCandidates.length > 0) {
          console.log(`[RFP Upload] Found ${filterResult.drawingCandidates.length} potential drawings. Scanning top 3...`);
          const drawingService = new DrawingService();
          const pagesToScan = filterResult.drawingCandidates.slice(0, 3);

          let visionContext = "\n\n=== VISION EXTRACTION RESULTS (Drawings) ===\n";
          let visionHits = 0;

          for (const pageNum of pagesToScan) {
            try {
              console.log(`[RFP Upload] Vision scanning page ${pageNum}...`);
              const screenshot = await screenshotPdfPage(buffer, pageNum);

              if (screenshot) {
                const base64 = `data:image/png;base64,${screenshot.toString('base64')}`;
                const results = await drawingService.processDrawingPage(base64);

                if (results.length > 0) {
                  visionContext += `\n--- Page ${pageNum} Analysis ---\n`;
                  results.forEach(r => {
                    visionContext += `- Found ${r.field}: ${r.value} (Confidence: ${Math.round(r.confidence * 100)}%)\n`;
                  });
                  visionHits++;
                }
              }
            } catch (vErr) {
              console.error(`[RFP Upload] Vision failed for page ${pageNum}`, vErr);
            }
          }

          if (visionHits > 0) {
            filterResult.filteredText += visionContext;
            console.log(`[RFP Upload] Added vision context to embedding.`);
          }
        }
        // ------------------------------

        // Create synthetic text file for embedding (Signal Only)
        fileToEmbed = Buffer.from(filterResult.filteredText);
        filenameToEmbed = file.name.replace(/\.pdf$/i, "_signal.txt");

        filterStats = {
          originalPages: filterResult.totalPages,
          keptPages: filterResult.retainedPages,
          drawingCandidates: filterResult.drawingCandidates
        };

        // Upload ORIGINAL for storage/compliance (Archive folder, NO embedding)
        const originalUpload = await uploadDocument(file, file.name, { folderName: "archive" });
        if (originalUpload.success && originalUpload.data?.documents?.[0]) {
          originalDocPath = originalUpload.data.documents[0].location;
          console.log(`[RFP Upload] Original archived at ${originalDocPath}`);
        }

      } catch (e) {
        console.error("[RFP Upload] Smart Filter failed, falling back to full upload", e);
        // Fallback: Embed the original file
        fileToEmbed = file;
        filenameToEmbed = file.name;
      }
    }

    // 1. Upload & Embed in One Go (Hub & Spoke Model)
    const masterWorkspace = process.env.ANYTHING_LLM_MASTER_WORKSPACE || "dashboard-vault";
    let targetWorkspaces: string[] = [];

    if (workspaceSlug) targetWorkspaces.push(workspaceSlug);
    if (masterWorkspace && masterWorkspace !== workspaceSlug) {
      targetWorkspaces.push(masterWorkspace);
    }

    console.log(`[RFP Upload] Uploading and syncing to: ${targetWorkspaces.join(", ")}`);

    // addToWorkspaces handles multi-workspace embedding automatically
    const uploadRes = await uploadDocument(fileToEmbed, filenameToEmbed, {
      addToWorkspaces: targetWorkspaces
    });

    if (!uploadRes.success || !uploadRes.data?.documents?.[0]) {
      console.error("[RFP Upload] Upload failed", uploadRes);
      return NextResponse.json({ ok: false, error: "Failed to upload to storage" }, { status: 500 });
    }

    const docPath = uploadRes.data.documents[0].location;
    console.log(`[RFP Upload] File uploaded to ${docPath}`);

    // 2. Persist to Database (Vault)
    // We prefer to link to the ORIGINAL PDF if available, otherwise the uploaded file
    const dbUrl = originalDocPath || docPath;

    if (proposalId && proposalId !== "new") {
      try {
        await prisma.rfpDocument.create({
          data: {
            name: file.name,
            url: dbUrl,
            proposalId: proposalId
          }
        });
        console.log(`[RFP Vault] Saved document record for proposal ${proposalId}`);
      } catch (e) {
        console.error("[RFP Vault] Failed to save DB record:", e);
      }
    }

    // 3. PIN in Project Workspace (Deep Context)
    // We force the project workspace to "focus" on this doc by pinning it.
    // We do NOT pin it in the master vault (RAG only).
    if (workspaceSlug) {
      console.log(`[RFP Upload] Pinning document in project workspace: ${workspaceSlug}`);
      const { updatePin } = await import("@/lib/anything-llm");
      try {
        await updatePin(workspaceSlug, docPath, true);
      } catch (pinErr) {
        console.warn(`[RFP Upload] Pinning failed for ${workspaceSlug}`, pinErr);
      }
    }

    // 4. Extract Data (AI Analysis)
    // Now running against the FILTERED context, so it should be much faster and more accurate
    console.log(`[RFP Upload] Analyzing document for extraction...`);
    const extractionPrompt = `
      Analyze the uploaded RFP document "${file.name}" and extract the following technical specifications into a JSON object.
      
      Return ONLY valid JSON. No markdown formatting.
      
      Fields to extract:
      - receiver.name: Client or Customer Name
      - details.proposalName: Project Name or RFP Title
      - details.venue: Venue or Location Name
      - rulesDetected.structuralTonnage: Any mention of structural steel weight/tonnage
      - rulesDetected.reinforcingTonnage: Any mention of rebar/reinforcing weight
      - details.screens: Array of screens/displays found. For each screen include:
        - name: Screen name/ID
        - widthFt: Width in feet (convert if necessary)
        - heightFt: Height in feet (convert if necessary)
        - quantity: Number of units
        - pitchMm: Pixel pitch in mm
        - isReplacement: true if it replaces an existing screen
        - useExistingStructure: true if it uses existing steel
    `;

    let extractedData = null;
    try {
      const aiResponse = await queryVault(workspaceSlug, extractionPrompt, "chat");
      console.log(`[RFP Upload] AI Response Length: ${aiResponse.length}`);

      const jsonText = extractJson(aiResponse);
      if (jsonText) {
        try {
          extractedData = JSON.parse(jsonText);
        } catch (parseErr) {
          console.warn("[RFP Upload] JSON Parse Warning:", parseErr);
          // Try to repair common JSON issues if needed, or just proceed without data
          // Attempt simple repair for truncated JSON
          try {
            extractedData = JSON.parse(jsonText + "}");
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("[RFP Upload] AI Extraction failed", e);
    }

    return NextResponse.json({
      ok: true,
      url: dbUrl,
      workspaceSlug,
      extractedData,
      filterStats,
      message: "RFP uploaded and analyzed successfully"
    });

  } catch (error: any) {
    console.error("[RFP Upload] Critical error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
