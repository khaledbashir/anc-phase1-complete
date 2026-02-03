/**
 * Download all PDF template variants (Budget / Proposal / LOI × Classic / Modern / Premium).
 * Uses real data from an Excel file if EXCEL_PATH is set; otherwise uses minimal demo payload.
 *
 * Usage:
 *   EXCEL_PATH=/path/to/Cost Analysis - Indiana Fever - 2026-01-22.xlsx pnpm run download-pdfs
 *   Or from repo root: pnpm run download-pdfs (uses default Excel path if set below)
 */

import fs from "fs";
import path from "path";

// Load .env
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

const BASE_URL =
  process.env.BASE_URL ||
  process.env.DEPLOYED_APP_URL ||
  process.env.DEFAULT_BASE_URL ||
  "http://localhost:3000";

const DEFAULT_EXCEL_PATH = process.env.DEFAULT_EXCEL_PATH || "/root/natalia/Cost Analysis - Indiana Fever - 2026-01-22.xlsx";
const EXCEL_PATH = process.env.EXCEL_PATH || DEFAULT_EXCEL_PATH;

const OUT_DIR = path.resolve(process.cwd(), "exported-pdfs");

const TEMPLATES = [
  { id: 2, label: "Classic" },
  { id: 3, label: "Modern" },
  { id: 4, label: "Premium" },
] as const;

const MODES = [
  { mode: "BUDGET" as const, label: "Budget" },
  { mode: "PROPOSAL" as const, label: "Proposal" },
  { mode: "LOI" as const, label: "Letter of Intent" },
] as const;

function safeFilenamePart(s: string): string {
  return s
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "proposal";
}

function numberToWords(n: number): string {
  if (n >= 1000000) return `${Math.floor(n / 1000000)} million`;
  if (n >= 1000) return `${Math.floor(n / 1000)} thousand`;
  return String(Math.round(n));
}

/** Build full proposal payload from Excel import result (formData + internalAudit). */
function buildPayloadFromExcel(
  formData: { receiver?: { name?: string }; details?: Record<string, unknown> },
  internalAudit: { totals?: Record<string, unknown>; perScreen?: unknown[] },
  pdfTemplate: number,
  documentMode: "BUDGET" | "PROPOSAL" | "LOI"
) {
  const now = new Date();
  const proposalDate = now.toISOString().slice(0, 10);
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const screens = (Array.isArray(formData.details?.screens) ? formData.details?.screens : []) as any[];
  const totals = internalAudit?.totals || (formData.details?.clientSummary as Record<string, unknown>) || {};
  const totalAmount = Number(totals.finalClientTotal ?? totals.sellPrice ?? 0) || 0;
  const isLOI = documentMode === "LOI";

  const details: Record<string, unknown> = {
    ...(formData.details || {}),
    proposalId: "export-from-excel",
    proposalNumber: "EXCEL-001",
    proposalName: (formData.details?.proposalName as string) || "LED Display Proposal",
    clientName: (formData.receiver?.name as string) || (formData.details?.proposalName as string) || "Client",
    proposalDate,
    dueDate,
    currency: "USD",
    language: "English",
    items: screens.length ? screens.slice(0, 1).map((s: any) => ({ name: s.name || "Display", quantity: 1, unitPrice: totalAmount, total: totalAmount })) : [{ name: "LED Display", quantity: 1, unitPrice: totalAmount || 50000, total: totalAmount || 50000 }],
    screens,
    subTotal: String(totalAmount || 0),
    totalAmount: String(totalAmount || 0),
    totalAmountInWords: numberToWords(totalAmount) + " Dollars",
    paymentTerms: "50% on Deposit, 40% on Mobilization, 10% on Substantial Completion",
    documentMode,
    documentType: isLOI ? "LOI" : "First Round",
    pricingType: documentMode === "PROPOSAL" ? "Hard Quoted" : "Budget",
    pdfTemplate,
    venue: formData.details?.venue || "Generic",
    location: (formData.details?.location as string) || "",
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

  const clientName = (formData.receiver?.name as string) || (formData.details?.proposalName as string) || "Client";
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
      name: clientName,
      address: "456 Client Ave",
      zipCode: "26506",
      city: "Morgantown",
      country: "USA",
      email: "client@example.com",
      phone: "304-555-0200",
    },
    details,
    _audit: {
      clientSummary: formData.details?.clientSummary || totals,
      internalAudit,
    },
  };
}

