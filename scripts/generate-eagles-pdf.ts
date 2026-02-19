import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import React from "react";
import ReactDOMServer from "react-dom/server";
import puppeteer from "puppeteer-core";
import ProposalTemplate5 from "@/app/components/templates/proposal-pdf/ProposalTemplate5";
import {
  parsePricingTablesWithValidation,
  PRICING_PARSER_STRICT_VERSION,
} from "@/services/pricing/pricingTableParser";

(globalThis as any).React = React;

const excelPath =
  process.env.EXCEL_PATH ||
  "/root/rag2/.claude/generated-skills/anc-product-lookup/Philadelphia Eagles - Lincoln Financial Field - Cost Analysis - JSR - 2026-02-18 (rev.1) (1).xlsx";
const outDir = path.resolve(process.cwd(), "exported-pdfs");
const outFile = path.join(
  outDir,
  "Philadelphia Eagles - Lincoln Financial Field - Proposal.pdf"
);

function buildProposal(document: any, validation: any) {
  const now = new Date();
  return {
    sender: {
      name: "ANC Sports Enterprises",
      address: "2 Manhattanville Road, Suite 402",
      zipCode: "10577",
      city: "Purchase, NY",
      country: "United States",
      email: "info@anc.com",
      phone: "(914) 696-2100",
      customInputs: [],
    },
    receiver: {
      name: "Philadelphia Eagles",
      address: "",
      zipCode: "",
      city: "",
      country: "United States",
      email: "",
      phone: "",
      customInputs: [],
    },
    details: {
      proposalId: `eagles-${now.getTime()}`,
      proposalNumber: "EAGLES-2026-02-18",
      proposalName: "Lincoln Financial Field - Cost Analysis",
      proposalDate: now.toISOString(),
      dueDate: now.toISOString(),
      items: [],
      currency: document.currency,
      language: "English",
      taxDetails: { amount: 0, amountType: "amount", taxID: "" },
      discountDetails: { amount: 0, amountType: "amount" },
      shippingDetails: { cost: 0, costType: "amount" },
      paymentInformation: { bankName: "", accountName: "", accountNumber: "" },
      additionalNotes: "",
      paymentTerms: "",
      totalAmountInWords: "",
      documentType: "First Round",
      pricingType: "Hard Quoted",
      documentMode: "PROPOSAL",
      pdfTemplate: 5,
      screens: [],
      internalAudit: {},
      clientSummary: {},
      mirrorMode: true,
      calculationMode: "MIRROR",
      quoteItems: [],
      showPricingTables: true,
      showSpecifications: false,
      showCompanyFooter: true,
      showPaymentTerms: false,
      showSignatureBlock: false,
      showNotes: true,
      showScopeOfWork: false,
      pageLayout: "portrait-letter",
      specsDisplayMode: "extended",
      includeResponsibilityMatrix: false,
      responsibilityMatrix: null,
      respMatrixFormatOverride: "auto",
      pricingDocument: document,
      parserValidationReport: validation,
      parserStrictVersion: PRICING_PARSER_STRICT_VERSION,
      sourceWorkbookHash: "manual-generate",
    },
    pricingDocument: document,
    marginAnalysis: undefined,
  };
}

async function main() {
  const wb = XLSX.readFile(excelPath);
  const { document, validation } = parsePricingTablesWithValidation(
    wb,
    path.basename(excelPath),
    { strict: true }
  );
  if (!document || validation.status !== "PASS") {
    throw new Error(`Pricing parse failed: ${validation.errors.join("; ")}`);
  }

  const proposal: any = buildProposal(document, validation);
  const htmlTemplate = ReactDOMServer.renderToStaticMarkup(
    ProposalTemplate5(proposal)
  );

  const html = `<!doctype html><html><head><meta charset="utf-8"/><base href="http://localhost:3003/"/><style>body,.font-sans{font-family:Arial,Helvetica,sans-serif!important;line-height:1.3!important;font-size:10px!important}h1,h2,h3,h4,h5,h6{font-family:Arial,Helvetica,sans-serif!important;line-height:1.3!important}p,div,span,td,th{line-height:1.3!important}</style></head><body>${htmlTemplate}</body></html>`;

  const wsEndpoint =
    process.env.BROWSERLESS_INTERNAL_URL || process.env.BROWSERLESS_URL;
  if (!wsEndpoint) {
    throw new Error("No Browserless endpoint configured in environment");
  }

  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1 });
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "load"],
      timeout: 60000,
    });
    const pdf = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
      margin: { top: "20px", bottom: "32px", left: "20px", right: "20px" },
    });
    fs.writeFileSync(outFile, Buffer.from(pdf));
    console.log(outFile);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
