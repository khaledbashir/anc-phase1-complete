import assert from "node:assert/strict";
import fs from "node:fs";
import * as XLSX from "xlsx";
import React from "react";
import ReactDOMServer from "react-dom/server";
import ProposalTemplate5 from "@/app/components/templates/proposal-pdf/ProposalTemplate5";
import { parsePricingTablesWithValidation, PRICING_PARSER_STRICT_VERSION } from "@/services/pricing/pricingTableParser";
import { goldenFixtures } from "./golden-pricing-fixtures";

(globalThis as any).React = React;

for (const fixture of goldenFixtures) {
  assert.ok(fs.existsSync(fixture.file), `Missing golden fixture: ${fixture.file}`);
  const wb = XLSX.readFile(fixture.file);
  const { document, validation } = parsePricingTablesWithValidation(wb, fixture.name, { strict: true });
  assert.equal(validation.status, "PASS", `${fixture.name}: validation failed: ${validation.errors.join("; ")}`);
  assert.ok(document, `${fixture.name}: parser returned null`);

  const proposal: any = {
    sender: {
      name: "ANC Sports Enterprises",
      address: "2 Manhattanville Road, Suite 402",
      zipCode: "10577",
      city: "Purchase, NY",
      country: "United States",
      email: "info@ancsports.com",
      phone: "(914) 696-2100",
      customInputs: [],
    },
    receiver: {
      name: fixture.name,
      address: "",
      zipCode: "",
      city: "",
      country: "",
      email: "",
      phone: "",
      customInputs: [],
    },
    details: {
      proposalId: `golden-${fixture.name}`,
      proposalName: fixture.name,
      proposalDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      items: [],
      currency: "USD",
      language: "English",
      taxDetails: { amount: 0, amountType: "amount", taxID: "" },
      discountDetails: { amount: 0, amountType: "amount" },
      shippingDetails: { cost: 0, costType: "amount" },
      paymentInformation: { bankName: "", accountName: "", accountNumber: "" },
      additionalNotes: "",
      paymentTerms: "",
      totalAmountInWords: "",
      documentType: "LOI",
      pricingType: "Budget",
      documentMode: "LOI",
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
      showPaymentTerms: true,
      showSignatureBlock: true,
      showNotes: true,
      showScopeOfWork: false,
      pageLayout: "portrait-letter",
      specsDisplayMode: "extended",
      includeResponsibilityMatrix: true,
      responsibilityMatrix: null,
      respMatrixFormatOverride: "auto",
      pricingDocument: document,
      parserValidationReport: validation,
      parserStrictVersion: PRICING_PARSER_STRICT_VERSION,
      sourceWorkbookHash: "golden-test",
    },
    pricingDocument: document,
    marginAnalysis: undefined,
  };

  const html = ReactDOMServer.renderToStaticMarkup(ProposalTemplate5(proposal));
  const upper = html.toUpperCase();

  for (const s of fixture.expected.htmlMustContain || []) {
    assert.ok(upper.includes(s.toUpperCase()), `${fixture.name}: rendered HTML missing text ${s}`);
  }
  for (const s of fixture.expected.htmlMustNotContain || []) {
    assert.ok(!upper.includes(s.toUpperCase()), `${fixture.name}: rendered HTML contains forbidden text ${s}`);
  }

  console.log(`PASS: ${fixture.name}`);
}

console.log("PASS: golden rendered-pdf assertion suite");
