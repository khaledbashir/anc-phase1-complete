import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

const ANYTHING_LLM_WORKSPACE = process.env.ANYTHING_LLM_WORKSPACE;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, threadSlug, workspace } = body;

    if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
      return NextResponse.json({ error: "LLM not configured" }, { status: 500 });
    }

    // System prompt instructing the model to output JSON actions when appropriate
    const systemPrompt = `You are the ANC Engine Controller. You have tools to modify the proposal. When the user asks for something, output a JSON object with the action. Available Actions: - { type: 'ADD_SCREEN', payload: { name, width, height, pitch, productType, quantity } } - { type: 'UPDATE_CLIENT', payload: { name, address } } - { type: 'SET_MARGIN', payload: { value } } If no action is needed, reply with plain text. When returning an action, output only the JSON object and nothing else.`;

    // We'll prefer workspace from request, else from env
    const workspaceSlug = workspace ?? ANYTHING_LLM_WORKSPACE;
    if (!workspaceSlug || !threadSlug) {
      return NextResponse.json({ error: 'Protocol Violation: Missing Workspace or Thread identifier.' }, { status: 400 });
    }

    // Construct chat payload - mode: 'chat' enables both RAG and general knowledge
    const chatPayload = { message, mode: 'chat' };

    // Helper to POST to workspace chat (threaded)
    const postToWorkspaceChat = async (wsSlug: string, threadSlug?: string) => {
      // Use thread endpoint if threadSlug provided, else fallback to simple chat
      const endpoint = threadSlug 
        ? `${ANYTHING_LLM_BASE_URL}/workspace/${wsSlug}/thread/${threadSlug}/chat`
        : `${ANYTHING_LLM_BASE_URL}/workspace/${wsSlug}/chat`;
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        body: JSON.stringify(chatPayload),
      });
      const text = await r.text();
      // Try parse
      try {
        return { status: r.status, body: JSON.parse(text) };
      } catch (e) {
        return { status: r.status, bodyText: text };
      }
    };

    // Try chat with thread support; if workspace invalid, try to create it and retry
    let result = await postToWorkspaceChat(workspaceSlug, threadSlug);

    if (result.status === 400 && result.body && result.body.error && result.body.error.includes('not a valid workspace')) {
      // Create workspace
      const createEndpoint = `${ANYTHING_LLM_BASE_URL}/workspace/new`;
      const createRes = await fetch(createEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        body: JSON.stringify({ name: workspace, slug: workspace }),
      });
      const createText = await createRes.text();
      try {
        const created = JSON.parse(createText);
        const newSlug = created?.workspace?.slug;
        if (newSlug) {
          result = await postToWorkspaceChat(newSlug);
        }
      } catch (e) {
        // ignore
      }
    }

    // After chat, attempt to perform a vector-search to see if there's a product match
    try {
      const { vectorSearch } = await import("@/lib/rag-sync");
      const { findByProductId, searchByName } = await import("@/lib/catalog");
      const vs = await vectorSearch(workspace, message);

      if (vs && vs.ok && vs.body) {
        // Try to extract results array
        const results = vs.body.results || vs.body.items || vs.body.matches || [];
        if (Array.isArray(results) && results.length > 0) {
          // Take top result
          const top = results[0];
          const score = top.score ?? top.similarity ?? top.rank ?? 0;
          const text = top.text ?? top.content ?? JSON.stringify(top);

          // Extract product id from text if present
          const idMatch = text.match(/([A-Z0-9\-]{3,})/g);
          let product = null;

          if (idMatch && idMatch.length > 0) {
            for (const token of idMatch) {
              const found = findByProductId(token);
              if (found) {
                product = found;
                break;
              }
            }
          }

          // If not found by id, try name search on the text
          if (!product) {
            const candidates = searchByName(text);
            if (candidates && candidates.length > 0) product = candidates[0];
          }

          // Confidence logic
          const threshold = parseFloat(process.env.ANC_PRODUCT_CONFIDENCE_THRESHOLD || "0.85");

          if (product && (score >= threshold || score === 0)) {
            // Map catalog to ADD_SCREEN payload
            const payload: any = {
              name: product.product_name,
              productId: product.product_id,
              productType: product.product_name,
              pitchMm: product.pixel_pitch,
              costPerSqFt: product.cost_per_sqft,
              widthFt: product.cabinet_width_mm ? Number((product.cabinet_width_mm / 304.8).toFixed(2)) : undefined,
              heightFt: product.cabinet_height_mm ? Number((product.cabinet_height_mm / 304.8).toFixed(2)) : undefined,
              quantity: 1,
              serviceType: product.service_type,
              isCurvy: product.is_curvy,
            };

            // Also run a quick DB benchmark to provide context (read-only)
            try {
              const { prisma } = await import("@/lib/prisma");
              // FIX: Use Prisma.DbNull to filter nullable JSON fields properly
              const proposals = await prisma.proposal.findMany({ where: { internalAudit: { not: Prisma.DbNull } }, take: 50 });
              const margins: number[] = [];
              for (const p of proposals) {
                const ia = p.internalAudit as Prisma.JsonObject;
                const totals = ia.totals as Prisma.JsonObject | null;
                if (totals && typeof totals.margin === 'number' && typeof totals.totalPrice === 'number') {
                  const m = totals.margin / (totals.totalPrice || 1);
                  margins.push(m);
                }
              }
              const avgMargin = margins.length ? margins.reduce((a,b)=>a+b,0)/margins.length : null;

              // Return action and contextual sql report
              return NextResponse.json({ ok: true, data: { type: "action", action: { type: "ADD_SCREEN", payload, meta: { avgMargin } } } }, { status: 200 });
            } catch (e) {
              // If DB check fails, still return the ADD_SCREEN
              return NextResponse.json({ ok: true, data: { type: "action", action: { type: "ADD_SCREEN", payload } } }, { status: 200 });
            }
          } else {
            // Low confidence or multiple ambiguous matches -> ask diagnostic questions
            const missingFields = ["category", "serviceType", "isCurvy"];
            const message = "To pick the right ANC product, I need to know: Is this for indoor or outdoor? Front or back service? Is the screen curved?";
            return NextResponse.json({ ok: true, data: { type: "action", action: { type: "INCOMPLETE_SPECS", payload: { missingFields, message } } } }, { status: 200 });
          }
        }
      }
    } catch (e) {
      console.warn("Vector-search failed or catalog lookup failed", e);
    }

    // Return whatever we got
    if (result.body) return NextResponse.json({ ok: true, data: result.body }, { status: 200 });
    return NextResponse.json({ ok: true, text: result.bodyText ?? '' }, { status: 200 });
  } catch (error: any) {
    console.error("Command route error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
