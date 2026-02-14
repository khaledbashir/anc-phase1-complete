/**
 * PDF Engine Parity Smoke Test
 *
 * Calls BOTH PDF engines with the same payload:
 * - /api/proposals/generate (Puppeteer)
 * - /api/proposals/generate-jsreport (jsreport)
 *
 * Verifies:
 * 1) Both endpoints return valid non-empty PDFs
 * 2) Page counts match
 * 3) Key text markers exist in both outputs
 *
 * Usage:
 *   pnpm run test:pdf:engine-parity
 *   BASE_URL=http://localhost:3003 pnpm run test:pdf:engine-parity
 *   PAYLOAD_PATH=./tmp/payload.json pnpm run test:pdf:engine-parity
 */

import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

type ProposalPayload = Record<string, any>;

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      value = value.slice(1, -1);
    }
    process.env[key] = process.env[key] ?? value;
  }
}

function buildDefaultPayload(): ProposalPayload {
  const today = new Date();
  const proposalDate = today.toISOString().slice(0, 10);
  const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const docMode = (process.env.DOC_MODE || "LOI").toUpperCase();
  const isLOI = docMode === "LOI";
  const isProposal = docMode === "PROPOSAL";

  return {
    sender: {
      name: "ANC Sports Enterprises",
      address: "2 Manhattanville Road, Suite 402",
      zipCode: "10577",
      city: "Purchase",
      country: "United States",
      email: "proposals@anc.com",
      phone: "914.696.2100",
      customInputs: [],
    },
    receiver: {
      name: "Parity Test Client",
      address: "123 Test Ave",
      zipCode: "10001",
      city: "New York",
      country: "United States",
      email: "client@example.com",
      phone: "212-555-0101",
      customInputs: [],
    },
    details: {
      proposalId: "PARITY-TEST-001",
      proposalNumber: "PARITY-001",
      proposalName: "Parity Engine Validation",
      proposalDate,
      dueDate,
      currency: "USD",
      language: "English",
      documentType: isLOI ? "LOI" : "First Round",
      pricingType: isProposal ? "Hard Quoted" : "Budget",
      documentMode: isLOI ? "LOI" : isProposal ? "PROPOSAL" : "BUDGET",
      pdfTemplate: 5,
      pageLayout: "portrait-letter",
      items: [
        {
          id: "line-1",
          name: "Main LED Display",
          quantity: 1,
          unitPrice: 85000,
          total: 85000,
        },
      ],
      screens: [
        {
          id: "screen-1",
          name: "Main Display",
          customDisplayName: "Main Display",
          productType: "LED",
          widthFt: 32,
          heightFt: 18,
          quantity: 1,
          pitchMm: 3.9,
          brightnessNits: 6500,
          group: "MAIN DISPLAY",
        },
      ],
      quoteItems: [
        { description: "Display hardware", price: 55000, isAlternate: false },
        { description: "Installation", price: 20000, isAlternate: false },
        { description: "Commissioning", price: 10000, isAlternate: false },
      ],
      showPricingTables: true,
      showIntroText: true,
      showSpecifications: true,
      showCompanyFooter: true,
      showPaymentTerms: isLOI,
      showSignatureBlock: isLOI,
      showExhibitA: isLOI || isProposal,
      showExhibitB: isLOI,
      showNotes: true,
      showScopeOfWork: false,
      additionalNotes: "Parity test custom notes block.",
      paymentTerms: "50% deposit, 40% prior to shipment, 10% at completion.",
      taxDetails: { amount: 0, amountType: "amount", taxID: "" },
      discountDetails: { amount: 0, amountType: "amount" },
      shippingDetails: { cost: 0, costType: "amount" },
      paymentInformation: { bankName: "", accountName: "", accountNumber: "" },
      mirrorMode: false,
    },
  };
}

