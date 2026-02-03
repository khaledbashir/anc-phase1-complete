/**
 * Download all PDF template variants (Budget / Proposal / LOI × Classic / Modern / Bold).
 * Run with the app serving: npm run dev (or point BASE_URL at your VPS).
 *
 * Usage (from repo root): cd invoify && npx tsx scripts/download-all-pdfs.ts
 * Or: BASE_URL=https://your-vps.com npx tsx scripts/download-all-pdfs.ts
 */

import fs from "fs";
import path from "path";

// Load .env so BROWSERLESS_URL etc. are available when the API runs
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\n+/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = process.env[key] ?? val;
  });
}

// Use deployed app (with BROWSERLESS) when BASE_URL not set, so PDFs work without local Chrome
const BASE_URL =
  process.env.BASE_URL ||
  process.env.DEPLOYED_APP_URL ||
  process.env.DEFAULT_BASE_URL ||
  "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "exported-pdfs");

const TEMPLATES = [
  { id: 2, label: "Classic" },
  { id: 3, label: "Modern" },
  { id: 4, label: "Bold" },
] as const;

const MODES = [
  { mode: "BUDGET" as const, label: "Budget" },
  { mode: "PROPOSAL" as const, label: "Proposal" },
  { mode: "LOI" as const, label: "Letter of Intent" },
] as const;

/** Sanitize for filename: keep letters, numbers, spaces, hyphens; remove path chars. */
function safeFilenamePart(s: string): string {
  return s
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "proposal";
}

function buildMinimalPayload(
  pdfTemplate: number,
  documentMode: "BUDGET" | "PROPOSAL" | "LOI"
) {
  const now = new Date();
  const proposalDate = now.toISOString().slice(0, 10);
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const screens = [
    {
      id: "demo-1",
      name: "Main Display",
      productType: "LED",
      widthFt: 20,
      heightFt: 10,
      quantity: 1,
      pitchMm: 4,
      costPerSqFt: 120,
      desiredMargin: 0.25,
    },
  ];

  // We need _audit from calculateProposalAudit; import at runtime so path resolution works
  const { calculateProposalAudit } = require("../lib/estimator");
  const audit = calculateProposalAudit(
    screens.map((s) => ({
      name: s.name,
      productType: s.productType,
      widthFt: s.widthFt,
      heightFt: s.heightFt,
      quantity: s.quantity,
      pitchMm: s.pitchMm,
      costPerSqFt: s.costPerSqFt,
      desiredMargin: s.desiredMargin,
    })),
    {
      taxRate: 0.095,
      bondPct: 0.015,
      projectAddress: "123 Demo St, Morgantown, WV 26505",
      venue: "Generic",
    }
  );

  const isLOI = documentMode === "LOI";
  const clientName = process.env.CLIENT_NAME || "Demo Client";
  const details: Record<string, unknown> = {
    proposalId: "demo-export",
    proposalNumber: "DEMO-001",
    proposalName: "Template Variants Demo",
    clientName,
    proposalDate,
    dueDate,
    currency: "USD",
    language: "English",
    items: [{ name: "LED Display", quantity: 1, unitPrice: 50000, total: 50000 }],
    screens,
    subTotal: "50000",
    totalAmount: "50000",
    totalAmountInWords: "Fifty Thousand",
    paymentTerms: "50% on Deposit, 40% on Mobilization, 10% on Substantial Completion",
    documentMode,
    documentType: isLOI ? "LOI" : "First Round",
    pricingType: documentMode === "PROPOSAL" ? "Hard Quoted" : "Budget",
    pdfTemplate,
    venue: "Generic",
    location: "Demo Stadium",
    clientName: "Demo Client",
    showPricingTables: true,
    showIntroText: true,
    showSpecifications: true,
    showCompanyFooter: true,
    showPaymentTerms: isLOI,
    showSignatureBlock: isLOI,
    showExhibitA: isLOI || documentMode === "PROPOSAL",
    showExhibitB: isLOI,
    scopeOfWorkText: isLOI ? "Scope of work as per Exhibit A and B." : "",
    signatureBlockText: isLOI ? "By signing below, the parties agree to the terms above." : "",
  };

  return {
    sender: {
      name: "ANC Sports Enterprises",
      address: "123 ANC Way",
      zipCode: "26505",
      city: "Morgantown",
      country: "USA",
      email: "proposals@example.com",
      phone: "304-555-0100",
    },
    receiver: {
      name: "Demo Client",
      address: "456 Client Ave",
      zipCode: "26506",
      city: "Morgantown",
      country: "USA",
      email: "client@example.com",
      phone: "304-555-0200",
    },
    details,
    _audit: audit,
  };
}

