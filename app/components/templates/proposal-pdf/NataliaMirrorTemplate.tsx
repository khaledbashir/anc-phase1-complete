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
  formatPricingCurrency,
} from "@/types/pricing";
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

  // FR-4.2: Custom proposal notes
  const customProposalNotes: string = (details as any)?.customProposalNotes || "";

  // FR-4.3: Custom introduction text
  const introductionText: string = (details as any)?.introductionText || "";

  // Document mode - FIX: Read documentMode, not documentType (legacy field)
  const documentMode: DocumentMode =
    ((details as any)?.documentMode as DocumentMode) || "BUDGET";

  // Client info
  const clientName = receiver?.name || "Client Name";
  const projectName = details?.proposalName || "Project";
  // Prompt 42: Purchaser legal name for LOI (defaults to client name if not set)
  const purchaserLegalName = ((details as any)?.purchaserLegalName || "").trim() || clientName;

  // Address info for LOI legal paragraph
  const clientAddress = receiver?.address || (details as any)?.clientAddress || "";
  const clientCity = receiver?.city || (details as any)?.clientCity || "";
  const clientZip = receiver?.zipCode || (details as any)?.clientZip || "";
  const purchaserAddress = [clientAddress, clientCity, clientZip].filter(Boolean).join(", ");

  // Document total
  const documentTotal = tables.reduce((sum, t) => sum + t.grandTotal, 0);

  // Screen specifications from form (for Technical Specs section)
  const screens = (details as any)?.screens || [];
  const showSpecifications = (details as any)?.showSpecifications ?? true;

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
  const masterTableIndex: number | null = (details as any)?.masterTableIndex ?? null;
  const masterTable = masterTableIndex !== null ? tables[masterTableIndex] ?? null : null;
  // Detail tables = all tables except the master table
  const detailTables = masterTableIndex !== null
    ? tables.filter((_: any, idx: number) => idx !== masterTableIndex)
    : tables;

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Page container */}
      <div className="max-w-[816px] mx-auto">
        {/* Header */}
        <Header
          documentMode={documentMode}
          clientName={clientName}
          projectName={projectName}
        />

        {/* Intro text */}
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

        {/* Prompt 51: Master table renders FIRST when designated */}
        {masterTable && (
          <MasterTableSection
            table={masterTable}
            currency={currency}
            displayName={getTableDisplayName(masterTable)}
          />
        )}

        {/* FR-2.3 FIX: LOI shows Project Grand Total BEFORE pricing tables (fallback when no master table) */}
        {documentMode === "LOI" && tables.length > 0 && masterTableIndex === null && (
          <DocumentTotalSection total={documentTotal} currency={currency} isLOIPosition={true} />
        )}

        {/* Detail pricing tables (excludes master table if set) */}
        {detailTables.map((table, idx) => (
          <React.Fragment key={table.id}>
            <PricingTableSection
              table={table}
              currency={currency}
              displayName={getTableDisplayName(table)}
            />
            {table.alternates.length > 0 && (
              <AlternatesSection
                alternates={table.alternates}
                currency={currency}
              />
            )}
          </React.Fragment>
        ))}

        {/* Document total (if multiple tables) - Budget/Proposal show at bottom */}
        {documentMode !== "LOI" && detailTables.length > 1 && masterTableIndex === null && (
          <DocumentTotalSection total={documentTotal} currency={currency} />
        )}

        {/* Technical Specifications - reads from details.screens (form data) */}
        {showSpecifications && screens.length > 0 && (
          <TechnicalSpecsSection screens={screens} />
        )}

        {/* FR-4.2: Custom Notes - Budget/Proposal shows after pricing */}
        {documentMode !== "LOI" && customProposalNotes && (
          <CustomNotesSection notes={customProposalNotes} />
        )}

        {/* LOI-specific sections */}
        {documentMode === "LOI" && (
          <>
            <PaymentTermsSection paymentTerms={(details as any)?.paymentTerms} />
            {/* FR-4.2: Custom Notes - LOI shows in Additional Notes section */}
            {customProposalNotes && (
              <CustomNotesSection notes={customProposalNotes} isLOI={true} />
            )}
          </>
        )}

        {/* Statement of Work - MUST appear BEFORE signature */}
        <StatementOfWorkSection details={details} />

        {/* Footer - MUST appear BEFORE signature */}
        <Footer />

        {/* Signature Block - ABSOLUTE FINAL ELEMENT (Natalia requirement) */}
        {/* Must be last so signature applies to all content above */}
        {documentMode === "LOI" && (
          <SignatureSection clientName={clientName} />
        )}
      </div>
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
    <div className="px-12 pt-8 pb-6 border-b-2 border-[#0A52EF]">
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

  // Debug logging
  console.log('[NataliaMirrorTemplate IntroSection] displayTypeLabel:', displayTypeLabel);

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
    <div className="px-12 py-6">
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
}: {
  table: PricingTable;
  currency: "CAD" | "USD";
  displayName?: string;
}) {
  const currencyLabel = `PRICING (${currency})`;
  const headerName = displayName || table.name;

  return (
    <div className="px-12 py-4 break-inside-avoid">
      {/* Darker French Blue header to distinguish as summary */}
      <div className="flex justify-between items-center pb-2 mb-0" style={{ borderBottom: '3px solid #002C73' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#002C73' }}>
          {headerName}
        </h2>
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: '#002C73' }}>
          {currencyLabel}
        </span>
      </div>

      {/* Line items */}
      <div className="border-b border-gray-300">
        {table.items.map((item, idx) => (
          <div
            key={`master-item-${idx}`}
            className="flex justify-between py-2 border-b border-gray-100 text-[11px]"
          >
            <div className="flex-1 pr-4">
              <span className="text-gray-700">{item.description}</span>
            </div>
            <div className="text-right font-medium text-gray-800 w-28">
              {item.isIncluded ? (
                <span className="text-green-600">INCLUDED</span>
              ) : (
                formatPricingCurrency(item.sellingPrice, currency)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer rows */}
      <div style={{ borderTop: '3px solid #002C73' }} className="mt-0">
        {/* Subtotal */}
        <div className="flex justify-between py-2 text-[11px] font-bold">
          <span className="text-gray-800">SUBTOTAL:</span>
          <span className="text-gray-800 w-28 text-right">
            {formatPricingCurrency(table.subtotal, currency)}
          </span>
        </div>

        {/* Tax */}
        {table.tax && (
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-gray-600">{table.tax.label}</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(table.tax.amount, currency)}
            </span>
          </div>
        )}

        {/* Bond */}
        {(table.bond !== 0 || table.tax) && (
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-gray-600">BOND</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(table.bond, currency)}
            </span>
          </div>
        )}

        {/* Grand Total - prominent */}
        <div className="flex justify-between py-2 text-sm font-bold border-t border-gray-300">
          <span style={{ color: '#002C73' }}>GRAND TOTAL:</span>
          <span className="w-28 text-right" style={{ color: '#002C73', fontSize: '14px' }}>
            {formatPricingCurrency(table.grandTotal, currency)}
          </span>
        </div>
      </div>

      <p className="text-[9px] text-gray-400 mt-2">
        Detailed breakdown follows below. This total represents the complete project investment.
      </p>
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
}: {
  table: PricingTable;
  currency: "CAD" | "USD";
  displayName?: string; // FR-4.1: Optional override for table name
}) {
  const currencyLabel = `PRICING (${currency})`;
  const headerName = displayName || table.name;

  return (
    <div className="px-12 py-4 break-inside-avoid">
      {/* Table header */}
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-2 mb-0">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {headerName}
        </h2>
        <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {currencyLabel}
        </span>
      </div>

      {/* Line items */}
      <div className="border-b border-gray-300">
        {table.items.map((item, idx) => (
          <div
            key={`${table.id}-item-${idx}`}
            className="flex justify-between py-2 border-b border-gray-100 text-[11px]"
          >
            <div className="flex-1 pr-4">
              <span className="text-gray-700">{item.description}</span>
            </div>
            <div className="text-right font-medium text-gray-800 w-28">
              {item.isIncluded ? (
                <span className="text-green-600">INCLUDED</span>
              ) : (
                formatPricingCurrency(item.sellingPrice, currency)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer rows */}
      <div className="border-t-2 border-gray-800 mt-0">
        {/* Subtotal */}
        <div className="flex justify-between py-2 text-[11px] font-bold">
          <span className="text-gray-800">SUBTOTAL:</span>
          <span className="text-gray-800 w-28 text-right">
            {formatPricingCurrency(table.subtotal, currency)}
          </span>
        </div>

        {/* Tax */}
        {table.tax && (
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-gray-600">{table.tax.label}</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(table.tax.amount, currency)}
            </span>
          </div>
        )}

        {/* Bond (only show if non-zero or if tax exists) */}
        {(table.bond !== 0 || table.tax) && (
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-gray-600">BOND</span>
            <span className="text-gray-800 w-28 text-right">
              {formatPricingCurrency(table.bond, currency)}
            </span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between py-2 text-sm font-bold border-t border-gray-300">
          <span className="text-gray-800">GRAND TOTAL:</span>
          <span className="text-[#0A52EF] w-28 text-right">
            {formatPricingCurrency(table.grandTotal, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ALTERNATES SECTION
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
    <div className="px-12 py-2 break-inside-avoid">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-400 pb-1 mb-0 bg-gray-50 -mx-2 px-2">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          ALTERNATES - ADD TO COST ABOVE
        </h3>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {currencyLabel}
        </span>
      </div>

      {/* Alternate items */}
      {alternates.map((alt, idx) => (
        <div
          key={`alt-${idx}`}
          className="flex justify-between py-1.5 text-[10px] border-b border-gray-100"
        >
          <span className="text-gray-600 italic">{alt.description}</span>
          <span className="text-gray-800 w-28 text-right font-medium">
            {formatPricingCurrency(alt.priceDifference, currency)}
          </span>
        </div>
      ))}
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
    ? "px-12 py-6 mb-4 bg-[#0A52EF]/10 border-2 border-[#0A52EF] rounded-lg"
    : "px-12 py-6 mt-4 bg-[#0A52EF]/5 border-t-2 border-[#0A52EF]";

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
    <div className="px-12 py-6 break-inside-avoid">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-2 mb-4">
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
    <div className="px-12 py-6 break-inside-avoid">
      <p className="text-[10px] text-gray-500 mb-8">
        Please sign below to indicate Purchaser's agreement to purchase the
        Display System as described herein and to authorize ANC to commence
        production.
      </p>

      <div className="grid grid-cols-2 gap-12">
        {/* ANC Signature */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">
            AGREED TO AND ACCEPTED:
          </div>
          <div className="text-xs font-bold text-gray-800 mb-4">
            ANC Sports Enterprises, LLC
          </div>
          <div className="border-b border-gray-400 mb-1 h-8" />
          <div className="text-[10px] text-gray-500">SIGNATURE</div>
          <div className="border-b border-gray-400 mb-1 h-6 mt-4" />
          <div className="text-[10px] text-gray-500">NAME</div>
          <div className="border-b border-gray-400 mb-1 h-6 mt-4" />
          <div className="text-[10px] text-gray-500">DATE</div>
        </div>

        {/* Client Signature */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">&nbsp;</div>
          <div className="text-xs font-bold text-gray-800 mb-4">
            {clientName}
          </div>
          <div className="border-b border-gray-400 mb-1 h-8" />
          <div className="text-[10px] text-gray-500">SIGNATURE</div>
          <div className="border-b border-gray-400 mb-1 h-6 mt-4" />
          <div className="text-[10px] text-gray-500">NAME</div>
          <div className="border-b border-gray-400 mb-1 h-6 mt-4" />
          <div className="text-[10px] text-gray-500">DATE</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TECHNICAL SPECIFICATIONS (reads from details.screens for real-time updates)
// ============================================================================

function TechnicalSpecsSection({ screens }: { screens: any[] }) {
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
    <div className="px-12 py-6 break-before-page">
      <h2 className="text-sm font-bold text-[#0A52EF] uppercase tracking-wide border-b-2 border-[#0A52EF] pb-2 mb-4">
        SPECIFICATIONS
      </h2>

      <div className="border border-gray-300 break-inside-avoid">
        {/* Table Header - Fixed column widths to prevent overlapping */}
        <div className="grid grid-cols-12 text-[9px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 bg-gray-50">
          <div className="col-span-3 px-2 py-1.5">Display Name</div>
          <div className="col-span-3 px-2 py-1.5">Dimensions</div>
          <div className="col-span-1 px-2 py-1.5 text-right">Pitch</div>
          <div className="col-span-2 px-2 py-1.5 text-right">Resolution</div>
          <div className="col-span-2 px-2 py-1.5 text-right">Brightness</div>
          <div className="col-span-1 px-2 py-1.5 text-right">Qty</div>
        </div>

        {/* Table Body */}
        <div className="text-[9px] text-gray-900">
          {screens.map((screen: any, idx: number) => {
            const rawName = (screen?.externalName || screen?.name || "Display").toString().trim() || "Display";
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
// STATEMENT OF WORK
// ============================================================================

function StatementOfWorkSection({ details }: { details: any }) {
  const sow = details?.scopeOfWork;
  if (!sow) return null;

  return (
    <div className="px-12 py-6 break-before-page">
      <h2 className="text-lg font-bold text-[#0A52EF] uppercase tracking-wide border-b-2 border-[#0A52EF] pb-2 mb-6">
        STATEMENT OF WORK
      </h2>
      <div
        className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: sow }}
      />
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
    <div className="px-12 py-6 break-inside-avoid">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-2 mb-4">
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
    <div className="px-12 py-4 mt-8 border-t border-gray-200 text-center">
      <div className="text-[10px] text-gray-500">
        ANC SPORTS ENTERPRISES, LLC
      </div>
      <div className="text-[9px] text-gray-400">
        2 Manhattanville Road, Suite 402 · Purchase, NY 10577 · anc.com
      </div>
    </div>
  );
}
