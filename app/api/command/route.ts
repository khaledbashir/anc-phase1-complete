import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

const ANYTHING_LLM_WORKSPACE = process.env.ANYTHING_LLM_WORKSPACE;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, threadSlug, workspace, documentText } = body;

    if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
      return NextResponse.json({ error: "LLM not configured" }, { status: 500 });
    }

    // System prompt instructing the model to output JSON actions when appropriate
    const systemPrompt = `You are the ANC Engine Controller. You have tools to modify the proposal. When the user asks for something, output a JSON object with the action. Available Actions: - { type: 'ADD_SCREEN', payload: { name, width, height, pitch, productType, quantity } } - { type: 'UPDATE_CLIENT', payload: { name, address } } - { type: 'SET_MARGIN', payload: { value } } If no action is needed, reply with plain text. When returning an action, output only the JSON object and nothing else.

Proactive Recommendations: When you detect specific specs from an RFP or document, proactively suggest products from the ANC Catalog. For example: "I have detected 10mm pitch in the RFP. Based on our ANC Catalog, I recommend LG GPPA062 for this environment. Shall I proceed with the 20% structural math?"`;
    // validateDocumentGaps: Analyze document and detect missing required fields for ADD_SCREEN action
    const validateDocumentGaps = (docText: string | null | undefined) => {
      if (!docText) return { hasGaps: false, missingFields: [] };

      const missingFields: string[] = [];
      const docLower = docText.toLowerCase();

      // Check for pitch specification
      const pitchMatch = docLower.match(/(\d+)\s*mm|pitch\s*:\s*(\d+)/i);
      if (!pitchMatch) missingFields.push('pitch');

      // Check for dimensions
      const dimensionMatch = docLower.match(/\d+[\s']?\s*[x×]\s*\d+[\s']?|height\s*:.*width|active\s*display/i);
      if (!dimensionMatch) missingFields.push('dimensions');

      // Check for environment
      const envMatch = docLower.match(/(indoor|outdoor)/i);
      if (!envMatch) missingFields.push('environment');

      // Check for quantity
      const qtyMatch = docLower.match(/(qty|quantity|\d+\s*units?|\d+\s*displays)/i);
      if (!qtyMatch) missingFields.push('quantity');

      return {
        hasGaps: missingFields.length > 0,
        missingFields,
        detectedSpecs: {
          pitch: pitchMatch ? pitchMatch[1] || pitchMatch[2] : null,
          environment: envMatch ? envMatch[1] : null,
        }
      };
    };
    // We'll prefer workspace from request, else from env
    const workspaceSlug = workspace ?? ANYTHING_LLM_WORKSPACE;
    // Note: threadSlug is optional - if not provided, we'll create one
    // This allows initialization without forcing the user to create a project first

    // Construct chat payload - mode: 'chat' enables both RAG and general knowledge
    const chatPayload = { message, mode: 'chat' };

    // Helper to POST to workspace chat (threaded)
    const postToWorkspaceChat = async (wsSlug: string, threadSlug?: string) => {
      // If threadSlug not provided, create one first for proper isolation
      let effectiveThreadSlug = threadSlug;
      if (!effectiveThreadSlug && wsSlug) {
        try {
          const threadRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${wsSlug}/thread/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
            body: JSON.stringify({ title: `Chat Thread - ${new Date().toISOString()}` }),
          });
          const threadText = await threadRes.text();
          const threadJson = JSON.parse(threadText);
          effectiveThreadSlug = threadJson?.thread?.slug || threadJson?.slug;
        } catch (e) {
          console.warn('Failed to create thread, falling back to simple chat', e);
        }
      }
      // Use thread endpoint if threadSlug available, else fallback to simple chat
      const endpoint = effectiveThreadSlug
        ? `${ANYTHING_LLM_BASE_URL}/workspace/${wsSlug}/thread/${effectiveThreadSlug}/chat`
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

    // checkGaps: Compare detected specs against required fields for ADD_SCREEN
    // Enhanced with RFP requirement validation
    const checkGaps = (
      detectedSpecs: any,
      rfpRequirements?: any
    ): { hasGaps: boolean; missingFields: string[]; rfpCompliance?: { meets: boolean; gaps: string[] } } => {
      // Core required fields for any screen
      const requiredFields = [
        { key: 'pixelPitch', label: 'Pixel Pitch (mm)' },
        { key: 'widthFt', label: 'Width (ft)' },
        { key: 'heightFt', label: 'Height (ft)' },
        { key: 'isCurvy', label: 'Is Curved?' },
        { key: 'serviceType', label: 'Service Type (Front/Back)' },
        { key: 'productType', label: 'Product Type' },
      ];

      const missingFields = requiredFields
        .filter(field => !detectedSpecs[field.key])
        .map(field => field.label);

      // RFP compliance check (if RFP requirements provided)
      let rfpCompliance = undefined;
      if (rfpRequirements) {
        const rfpGaps: string[] = [];

        // Check pixel pitch against RFP requirement
        if (rfpRequirements.pitchRequirement?.minimum && detectedSpecs.pixelPitch) {
          const productPitch = parseFloat(detectedSpecs.pixelPitch);
          const requiredPitch = rfpRequirements.pitchRequirement.minimum;
          if (productPitch > requiredPitch) {
            rfpGaps.push(`Pixel pitch ${detectedSpecs.pixelPitch}mm exceeds RFP maximum of ${requiredPitch}mm`);
          }
        }

        // Check brightness (nits) against RFP requirement
        if (rfpRequirements.technicalRequirements?.minimumNits && detectedSpecs.brightnessNits) {
          const productNits = parseFloat(detectedSpecs.brightnessNits);
          const requiredNits = rfpRequirements.technicalRequirements.minimumNits;
          if (productNits < requiredNits) {
            rfpGaps.push(`Brightness ${detectedSpecs.brightnessNits} nits below RFP minimum of ${requiredNits} nits`);
          }
        }

        // Check IP rating against RFP requirement
        if (rfpRequirements.technicalRequirements?.ipRating && detectedSpecs.ipRating) {
          const productIP = parseInt(detectedSpecs.ipRating);
          const requiredIP = parseInt(rfpRequirements.technicalRequirements.ipRating);
          if (productIP < requiredIP) {
            rfpGaps.push(`IP rating ${detectedSpecs.ipRating} below RFP requirement of IP${requiredIP}`);
          }
        }

        // Check transparent display requirement
        if (rfpRequirements.structural?.transparentDisplayRequired && !detectedSpecs.isTransparent) {
          rfpGaps.push('RFP requires transparent display technology but product is not transparent');
        }

        // Check service access requirement
        if (rfpRequirements.serviceRequirements?.accessMethod && detectedSpecs.serviceType) {
          const requiredAccess = rfpRequirements.serviceRequirements.accessMethod.toLowerCase();
          const productAccess = detectedSpecs.serviceType.toLowerCase();

          if (requiredAccess.includes('front') && productAccess.includes('rear')) {
            rfpGaps.push('RFP requires front serviceable display but product is rear serviceable');
          }
        }

        rfpCompliance = {
          meets: rfpGaps.length === 0,
          gaps: rfpGaps,
        };

        // Add RFP gaps to missing fields if any
        if (rfpGaps.length > 0) {
          missingFields.push(...rfpGaps);
        }
      }

      return { hasGaps: missingFields.length > 0, missingFields, rfpCompliance };
    };

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
            // checkGaps: Validate we have all required specs before adding
            // Enhanced: Include RFP requirements if available
            const detectedSpecs: any = {
              pixelPitch: product.pixel_pitch,
              widthFt: product.cabinet_width_mm ? true : false,
              heightFt: product.cabinet_height_mm ? true : false,
              isCurvy: product.is_curvy !== undefined ? true : false,
              serviceType: product.service_type ? true : false,
              productType: product.product_name ? true : false,
              brightnessNits: product.max_nits, // Corrected field name
              ipRating: (product as any).ip_rating, // Optional field might not exist
              isTransparent: (product as any).transparent || false,
            };

            // Try to fetch RFP requirements from workspace if available
            let rfpRequirements = undefined;
            try {
              const docsRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/documents`, {
                headers: { 'Authorization': `Bearer ${ANYTHING_LLM_KEY}` },
              });
              if (docsRes.ok) {
                const docsData = await docsRes.json();
                // Look for recent RFP documents
                const rfpDocs = docsData.documents?.filter((d: any) =>
                  d.title?.toLowerCase().includes('rfp') ||
                  d.title?.toLowerCase().includes('requirements')
                ) || [];

                if (rfpDocs.length > 0) {
                  // Get the most recent RFP document
                  const rfpDoc = rfpDocs[0];
                  // Note: We'd need to fetch the document content and parse it
                  // For now, we'll skip this to keep the implementation simple
                  // In production, we'd cache parsed RFP requirements
                }
              }
            } catch (e) {
              // Ignore RFP fetch errors
            }

            const gapAnalysis = checkGaps(detectedSpecs, rfpRequirements);

            if (gapAnalysis.hasGaps) {
              // Prohibited from completing ADD_SCREEN - must prompt user via DiagnosticOverlay
              const message = `I recommend ${product.product_name} but need to confirm: ${gapAnalysis.missingFields.join(', ')}`;

              // Enhanced response with RFP compliance details
              const payload: any = {
                missingFields: gapAnalysis.missingFields,
                message,
                recommendedProduct: product,
                score,
              };

              if (gapAnalysis.rfpCompliance) {
                payload.rfpCompliance = gapAnalysis.rfpCompliance;
                if (!gapAnalysis.rfpCompliance.meets) {
                  payload.message += `\n\nRFP Compliance Issues:\n${gapAnalysis.rfpCompliance.gaps.join('\n')}`;
                }
              }

              return NextResponse.json({
                ok: true,
                data: {
                  type: "action",
                  action: {
                    type: "INCOMPLETE_SPECS",
                    payload,
                  }
                }
              }, { status: 200 });
            }

            // All specs present - proceed with ADD_SCREEN
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
              const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null;

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

    // Return whatever we got, include threadSlug if we created one
    if (result.body) {
      return NextResponse.json({ ok: true, data: result.body }, { status: 200 });
    }
    return NextResponse.json({ ok: true, text: result.bodyText ?? '' }, { status: 200 });
  } catch (error: any) {
    console.error("Command route error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