async function downloadOne(
  pdfTemplate: number,
  templateLabel: string,
  documentMode: "BUDGET" | "PROPOSAL" | "LOI",
  modeLabel: string,
  clientName: string
): Promise<string> {
  const payload = buildMinimalPayload(pdfTemplate, documentMode);
  const url = `${BASE_URL.replace(/\/$/, "")}/api/proposal/generate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`PDF failed ${modeLabel}-${templateLabel}: ${res.status} ${text.slice(0, 200)}`);
    (err as Error & { responseText?: string }).responseText = text;
    throw err;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const fileName = `${safeFilenamePart(clientName)} ${modeLabel} ${templateLabel}.pdf`;
  const filePath = path.join(OUT_DIR, fileName);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(filePath, buf);
  return filePath;
}

async function main() {
  console.log("BASE_URL:", BASE_URL, BASE_URL !== "http://localhost:3000" ? "(from env)" : "");
  console.log("Output dir:", OUT_DIR);

  // Pre-flight: ensure the app is running and has the invoify API
  try {
    const healthUrl = `${BASE_URL.replace(/\/$/, "")}/api/health`;
    const res = await fetch(healthUrl, { method: "GET" });
    if (res.status === 404) {
      console.error("\nThe app at BASE_URL is not the invoify app (or the app is not running).");
      console.error("  • To run locally: in one terminal run 'pnpm run dev', then run this script again.");
      console.error("  • To use a deployed app: set BASE_URL, e.g. BASE_URL=https://your-app.com pnpm run download-pdfs");
      process.exit(1);
    }
    if (!res.ok && res.status !== 503) {
      console.warn("Warning: GET /api/health returned", res.status);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("\nCannot reach the app at", BASE_URL);
    console.error("  Error:", msg);
    console.error("  • Start the app first: pnpm run dev");
    console.error("  • Or set BASE_URL to your deployed app, e.g. BASE_URL=https://your-app.com pnpm run download-pdfs");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const done: string[] = [];
  const failed: { key: string; err: Error }[] = [];

  const clientName = process.env.CLIENT_NAME || "Demo Client";
  for (const { mode, label: modeLabel } of MODES) {
    for (const { id, label: templateLabel } of TEMPLATES) {
      const key = `${modeLabel}-${templateLabel}`;
      try {
        const filePath = await downloadOne(id, templateLabel, mode, modeLabel, clientName);
        done.push(filePath);
        console.log("OK:", key, "->", filePath);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        failed.push({ key, err });
        console.error("FAIL:", key, err.message);
      }
    }
  }

  console.log("\nDone:", done.length, "files in", OUT_DIR);
  if (failed.length) {
    console.error("Failed:", failed.length);
    failed.forEach(({ key, err }) => console.error("  ", key, err.message));
    const first = failed[0]?.err;
    const text = first && "responseText" in first ? (first as Error & { responseText?: string }).responseText : "";
    if (failed.length > 0 && (text.includes("Could not find Chrome") || text.includes("Failed to generate PDF"))) {
      console.error("\nPDF generation needs a browser. Either:");
      console.error("  1. Run against your deployed app (EasyPanel) where BROWSERLESS_URL is set:");
      console.error("     BASE_URL=https://your-invoify-app.easypanel.host pnpm run download-pdfs");
      console.error("  2. Or set BROWSERLESS_URL in .env when running the app locally (same server as Browserless).");
    }
    process.exit(1);
  }
}

main();