function getExpectedMarkers(payload: ProposalPayload): string[] {
  const mode = String(payload?.details?.documentMode || "LOI").toUpperCase();
  const modeMarker =
    mode === "LOI" ? "LETTER OF INTENT" : mode === "PROPOSAL" ? "SALES QUOTATION" : "BUDGET ESTIMATE";
  return [
    modeMarker,
    String(payload?.receiver?.name || "").toUpperCase(),
    "www.anc.com".toUpperCase(),
  ];
}

async function fetchPdf(endpoint: string, payload: ProposalPayload): Promise<{ ms: number; buffer: Buffer }> {
  const started = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const ms = Date.now() - started;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Endpoint ${endpoint} failed: ${response.status} ${response.statusText}\n${text.slice(0, 500)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`Endpoint ${endpoint} returned empty PDF`);
  }
  return { ms, buffer };
}

async function summarizePdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return {
      pages: parsed.total || 0,
      text: (parsed.text || "").replace(/\s+/g, " ").trim(),
      size: buffer.length,
    };
  } finally {
    await parser.destroy();
  }
}

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function main() {
  loadEnvFile();

  const baseUrl = (process.env.BASE_URL || process.env.DEPLOYED_APP_URL || "http://localhost:3003").replace(/\/$/, "");
  const payloadPath = process.env.PAYLOAD_PATH;
  const outputDir = path.resolve(process.cwd(), "tmp/pdf-parity");

  const payload: ProposalPayload = payloadPath
    ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), payloadPath), "utf8"))
    : buildDefaultPayload();

  const puppeteerUrl = `${baseUrl}/api/proposals/generate`;
  const jsreportUrl = `${baseUrl}/api/proposals/generate-jsreport`;

  console.log(`BASE_URL: ${baseUrl}`);
  console.log(`Mode: ${String(payload?.details?.documentMode || "LOI").toUpperCase()}`);
  console.log("Running parity check across both PDF engines...");

  const [puppeteer, jsreport] = await Promise.all([
    fetchPdf(puppeteerUrl, payload),
    fetchPdf(jsreportUrl, payload),
  ]);

  const [pSummary, jSummary] = await Promise.all([
    summarizePdf(puppeteer.buffer),
    summarizePdf(jsreport.buffer),
  ]);

  console.log(`Puppeteer: ${pSummary.pages} pages, ${pSummary.size} bytes, ${puppeteer.ms}ms`);
  console.log(`jsreport : ${jSummary.pages} pages, ${jSummary.size} bytes, ${jsreport.ms}ms`);

  if (pSummary.pages !== jSummary.pages) {
    fail(`Page count mismatch (Puppeteer=${pSummary.pages}, jsreport=${jSummary.pages})`);
  }

  const markers = getExpectedMarkers(payload);
  for (const marker of markers) {
    const upperP = pSummary.text.toUpperCase();
    const upperJ = jSummary.text.toUpperCase();
    if (!upperP.includes(marker)) {
      fail(`Puppeteer PDF missing marker: "${marker}"`);
    }
    if (!upperJ.includes(marker)) {
      fail(`jsreport PDF missing marker: "${marker}"`);
    }
  }

  // Size delta can vary due to metadata/font embedding; keep as warning unless extreme.
  const larger = Math.max(pSummary.size, jSummary.size);
  const smaller = Math.min(pSummary.size, jSummary.size);
  const ratio = larger / Math.max(smaller, 1);
  if (ratio > 2.5) {
    fail(`PDF size delta is too large (${pSummary.size} vs ${jSummary.size})`);
  }
  if (ratio > 1.5) {
    console.warn(`WARN: Noticeable PDF size delta (${pSummary.size} vs ${jSummary.size})`);
  }

  if (process.env.SAVE_PARITY_PDFS === "1") {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "puppeteer.pdf"), puppeteer.buffer);
    fs.writeFileSync(path.join(outputDir, "jsreport.pdf"), jsreport.buffer);
    console.log(`Saved outputs to ${outputDir}`);
  }

  console.log("PASS: PDF engines are in parity for this payload.");
}

main().catch((error) => {
  console.error("FAIL: Unhandled parity test error");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
