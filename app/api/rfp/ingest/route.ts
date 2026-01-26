import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { extractRFPRequirements, convertRFPForIngestion, validateProductAgainstRFP } from "@/lib/rfp-parser";

/**
 * POST /api/rfp/ingest
 * 
 * Ingest an RFP document into AnythingLLM for RAG-powered product matching
 * 
 * Request body:
 * - rfpText: string - Full text of the RFP document
 * - clientName?: string - Optional client name override
 * - workspace?: string - Optional workspace slug (defaults to ANC main workspace)
 * 
 * Response:
 * - success: boolean
 * - parsed: ParsedRFP - Extracted RFP data
 * - ingestionId: string - Document ID in AnythingLLM
 * - validation: { locations: Array of product validation results }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfpText, clientName, workspace } = body;

    if (!rfpText) {
      return NextResponse.json(
        { error: "rfpText is required" },
        { status: 400 }
      );
    }

    if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
      return NextResponse.json(
        { error: "AnythingLLM not configured" },
        { status: 500 }
      );
    }

    // Step 1: Parse RFP to extract requirements
    const parsedRFP = extractRFPRequirements(rfpText);

    // Override client name if provided
    if (clientName) {
      parsedRFP.clientName = clientName;
    }

    // Step 2: Convert to format suitable for ingestion
    const ingestionText = convertRFPForIngestion(parsedRFP);

    // Step 3: Upload to AnythingLLM
    const workspaceSlug = workspace || process.env.ANYTHING_LLM_WORKSPACE;

    // First, upload the document as raw text
    const uploadRes = await fetch(
      `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/document/raw-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANYTHING_LLM_KEY}`,
        },
        body: JSON.stringify({
          text: ingestionText,
          title: `${parsedRFP.clientName} - RFP Requirements`,
        }),
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Failed to upload RFP to AnythingLLM: ${errorText}`);
    }

    const uploadResult = await uploadRes.json();
    const ingestionId = uploadResult.success ? uploadResult.documentId : null;

    // Step 4: Trigger embedding update
    if (ingestionId) {
      const embedRes = await fetch(
        `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/update-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANYTHING_LLM_KEY}`,
          },
          body: JSON.stringify({
            adds: [ingestionId],
            deletes: [],
          }),
        }
      );

      if (!embedRes.ok) {
        console.warn('Failed to trigger embedding update:', await embedRes.text());
        // Don't fail the request, just log a warning
      }
    }

    // Step 5: Validate against ANC catalog products
    const { searchByName } = await import("@/lib/catalog");
    const validationResults = [];

    for (const location of parsedRFP.locations) {
      // Search for products matching this location's requirements
      const searchQuery = [
        location.locationName,
        location.pitchRequirement?.preferred || '',
        location.technicalRequirements?.minimumNits ? `${location.technicalRequirements.minimumNits} nits` : '',
      ].filter(Boolean).join(' ');

      const products = searchByName ? searchByName(searchQuery) : [];

      const locationValidation = {
        location: location.locationName,
        requirements: location,
        productMatches: products.slice(0, 5).map(product => ({
          productId: product.product_id,
          productName: product.product_name,
          validation: validateProductAgainstRFP(product, location),
        })),
        recommendedProduct: products.length > 0 ? {
          productId: products[0].product_id,
          productName: products[0].product_name,
          validation: validateProductAgainstRFP(products[0], location),
        } : null,
      };

      validationResults.push(locationValidation);
    }

    return NextResponse.json({
      success: true,
      parsed: parsedRFP,
      ingestionId,
      validation: {
        locations: validationResults,
        summary: {
          totalLocations: parsedRFP.locations.length,
          locationsWithMatches: validationResults.filter(v => v.productMatches.length > 0).length,
          extractionConfidence: parsedRFP.metadata.confidence,
        },
      },
    });
  } catch (error: any) {
    console.error('RFP ingestion error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to ingest RFP',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfp/ingest
 * 
 * Get status of RFP ingestion
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ingestionId = searchParams.get('ingestionId');
  const workspace = searchParams.get('workspace') || process.env.ANYTHING_LLM_WORKSPACE;

  if (!ingestionId) {
    return NextResponse.json(
      { error: "ingestionId is required" },
      { status: 400 }
    );
  }

  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    return NextResponse.json(
      { error: "AnythingLLM not configured" },
      { status: 500 }
    );
  }

  try {
    // Query document status from AnythingLLM
    const res = await fetch(
      `${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/document/${ingestionId}`,
      {
        headers: {
          'Authorization': `Bearer ${ANYTHING_LLM_KEY}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error('Failed to query document status');
    }

    const docStatus = await res.json();

    return NextResponse.json({
      success: true,
      document: docStatus,
    });
  } catch (error: any) {
    console.error('RFP status query error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query RFP status' },
      { status: 500 }
    );
  }
}
