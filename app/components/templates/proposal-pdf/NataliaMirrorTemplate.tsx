/**
 * NataliaMirrorTemplate - Enterprise-grade PDF template for Mirror Mode
 *
 * Renders PricingTable[] to match Natalia's Scotia Bank PDF exactly.
 * Each location = separate table with footer + alternates.
 *
 * NOTE: This component must work on BOTH client and server
 * - Client: Live PDF preview in browser
 * - Server: PDF generation API endpoint
 * Do NOT add "use client" directive or it breaks server-side rendering.
 */

import React from "react";
import { ProposalType } from "@/types";
import {
  PricingTable,
  PricingDocument,
  RespMatrix,
  RespMatrixCategory,
  RespMatrixItem,
  formatPricingCurrency,
} from "@/types/pricing";
import {
  computeTableTotals,
  computeDocumentTotal,
  getEffectiveDescription,
  getEffectivePrice,
} from "@/lib/pricingMath";
import LogoSelectorServer from "@/app/components/reusables/LogoSelectorServer";

// ============================================================================
// TYPES
// ============================================================================

interface NataliaMirrorTemplateProps extends ProposalType {
  isSharedView?: boolean;
}

type DocumentMode = "BUDGET" | "PROPOSAL" | "LOI";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NataliaMirrorTemplate(data: NataliaMirrorTemplateProps) {
  const { details, receiver } = data;

  // Get pricing document from form data
  const pricingDocument: PricingDocument | null = (details as any)?.pricingDocument || null;
  const tables = pricingDocument?.tables || [];
  const currency = pricingDocument?.currency || "USD";

  // FR-4.1: Table header overrides (e.g., "G7" → "Ribbon Display")
  const tableHeaderOverrides: Record<string, string> = (details as any)?.tableHeaderOverrides || {};
  // Mirror Mode overrides for line items
  const descriptionOverrides: Record<string, string> = (details as any)?.descriptionOverrides || {};
  const priceOverrides: Record<string, number> = (details as any)?.priceOverrides || {};

  // FR-4.2: Custom proposal notes
  const customProposalNotes: string = (details as any)?.customProposalNotes || "";

  // FR-4.3: Custom introduction text (stored as additionalNotes in form/DB)
  const introductionText: string = (details as any)?.additionalNotes || "";

  // Document mode - FIX: Read documentMode, not documentType (legacy field)
  const documentMode: DocumentMode =
    ((details as any)?.documentMode as DocumentMode) || "BUDGET";

  // Client info — guard against raw numbers (e.g., project IDs mistakenly used as names)
  const rawClientName = receiver?.name || "";
  const clientName = rawClientName && !/^\d+$/.test(rawClientName.trim()) ? rawClientName : "Client Name";
  const projectName = details?.proposalName || "Project";
  // Prompt 42: Purchaser legal name for LOI (defaults to client name if not set)
  const purchaserLegalName = ((details as any)?.purchaserLegalName || "").trim() || clientName;

  // Address info for LOI legal paragraph
  const clientAddress = receiver?.address || (details as any)?.clientAddress || "";
  const clientCity = receiver?.city || (details as any)?.clientCity || "";
  const clientZip = receiver?.zipCode || (details as any)?.clientZip || "";
  const purchaserAddress = [clientAddress, clientCity, clientZip].filter(Boolean).join(", ");

  // Override-aware helpers — delegate to centralized pricingMath.ts
  const getItemDesc = (tableId: string, idx: number, original: string) =>
    getEffectiveDescription(descriptionOverrides, tableId, idx, original);
  const getItemPrice = (tableId: string, idx: number, original: number) =>
    getEffectivePrice(priceOverrides, tableId, idx, original);

  // Document total: centralized round-then-sum via pricingMath.ts
  const documentTotal = computeDocumentTotal(
    pricingDocument as PricingDocument,
    priceOverrides,
    descriptionOverrides,
  );

  // Screen specifications from form (for Technical Specs section)
  const screens = (details as any)?.screens || [];
  const showSpecifications = (details as any)?.showSpecifications ?? true;

  // Page layout: landscape modes render detail tables in a two-column grid
  const pageLayout: string = (details as any)?.pageLayout || "portrait-letter";
  const isLandscape = pageLayout.startsWith("landscape");

  // Detect product type from screens to adjust header text
  const detectProductType = (): "LED" | "LCD" | "Display" => {
    if (!screens || screens.length === 0) return "Display";

    const productTypes = new Set<string>();
    screens.forEach((screen: any) => {
      const type = (screen?.productType || "").toString().trim().toUpperCase();
      if (type) productTypes.add(type);
    });

    // If all screens are LCD, use LCD
    if (productTypes.size === 1 && productTypes.has("LCD")) return "LCD";
    // If all screens are LED, use LED
    if (productTypes.size === 1 && productTypes.has("LED")) return "LED";
    // Mixed or unknown, use generic "Display"
    return "Display";
  };

  const productType = detectProductType();
  const displayTypeLabel = productType === "Display" ? "Display" : `${productType} Display`;

  // Issue #2 Fix: Build mapping from screen group → custom display name
  // screen.group matches pricing table names (both come from Margin Analysis headers)
  const screenNameMap: Record<string, string> = {};
  screens.forEach((screen: any) => {
    const group = screen?.group;
    if (!group) return;
    const explicitOverride = screen?.customDisplayName || screen?.externalName;
    if (explicitOverride) {
      screenNameMap[group] = explicitOverride;
    } else if (screen?.name && screen.name !== group) {
      screenNameMap[group] = screen.name;
    }
  });

  // Helper to get display name for a table (with override support)
  const getTableDisplayName = (table: PricingTable): string => {
    // Priority: explicit header override > screen name edit > Excel original
    return tableHeaderOverrides[table.id] || screenNameMap[table.name] || table.name;
  };

  // Prompt 51: Master table index — designates which pricing table is the "Project Grand Total"
  // Auto-detect: if no explicit masterTableIndex, check if tables[0] is a summary/rollup table
  const rollUpRegex = /\b(total|roll.?up|summary|project\s+grand|grand\s+total|project\s+total|cost\s+summary|pricing\s+summary)\b/i;
  let masterTableIndex: number | null = (details as any)?.masterTableIndex ?? null;
  if (masterTableIndex === null && tables.length > 1 && rollUpRegex.test(tables[0]?.name || "")) {
    masterTableIndex = 0;
  }
  const masterTable = masterTableIndex !== null ? tables[masterTableIndex] ?? null : null;
  // Detail tables = all tables except the master table
  const detailTables = masterTableIndex !== null
    ? tables.filter((_: any, idx: number) => idx !== masterTableIndex)
    : tables;

  // Shared fragments used in multiple render paths
  const headerBlock = (
    <Header
      documentMode={documentMode}
      clientName={clientName}
      projectName={projectName}
    />
  );

  const introBlock = (
    <IntroSection
      documentMode={documentMode}
      clientName={clientName}
      purchaserLegalName={purchaserLegalName}
      currency={currency}
      purchaserAddress={purchaserAddress}
      projectName={projectName}
      customIntroText={introductionText}
      displayTypeLabel={displayTypeLabel}
    />
  );

  // Detail tables: single-column (portrait) or two-column grid (landscape)
  const detailTablesBlock = isLandscape ? (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {detailTables.map((table) => (
        <div key={table.id}>
          <PricingTableSection
            table={table}
            currency={currency}
            displayName={getTableDisplayName(table)}
            descriptionOverrides={descriptionOverrides}
            priceOverrides={priceOverrides}
          />
          {table.alternates.length > 0 && (
            <AlternatesSection
              alternates={table.alternates}
              currency={currency}
            />
          )}
        </div>
      ))}
    </div>
  ) : (
    detailTables.map((table) => (
      <React.Fragment key={table.id}>
        <PricingTableSection
          table={table}
          currency={currency}
          displayName={getTableDisplayName(table)}
          descriptionOverrides={descriptionOverrides}
          priceOverrides={priceOverrides}
        />
        {table.alternates.length > 0 && (
          <AlternatesSection
            alternates={table.alternates}
            currency={currency}
          />
        )}
      </React.Fragment>
    ))
  );

  const specsBlock = showSpecifications && screens.length > 0 ? (
    <TechnicalSpecsSection screens={screens} clientName={clientName} />
  ) : null;

  // Resp Matrix SOW (parsed from Excel "Resp Matrix" sheet)
  const respMatrix = pricingDocument?.respMatrix ?? null;
  const respMatrixBlock = respMatrix && respMatrix.categories.length > 0 ? (
    <RespMatrixSOWSection respMatrix={respMatrix} clientName={clientName} />
  ) : null;

  const pageBreak = (
    <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }} />
  );

  const continuationHeader = (
    <ContinuationHeader clientName={clientName} projectName={projectName} />
  );

  // ──────────────────────────────────────────────────────────────────────
  // LOI MODE — Natalia's required page structure
  // ──────────────────────────────────────────────────────────────────────
  if (documentMode === "LOI") {
    const hasMasterTable = masterTable !== null;

    return (
      <div className="bg-white min-h-screen font-sans">
        <div style={{ maxWidth: isLandscape ? '1200px' : '816px', margin: '0 auto' }}>
          {/* ── Page 1: Header + Intro + Project Summary (Structure A) ── */}
          {headerBlock}
          {introBlock}

          {hasMasterTable ? (
            <>
              {/* ═══ BUSINESS (Page 1): Pricing Summary + Detail Breakdown ═══ */}
              <MasterTableSection
                table={masterTable}
                currency={currency}
                displayName={getTableDisplayName(masterTable)}
                descriptionOverrides={descriptionOverrides}
                priceOverrides={priceOverrides}
              />
              {detailTables.length > 0 && detailTablesBlock}

              {/* ═══ LEGAL (Page 2): Payment Terms + Signatures at top ═══ */}
              {pageBreak}
              {continuationHeader}
              <PaymentTermsSection paymentTerms={(details as any)?.paymentTerms} />
              {customProposalNotes && (
                <CustomNotesSection notes={customProposalNotes} isLOI={true} />
              )}
              <SignatureSection clientName={clientName} />

              {/* ═══ THE KICK (Page 3): Technical content on fresh page ═══ */}
              {specsBlock && pageBreak}
              {specsBlock && continuationHeader}
              {specsBlock}

              {/* ═══ TECHNICAL (Pages 4-5): SOW + Matrix flow continuously ═══ */}
              {respMatrixBlock}
            </>
          ) : (
            <>
              {/* Structure B: No master table — detail tables first */}
              {detailTables.length > 0 && (
                <DocumentTotalSection total={documentTotal} currency={currency} isLOIPosition={true} />
              )}
              {detailTablesBlock}

              {/* Then: Payment Terms + Signatures */}
              <PaymentTermsSection paymentTerms={(details as any)?.paymentTerms} />
              {customProposalNotes && (
                <CustomNotesSection notes={customProposalNotes} isLOI={true} />
              )}
              <SignatureSection clientName={clientName} />

              {/* ── Last pages: Technical Specifications ── */}
              {specsBlock && pageBreak}
              {specsBlock && continuationHeader}
              {specsBlock}

              {/* Resp Matrix SOW (if present in Excel) */}
              {respMatrixBlock}
            </>
          )}

          <StatementOfWorkSection details={details} />
          <Footer />
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // BUDGET / PROPOSAL MODE
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white min-h-screen font-sans">
      <div style={{ maxWidth: isLandscape ? '1200px' : '816px', margin: '0 auto' }}>
        {headerBlock}
        {introBlock}

        {/* Master table (project summary) on page 1 */}
        {masterTable && (
          <MasterTableSection
            table={masterTable}
            currency={currency}
            displayName={getTableDisplayName(masterTable)}
            descriptionOverrides={descriptionOverrides}
            priceOverrides={priceOverrides}
          />
        )}

        {/* Page break: detail section breakdowns start on a new page */}
        {detailTables.length > 0 && pageBreak}
        {detailTables.length > 0 && continuationHeader}

        {/* Detail pricing tables (excludes master table if set) */}
        {detailTablesBlock}

        {/* Document total (if multiple tables and no master table) */}
        {detailTables.length > 1 && masterTableIndex === null && (
          <DocumentTotalSection total={documentTotal} currency={currency} />
        )}

        {/* Technical Specifications */}
        {specsBlock}

        {/* Custom Notes */}
        {customProposalNotes && (
          <CustomNotesSection notes={customProposalNotes} />
        )}

        {/* Resp Matrix SOW (if present in Excel) */}
        {respMatrixBlock}

        <StatementOfWorkSection details={details} />
        <Footer />
      </div>
    </div>
  );
}