/** Fallback minimal payload when no Excel. */
function buildMinimalPayload(pdfTemplate: number, documentMode: "BUDGET" | "PROPOSAL" | "LOI") {
  const now = new Date();
  const proposalDate = now.toISOString().slice(0, 10);
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const screens = [
    { id: "demo-1", name: "Main Display", productType: "LED", widthFt: 20, heightFt: 10, quantity: 1, pitchMm: 4, costPerSqFt: 120, desiredMargin: 0.25 },
  ];
  const { calculateProposalAudit } = require("../lib/estimator");
  const audit = calculateProposalAudit(
    screens.map((s) => ({ name: s.name, productType: s.productType, widthFt: s.widthFt, heightFt: s.heightFt, quantity: s.quantity, pitchMm: s.pitchMm, costPerSqFt: s.costPerSqFt, desiredMargin: s.desiredMargin })),
    { taxRate: 0.095, bondPct: 0.015, projectAddress: "123 Demo St, Morgantown, WV 26505", venue: "Generic" }
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
    sender: { name: "ANC Sports Enterprises", address: "123 ANC Way", zipCode: "26505", city: "Morgantown", country: "USA", email: "proposals@example.com", phone: "304-555-0100" },
    receiver: { name: clientName, address: "456 Client Ave", zipCode: "26506", city: "Morgantown", country: "USA", email: "client@example.com", phone: "304-555-0200" },
    details,
    _audit: audit,
  };
}

async function downloadOne(
  payload: Record<string, unknown>,
  clientName: string,
  modeLabel: string,
  templateLabel: string
): Promise<string> {
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

  let clientName = process.env.CLIENT_NAME || "Demo Client";
  let getPayload: (pdfTemplate: number, documentMode: "BUDGET" | "PROPOSAL" | "LOI") => Record<string, unknown>;

  if (fs.existsSync(EXCEL_PATH)) {
    console.log("Excel:", EXCEL_PATH);
    const importUrl = `${BASE_URL.replace(/\/$/, "")}/api/proposals/import-excel`;
    const buffer = fs.readFileSync(EXCEL_PATH);
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), path.basename(EXCEL_PATH));
    const res = await fetch(importUrl, { method: "POST", body: formData });
    if (!res.ok) {
      console.error("Excel import failed:", res.status, await res.text());
      process.exit(1);
    }
    const data = (await res.json()) as { formData?: { receiver?: { name?: string }; details?: Record<string, unknown> }; internalAudit?: { totals?: Record<string, unknown>; perScreen?: unknown[] } };
    const form = data.formData || {};
    const audit = data.internalAudit || { totals: {}, perScreen: [] };
    clientName = (form.receiver?.name as string) || (form.details?.proposalName as string) || clientName;
    getPayload = (pdfTemplate, documentMode) => buildPayloadFromExcel(form, audit, pdfTemplate, documentMode);
    console.log("Using real data from Excel. Client/project:", clientName, "| Screens:", (form.details?.screens as unknown[])?.length ?? 0);
  } else {
    console.log("No Excel at", EXCEL_PATH, "- using minimal demo payload.");
    getPayload = (pdfTemplate, documentMode) => buildMinimalPayload(pdfTemplate, documentMode);
  }

  // Pre-flight
  try {
    const healthUrl = `${BASE_URL.replace(/\/$/, "")}/api/health`;
    const res = await fetch(healthUrl, { method: "GET" });
    if (res.status === 404) {
      console.error("\nApp at BASE_URL is not the invoify app (or not running).");
      process.exit(1);
    }
  } catch (e: unknown) {
    console.error("\nCannot reach app at", BASE_URL, e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const done: string[] = [];
  const failed: { key: string; err: Error }[] = [];

  for (const { mode, label: modeLabel } of MODES) {
    for (const { id, label: templateLabel } of TEMPLATES) {
      const key = `${modeLabel}-${templateLabel}`;
      try {
        const payload = getPayload(id, mode);
        const filePath = await downloadOne(payload, clientName, modeLabel, templateLabel);
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
    failed.forEach(({ key, err }) => console.error("  ", key, err.message));
    const first = failed[0]?.err;
    const text: string = (first && "responseText" in first ? (first as Error & { responseText?: string }).responseText : "") ?? "";
    if (text.includes("Could not find Chrome") || text.includes("Failed to generate PDF")) {
      console.error("\nPDF needs a browser: run against deployed app (BROWSERLESS) or set BROWSERLESS_URL in .env");
    }
    process.exit(1);
  }
}

main();