// ============================================================================
// CONTINUATION PAGE HEADER (appears on pages after page 1)
// ============================================================================

function ContinuationHeader({
  clientName,
  projectName,
}: {
  clientName: string;
  projectName: string;
}) {
  const label = projectName
    ? `${clientName} — ${projectName}`.toUpperCase()
    : clientName.toUpperCase();

  return (
    <div
      className="text-center py-2 text-[9px] font-bold uppercase tracking-widest break-inside-avoid"
      style={{ background: '#0A52EF', color: '#ffffff' }}
    >
      {label}
    </div>
  );
}

// ============================================================================
// HEADER
// ============================================================================

function Header({
  documentMode,
  clientName,
  projectName,
}: {
  documentMode: DocumentMode;
  clientName: string;
  projectName: string;
}) {
  const title =
    documentMode === "BUDGET"
      ? "BUDGET ESTIMATE"
      : documentMode === "PROPOSAL"
        ? "SALES QUOTATION"
        : "LETTER OF INTENT";

  return (
    <div className="px-12 pt-6 pb-3 border-b-2 border-[#0A52EF]">
      <div className="flex justify-between items-start">
        <LogoSelectorServer theme="light" width={120} height={60} />
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            {title}
          </div>
          <div className="text-xl font-bold text-[#0A52EF]">{clientName}</div>
          <div className="text-xs text-gray-400">{projectName}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTRO SECTION
// ============================================================================

function IntroSection({
  documentMode,
  clientName,
  purchaserLegalName,
  currency,
  purchaserAddress,
  projectName,
  customIntroText,
  displayTypeLabel,
}: {
  documentMode: DocumentMode;
  clientName: string;
  purchaserLegalName?: string;
  currency: "CAD" | "USD";
  purchaserAddress?: string;
  projectName?: string;
  customIntroText?: string;
  displayTypeLabel?: string;
}) {
  // FR-4.3: Use custom intro text if provided, otherwise generate default
  let intro: string;

  if (customIntroText?.trim()) {
    intro = customIntroText.trim();
  } else {
    const currencyNote =
      currency === "CAD"
        ? " All pricing and financial figures quoted in this proposal are in Canadian Dollars (CAD)."
        : "";

    // Bug #2 Fix: Full legal paragraph for LOI mode with addresses
    const ancAddress = "2 Manhattanville Road, Suite 402, Purchase, NY 10577";
    const purchaserLocationClause = purchaserAddress
      ? ` located at ${purchaserAddress}`
      : "";
    const projectClause = projectName ? ` for the ${projectName}` : "";

    intro =
      documentMode === "BUDGET"
        ? `ANC is pleased to present the following ${displayTypeLabel} budget for ${clientName} per the specifications and pricing below.${currencyNote}`
        : documentMode === "PROPOSAL"
          ? `ANC is pleased to present the following ${displayTypeLabel} proposal for ${clientName} per the specifications and pricing below.${currencyNote}`
          : `This Letter of Intent will set forth the terms by which ${purchaserLegalName || clientName} ("Purchaser")${purchaserLocationClause} and ANC Sports Enterprises, LLC ("ANC") located at ${ancAddress} (collectively, the "Parties") agree that ANC will provide the following ${displayTypeLabel} and services (the "Display System") described below for the ${projectName || "project"}.${currencyNote}`;
  }

  return (
    <div className="px-12 py-1">
      <p className="text-[11px] text-gray-600 leading-relaxed text-justify">
        {intro}
      </p>
    </div>
  );
}

// ============================================================================
// MASTER TABLE (Prompt 51) — Darker header, renders first as Project Summary
// ============================================================================

function MasterTableSection({
  table,
  currency,
  displayName,
  descriptionOverrides = {},
  priceOverrides = {},
}: {
  table: PricingTable;
  currency: "CAD" | "USD";
  displayName?: string;
  descriptionOverrides?: Record<string, string>;
  priceOverrides?: Record<string, number>;
}) {
  const currencyLabel = `PRICING (${currency})`;
  const headerName = displayName || table.name;
  // Centralized round-then-sum via pricingMath.ts
  const totals = computeTableTotals(table, priceOverrides, descriptionOverrides);

  return (
    <div className="px-12 py-2">
      {/* Darker French Blue header to distinguish as summary */}
      <div className="flex justify-between items-center pb-1 mb-0" style={{ borderBottom: '3px solid #002C73' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#002C73' }}>
          {headerName}
        </h2>
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: '#002C73' }}>
          {currencyLabel}
        </span>
      </div>

      {/* Line items — pre-filtered & pre-rounded by computeTableTotals */}
      <div className="border-b border-gray-300">
        {totals.items.map((ri) => (
          <div
            key={`master-item-${ri.originalIndex}`}
            className="flex justify-between py-0.5 border-b border-gray-100 text-[10px] leading-tight"
          >
            <div className="flex-1 pr-4">
              <span className="text-gray-700">{ri.description}</span>
            </div>
            <div className="text-right font-medium text-gray-800 w-28">
              {ri.isIncluded ? (
                <span className="text-gray-800">INCLUDED</span>
              ) : (
                formatPricingCurrency(ri.price, currency)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer rows */}
      <div style={{ borderTop: '3px solid #002C73' }} className="mt-0">
        {/* Subtotal */}
        <div className="flex justify-between py-0.5 text-[10px] leading-tight font-bold">
          <span className="text-gray-800">SUBTOTAL:</span>
          <span className="text-gray-800 w-28 text-right">
            {formatPricingCurrency(totals.subtotal, currency)}
          </span>
        </div>

        {/* Tax */}
        {table.tax && (
          <div className="flex justify-between py-0.5 text-[10px] leading-tight">
            <span className="text-gray-600">{totals.taxLabel}</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(totals.tax, currency)}
            </span>
          </div>
        )}

        {/* Bond — only show if non-zero */}
        {totals.bond > 0 && (
          <div className="flex justify-between py-0.5 text-[10px] leading-tight">
            <span className="text-gray-600">BOND</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(totals.bond, currency)}
            </span>
          </div>
        )}

        {/* Grand Total - prominent */}
        <div className="flex justify-between py-0.5 text-[11px] leading-tight font-bold border-t border-gray-300">
          <span style={{ color: '#002C73' }}>GRAND TOTAL:</span>
          <span className="w-28 text-right" style={{ color: '#002C73', fontSize: '14px' }}>
            {formatPricingCurrency(totals.grandTotal, currency)}
          </span>
        </div>
      </div>

    </div>
  );
}

// ============================================================================
// PRICING TABLE
// ============================================================================

function PricingTableSection({
  table,
  currency,
  displayName,
  descriptionOverrides = {},
  priceOverrides = {},
}: {
  table: PricingTable;
  currency: "CAD" | "USD";
  displayName?: string;
  descriptionOverrides?: Record<string, string>;
  priceOverrides?: Record<string, number>;
}) {
  const currencyLabel = `PRICING (${currency})`;
  const headerName = displayName || table.name;
  // Centralized round-then-sum via pricingMath.ts
  const totals = computeTableTotals(table, priceOverrides, descriptionOverrides);

  return (
    <div className="px-12 py-2">
      {/* Table header */}
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-1 mb-0">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {headerName}
        </h2>
        <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {currencyLabel}
        </span>
      </div>

      {/* Line items — pre-filtered & pre-rounded by computeTableTotals */}
      <div className="border-b border-gray-300">
        {totals.items.map((ri) => (
          <div
            key={`${table.id}-item-${ri.originalIndex}`}
            className="flex justify-between py-0.5 border-b border-gray-100 text-[10px] leading-tight"
          >
            <div className="flex-1 pr-4">
              <span className="text-gray-700">{ri.description}</span>
            </div>
            <div className="text-right font-medium text-gray-800 w-28">
              {ri.isIncluded ? (
                <span className="text-gray-800">INCLUDED</span>
              ) : (
                formatPricingCurrency(ri.price, currency)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer rows */}
      <div className="border-t-2 border-gray-800 mt-0">
        {/* Subtotal */}
        <div className="flex justify-between py-0.5 text-[10px] leading-tight font-bold">
          <span className="text-gray-800">SUBTOTAL:</span>
          <span className="text-gray-800 w-28 text-right">
            {formatPricingCurrency(totals.subtotal, currency)}
          </span>
        </div>

        {/* Tax */}
        {table.tax && (
          <div className="flex justify-between py-0.5 text-[10px] leading-tight">
            <span className="text-gray-600">{totals.taxLabel}</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(totals.tax, currency)}
            </span>
          </div>
        )}

        {/* Bond — only show if non-zero */}
        {totals.bond > 0 && (
          <div className="flex justify-between py-0.5 text-[10px] leading-tight">
            <span className="text-gray-600">BOND</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(totals.bond, currency)}
            </span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between py-0.5 text-[11px] leading-tight font-bold border-t border-gray-300">
          <span className="text-gray-800">GRAND TOTAL:</span>
          <span className="text-[#0A52EF] w-28 text-right">
            {formatPricingCurrency(totals.grandTotal, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ALTERNATES SECTION — Distinct table rendered AFTER section grand total
// ============================================================================

function AlternatesSection({
  alternates,
  currency,
}: {
  alternates: PricingTable["alternates"];
  currency: "CAD" | "USD";
}) {
  const currencyLabel = `PRICING (${currency})`;

  return (
    <div className="px-12 pt-2 pb-1">
      {/* Table header — matches main pricing table header styling */}
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-1 mb-0">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          ALTERNATES — ADD TO COST ABOVE
        </h2>
        <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {currencyLabel}
        </span>
      </div>

      {/* Alternate line items */}
      <div className="border-b border-gray-300">
        {alternates.map((alt, idx) => (
          <div
            key={`alt-${idx}`}
            className="flex justify-between py-0.5 border-b border-gray-100 text-[10px] leading-tight"
          >
            <div className="flex-1 pr-4">
              <span className="text-gray-700">{alt.description}</span>
            </div>
            <div className="text-right font-medium text-gray-800 w-28">
              {formatPricingCurrency(alt.priceDifference, currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT TOTAL (for multiple tables)
// ============================================================================

function DocumentTotalSection({
  total,
  currency,
  isLOIPosition = false,
}: {
  total: number;
  currency: "CAD" | "USD";
  isLOIPosition?: boolean;
}) {
  // FR-2.3: Different styling for LOI (top position) vs Budget/Proposal (bottom)
  const containerClass = isLOIPosition
    ? "px-12 py-3 mb-2 bg-[#0A52EF]/10 border-2 border-[#0A52EF] rounded-lg"
    : "px-12 py-3 mt-2 bg-[#0A52EF]/5 border-t-2 border-[#0A52EF]";

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold text-gray-800">
          PROJECT GRAND TOTAL:
        </span>
        <span className="text-2xl font-bold text-[#0A52EF]">
          {formatPricingCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// LOI SECTIONS
// ============================================================================

function PaymentTermsSection({ paymentTerms }: { paymentTerms?: string }) {
  // Bug #3 Fix: Use payment terms from field, fallback to default
  const defaultTerms = "• 50% Deposit Upon Signing\n• 40% on Mobilization\n• 10% on Substantial Completion";
  const terms = paymentTerms?.trim() || defaultTerms;

  // Check if terms are bullet-style or freeform
  const isBulletStyle = terms.includes("•") || terms.includes("-");

  return (
    <div className="px-12 py-1">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">
        PAYMENT TERMS
      </h3>
      {isBulletStyle ? (
        <ul className="text-[11px] text-gray-600 space-y-1">
          {terms.split("\n").filter(line => line.trim()).map((line, idx) => (
            <li key={idx}>{line.startsWith("•") || line.startsWith("-") ? line : `• ${line}`}</li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
          {terms}
        </div>
      )}
    </div>
  );
}

function SignatureSection({ clientName }: { clientName: string }) {
  return (
    <div className="px-12 py-1 break-inside-avoid">
      <p className="text-[10px] text-gray-500 mb-2">
        Please sign below to indicate Purchaser&apos;s agreement to purchase the
        Display System as described herein and to authorize ANC to commence
        production.
      </p>

      <div className="grid grid-cols-2 gap-8">
        {/* ANC Signature */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">
            AGREED TO AND ACCEPTED:
          </div>
          <div className="text-xs font-bold text-gray-800 mb-2">
            ANC Sports Enterprises, LLC
          </div>
          <div className="border-b border-gray-400 mb-1 h-6" />
          <div className="text-[10px] text-gray-500">SIGNATURE</div>
          <div className="border-b border-gray-400 mb-1 h-5 mt-3" />
          <div className="text-[10px] text-gray-500">NAME</div>
          <div className="border-b border-gray-400 mb-1 h-5 mt-3" />
          <div className="text-[10px] text-gray-500">DATE</div>
        </div>

        {/* Client Signature */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">&nbsp;</div>
          <div className="text-xs font-bold text-gray-800 mb-2">
            {clientName}
          </div>
          <div className="border-b border-gray-400 mb-1 h-6" />
          <div className="text-[10px] text-gray-500">SIGNATURE</div>
          <div className="border-b border-gray-400 mb-1 h-5 mt-3" />
          <div className="text-[10px] text-gray-500">NAME</div>
          <div className="border-b border-gray-400 mb-1 h-5 mt-3" />
          <div className="text-[10px] text-gray-500">DATE</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TECHNICAL SPECIFICATIONS (reads from details.screens for real-time updates)
// ============================================================================

function TechnicalSpecsSection({ screens, clientName }: { screens: any[], clientName: string }) {
  if (!screens || screens.length === 0) return null;

  const formatFeet = (value: any) => {
    const n = Number(value);
    if (!isFinite(n) || n === 0) return "";
    return `${n.toFixed(2)}'`;
  };

  const computePixels = (feetValue: any, pitchMm: any) => {
    const ft = Number(feetValue);
    // UAT: normalizePitch guards against decimal-stripped values (125 → 1.25)
    let pitch = Number(pitchMm);
    if (!isFinite(ft) || ft <= 0) return 0;
    if (!isFinite(pitch) || pitch <= 0) return 0;
    if (pitch > 100) pitch = pitch / 100;
    if (pitch > 50) pitch = pitch / 10;
    return Math.round((ft * 304.8) / pitch);
  };

  const formatNumberWithCommas = (num: number) => {
    return num.toLocaleString("en-US");
  };

  return (
    <div className="px-12 py-3 break-before-page" style={{ pageBreakBefore: 'always' }}>
      <div className="text-center mb-8 mt-6">
        <h2 className="text-xl font-medium tracking-[0.2em] text-gray-500 uppercase font-sans">
          CLIENT — {clientName}
        </h2>
      </div>
      <h2 className="text-sm font-bold text-[#0A52EF] uppercase tracking-wide border-b-2 border-[#0A52EF] pb-1 mb-2">
        SPECIFICATIONS
      </h2>

      <div className="border border-gray-300">
        {/* Table Header - Fixed column widths to prevent overlapping */}
        <div className="grid grid-cols-12 text-[8px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 bg-gray-50">
          <div className="col-span-3 px-2 py-1.5">Display Name</div>
          <div className="col-span-3 px-2 py-1.5">Dimensions</div>
          <div className="col-span-1 px-2 py-1.5 text-right">Pitch</div>
          <div className="col-span-2 px-2 py-1.5 text-right">Resolution</div>
          <div className="col-span-2 px-2 py-1.5 text-right">Brightness</div>
          <div className="col-span-1 px-2 py-1.5 text-right">Qty</div>
        </div>

        {/* Table Body */}
        <div className="text-[8px] text-gray-900">
          {screens.map((screen: any, idx: number) => {
            const rawName = (screen?.customDisplayName || screen?.externalName || screen?.name || "Display").toString().trim() || "Display";
            const name = rawName.replace(/\s*nits\b/gi, " Brightness").replace(/\bnits\b/gi, "Brightness").trim();
            const h = screen?.heightFt ?? screen?.height ?? 0;
            const w = screen?.widthFt ?? screen?.width ?? 0;
            const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
            const qty = Number(screen?.quantity || 1);
            const pixelsH = screen?.pixelsH || computePixels(h, pitch);
            const pixelsW = screen?.pixelsW || computePixels(w, pitch);
            const resolution = pixelsH && pixelsW ? `${pixelsH} x ${pixelsW}` : "";
            const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
            const brightnessNumber = Number(rawBrightness);
            const brightnessText =
              rawBrightness == null || rawBrightness === "" || rawBrightness === 0
                ? ""
                : isFinite(brightnessNumber) && brightnessNumber > 0
                  ? `${formatNumberWithCommas(brightnessNumber)} Brightness`
                  : String(rawBrightness).replace(/\s*nits\b/gi, " Brightness").replace(/\bnits\b/gi, "Brightness").trim();

            return (
              <div
                key={screen?.id || `screen-${idx}`}
                className="grid grid-cols-12 border-b border-gray-200 last:border-b-0 break-inside-avoid"
              >
                <div className="col-span-3 px-2 py-1.5 font-medium">{name}</div>
                <div className="col-span-3 px-2 py-1.5 text-gray-700">
                  {h > 0 && w > 0 ? `${formatFeet(h)} x ${formatFeet(w)}` : ""}
                </div>
                <div className="col-span-1 px-2 py-1.5 text-right tabular-nums">
                  {pitch ? (() => { let p = Number(pitch); if (p > 100) p /= 100; if (p > 50) p /= 10; return `${p < 2 ? p.toFixed(2) : (p % 1 === 0 ? p.toFixed(0) : p.toFixed(2))}mm`; })() : ""}
                </div>
                <div className="col-span-2 px-2 py-1.5 text-right tabular-nums">
                  {resolution}
                </div>
                <div className="col-span-2 px-2 py-1.5 text-right tabular-nums">
                  {brightnessText}
                </div>
                <div className="col-span-1 px-2 py-1.5 text-right tabular-nums">
                  {isFinite(qty) ? qty : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATEMENT OF WORK (Free-text from form field)
// ============================================================================

function StatementOfWorkSection({ details }: { details: any }) {
  const sow = details?.scopeOfWork;
  if (!sow) return null;

  return (
    <div className="px-12 py-1 break-before-page">
      <h2 className="text-sm font-bold text-[#0A52EF] uppercase tracking-wide border-b-2 border-[#0A52EF] pb-1 mb-1">
        STATEMENT OF WORK
      </h2>
      <div
        className="text-[8px] text-gray-600 leading-tight whitespace-pre-wrap [&_p]:my-0 [&_p]:leading-tight [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0.5"
        dangerouslySetInnerHTML={{ __html: sow }}
      />
    </div>
  );
}

// ============================================================================
// RESP MATRIX STATEMENT OF WORK (Parsed from Excel "Resp Matrix" sheet)
// ============================================================================

function RespMatrixSOWSection({
  respMatrix,
  clientName,
}: {
  respMatrix: RespMatrix;
  clientName: string;
}) {
  if (!respMatrix || !respMatrix.categories || respMatrix.categories.length === 0) return null;

  const isIncludeStatement = (anc: string) => {
    const upper = anc.toUpperCase().trim();
    return upper === "INCLUDE STATEMENT" || upper === "INCLUDED STATEMENT";
  };

  const isXMark = (val: string) => {
    return val.trim().toUpperCase().startsWith("X");
  };

  // Render a category header bar
  const CategoryHeader = ({ name, showColumns }: { name: string; showColumns: boolean }) => (
    <div
      className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold uppercase tracking-wider break-inside-avoid"
      style={{ background: '#6b7280', color: '#ffffff' }}
    >
      <div className={showColumns ? "col-span-8" : "col-span-12"}>{name}</div>
      {showColumns && (
        <>
          <div className="col-span-2 text-center">ANC</div>
          <div className="col-span-2 text-center">PURCHASER</div>
        </>
      )}
    </div>
  );

  // Format 1: Paragraph items (Include Statement)
  const ParagraphItems = ({ items }: { items: RespMatrixItem[] }) => (
    <>
      {items.filter(item => isIncludeStatement(item.anc)).map((item, idx) => (
        <div
          key={idx}
          className="px-4 py-2.5 text-[10px] text-gray-700 leading-relaxed border-b border-gray-200"
          style={{ background: idx % 2 === 1 ? '#f9fafb' : '#ffffff' }}
        >
          {item.description}
        </div>
      ))}
    </>
  );

  // Format 2: Table rows with X marks
  const TableItems = ({ items }: { items: RespMatrixItem[] }) => (
    <>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="grid grid-cols-12 px-4 py-2 text-[10px] border-b border-gray-200 items-start"
          style={{ background: idx % 2 === 1 ? '#f9fafb' : '#ffffff' }}
        >
          <div className="col-span-8 text-gray-700 leading-relaxed pr-2">{item.description}</div>
          <div className="col-span-2 text-center font-medium text-gray-800">
            {item.anc && !isIncludeStatement(item.anc) && item.anc.toUpperCase() !== "NA" ? item.anc : ""}
          </div>
          <div className="col-span-2 text-center font-medium text-gray-800">
            {item.purchaser && item.purchaser.toUpperCase() !== "EDITABLE" ? item.purchaser : ""}
          </div>
        </div>
      ))}
    </>
  );

  // Determine which categories are table-style vs paragraph-style
  const categorizeSection = (cat: RespMatrixCategory): "table" | "paragraph" => {
    const xItems = cat.items.filter(i => isXMark(i.anc) || isXMark(i.purchaser));
    const includeItems = cat.items.filter(i => isIncludeStatement(i.anc));
    return xItems.length >= includeItems.length ? "table" : "paragraph";
  };

  return (
    <div className="px-12 py-1 break-before-page" style={{ pageBreakBefore: 'always' }}>
      {/* Title block */}
      <div className="text-center mb-1">
        <div className="text-center mb-8 mt-6">
          <h2 className="text-xl font-medium tracking-[0.2em] text-gray-500 uppercase font-sans">
            CLIENT — {clientName}
          </h2>
        </div>
        <h2 className="text-lg font-bold text-[#0A52EF] uppercase tracking-wide border-b-2 border-[#0A52EF] pb-1 mt-1">
          STATEMENT OF WORK
        </h2>
      </div>

      {/* Render categories */}
      <div className="border border-gray-300 rounded overflow-hidden">
        {respMatrix.categories.map((cat, catIdx) => {
          const sectionType = respMatrix.format === "short"
            ? "paragraph"
            : respMatrix.format === "long"
              ? "table"
              : categorizeSection(cat);

          return (
            <div key={catIdx}>
              <CategoryHeader name={cat.name} showColumns={sectionType === "table"} />
              {sectionType === "table" ? (
                <TableItems items={cat.items} />
              ) : (
                <ParagraphItems items={cat.items} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM NOTES (FR-4.2)
// ============================================================================

function CustomNotesSection({
  notes,
  isLOI = false,
}: {
  notes: string;
  isLOI?: boolean;
}) {
  if (!notes || notes.trim() === "") return null;

  const title = isLOI ? "ADDITIONAL NOTES" : "NOTES";

  return (
    <div className="px-12 py-1">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">
        {title}
      </h3>
      <div className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
        {notes}
      </div>
    </div>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <div className="px-12 py-2 mt-2 border-t-2 border-[#0A52EF]">
      <div className="flex justify-between items-center">
        <div className="text-[9px] font-semibold text-[#0A52EF] tracking-wide">
          www.anc.com
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{ width: '3px', height: '12px', borderRadius: '1px', background: '#0A52EF', opacity: 0.4, transform: 'skewX(-12deg)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
