/**
 * ProposalTemplate5 - "ANC Hybrid"
 * 
 * Unified master template for Budget, Proposal, and LOI.
 * Combines the best elements from all templates:
 * - Base: Modern template (clean, professional)
 * - Tables: Modern styling (blue headers, zebra striping)
 * - Footer: Bold template footer (dark blue slash/accent)
 * - Pricing/Spec text: Classic hierarchy (display name ALL CAPS/BOLD, specs smaller underneath)
 * - Layout: Tightened (9-10pt fonts, reduced margins, minimal row padding)
 * 
 * Notes, Scope of Work, and Signature Lines are optional for ALL document types.
 */

import React from "react";

// Components
import { ProposalLayout } from "@/app/components";
import LogoSelectorServer from "@/app/components/reusables/LogoSelectorServer";
import ExhibitA_TechnicalSpecs from "@/app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs";
import PageBreak from "@/app/components/templates/proposal-pdf/PageBreak";

// Helpers
import { formatNumberWithCommas, formatCurrency, sanitizeNitsForDisplay, stripDensityAndHDRFromSpecText, normalizePitch } from "@/lib/helpers";
import { resolveDocumentMode } from "@/lib/documentMode";
import {
    DOCUMENT_MODES,
    CURRENCY_FORMAT,
    EXHIBIT_G_CONSTANT_FIELDS,
    EXHIBIT_G_CALCULATED_FIELDS,
    calculateExhibitG,
    getProduct,
} from "@/services/rfp/productCatalog";
import type { DocumentMode as CatalogDocumentMode } from "@/services/rfp/productCatalog";

// Types
import { ProposalType } from "@/types";
import { RespMatrix, RespMatrixCategory, RespMatrixItem } from "@/types/pricing";

interface ProposalTemplate5Props extends ProposalType {
    forceWhiteLogo?: boolean;
    screens?: any[];
    isSharedView?: boolean;
}

const ProposalTemplate5 = (data: ProposalTemplate5Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens: screensProp, isSharedView = false } = data;
    const screens = screensProp || details?.screens || [];
    const internalAudit = details?.internalAudit as any;

    const documentMode = resolveDocumentMode(details);
    const catalogMode = documentMode.toLowerCase() as CatalogDocumentMode;
    const docModeConfig = DOCUMENT_MODES[catalogMode] || DOCUMENT_MODES.proposal;
    const docLabel = docModeConfig.headerText;
    const isLOI = documentMode === "LOI";

    // Guard against raw numbers (e.g., project IDs mistakenly used as names)
    const rawPurchaserName = receiver?.name || "";
    const purchaserName = rawPurchaserName && !/^\d+$/.test(rawPurchaserName.trim()) ? rawPurchaserName : "Client";
    // Prompt 42: Purchaser legal name for LOI (defaults to client name if not set)
    const purchaserLegalName = ((details as any)?.purchaserLegalName || "").trim() || purchaserName;
    const purchaserAddress = (() => {
        const parts = [receiver?.address, receiver?.city, receiver?.zipCode].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "";
    })();

    const specsSectionTitle = ((details as any)?.specsSectionTitle || "").trim() || "TECHNICAL SPECIFICATIONS";

    // Prompt 43: Currency detection from pricingDocument
    const pricingDocument = (details as any)?.pricingDocument;
    const mirrorMode =
        (details as any)?.mirrorMode === true || ((pricingDocument?.tables || []).length ?? 0) > 0;
    const currency: "CAD" | "USD" = pricingDocument?.currency || "USD";

    // Prompt 51: Master table index — designates which pricing table is the "Project Grand Total"
    // Auto-detect: if no explicit masterTableIndex, check if tables[0] is a summary/rollup table
    const rollUpRegex = /\b(total|roll.?up|summary|project\s+grand|grand\s+total|project\s+total|cost\s+summary|pricing\s+summary)\b/i;
    const pricingTables = pricingDocument?.tables || [];
    let masterTableIndex: number | null = (details as any)?.masterTableIndex ?? null;
    if (masterTableIndex === null && pricingTables.length > 1 && rollUpRegex.test(pricingTables[0]?.name || "")) {
        masterTableIndex = 0;
    }

    // Prompt 42: Description overrides for inline typo editing (Mirror Mode)
    const descriptionOverrides: Record<string, string> = (details as any)?.descriptionOverrides || {};
    const priceOverrides: Record<string, number> = (details as any)?.priceOverrides || {};

    // Hardcoded per business requirement: always WORK / PRICING.
    const colHeaderLeft = "WORK";
    const colHeaderRight = "PRICING";

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

    // Build mapping from screen group → custom display name (mirrors NataliaMirrorTemplate)
    // screen.group matches pricing table names (both come from Margin Analysis headers)
    // Priority: externalName (PDF/Client Name) > edited name (Screen Name differs from group)
    const screenNameMap: Record<string, string> = {};
    screens.forEach((screen: any) => {
        const group = screen?.group;
        if (!group) return;
        const explicitOverride = screen?.customDisplayName || screen?.externalName;
        if (explicitOverride) {
            screenNameMap[group] = explicitOverride;
        } else if (screen?.name && screen.name !== group) {
            // User edited Screen Name from the original Excel section name
            screenNameMap[group] = screen.name;
        }
    });

    // Hybrid color palette - Modern base with Bold accents
    const colors = {
        primary: "#0A52EF",
        primaryDark: "#002C73",
        primaryLight: "#E8F0FE",
        accent: "#6366F1",
        text: "#1F2937",
        textMuted: "#6B7280",
        textLight: "#9CA3AF",
        white: "#FFFFFF",
        surface: "#F9FAFB",
        border: "#E5E7EB",
        borderLight: "#F3F4F6",
    };

    // ===== UNIVERSAL TOGGLES - Available for ALL document types =====
    const showNotes = (details as any)?.showNotes ?? true;
    const showScopeOfWork = (details as any)?.showScopeOfWork ?? false;
    const showSignatureBlock = (details as any)?.showSignatureBlock ?? true;
    const showPaymentTerms = (details as any)?.showPaymentTerms ?? true;
    const showSpecifications = (details as any)?.showSpecifications ?? true;
    const showPricingTables = (details as any)?.showPricingTables ?? true;
    const showIntroText = (details as any)?.showIntroText ?? true;
    const showCompanyFooter = (details as any)?.showCompanyFooter ?? true;
    const generatedSchedule = (details as any)?.generatedSchedule;
    const generatedScheduleTasks = Array.isArray(generatedSchedule?.tasks) ? generatedSchedule.tasks : [];
    const hasGeneratedSchedule = !mirrorMode && generatedScheduleTasks.length > 0;
    const showExhibitA = (details as any)?.showExhibitA ?? false;
    const shouldRenderLegalIntro = docModeConfig.includeLegalIntro;
    const shouldRenderPaymentTerms = docModeConfig.includePaymentTerms && showPaymentTerms;
    const shouldRenderSignatureBlock = docModeConfig.includeSignatures && showSignatureBlock;
    const shouldRenderCompanyFooter = showCompanyFooter && isLOI;

    // Page layout: landscape modes render detail tables in a two-column grid
    const pageLayout: string = (details as any)?.pageLayout || "portrait-letter";
    const isLandscape = pageLayout.startsWith("landscape");

    // FR-4.3: Custom editable text fields
    const customIntroText = (details as any)?.additionalNotes || "";
    const customPaymentTerms = (details as any)?.paymentTerms || "";

    // ===== HELPERS =====
    /** Display name: prefer PDF/Client Name (externalName), normalize " -" to " - ", ALL CAPS per Natalia */
    const getScreenHeader = (screen: any) => {
        const raw = (screen?.externalName || screen?.customDisplayName || screen?.name || "Display").toString().trim();
        const cleaned = sanitizeNitsForDisplay(raw) || "Display";
        const normalized = cleaned.replace(/\s*-\s*/g, " - ").trim();
        return normalized ? normalized.toUpperCase() : "DISPLAY";
    };

    const splitDisplayNameAndSpecs = (value: string) => {
        const raw = (value || "").toString().trim();
        if (!raw) return { header: "", specs: "" };
        const idxParen = raw.indexOf("(");
        const idxColon = raw.indexOf(":");
        const idx = idxParen === -1 ? idxColon : idxColon === -1 ? idxParen : Math.min(idxParen, idxColon);
        if (idx === -1) return { header: raw, specs: "" };
        const header = raw.slice(0, idx).trim().replace(/[-–—]\s*$/, "").trim();
        const specs = raw.slice(idx).trim();
        return { header, specs };
    };

    /**
     * Format pixel pitch with proper decimal preservation.
     * Uses normalizePitch to guard against decimal-stripped values (125 → 1.25).
     */
    const formatPitchMm = (value: any): string => {
        const corrected = normalizePitch(value);
        if (corrected <= 0) return "";
        return corrected < 2 ? corrected.toFixed(2) : corrected.toFixed(corrected % 1 === 0 ? 0 : 2);
    };

    /**
     * Safely get corrected pitch for resolution math.
     * Prevents "17px" from a 125mm (should be 1.25mm) bug.
     */
    const safePitch = (screen: any): number => {
        return normalizePitch(screen?.pitchMm ?? screen?.pixelPitch) || 10;
    };

    const buildDescription = (screen: any) => {
        const heightFt = screen?.heightFt ?? screen?.height;
        const widthFt = screen?.widthFt ?? screen?.width;
        const pitchMm = screen?.pitchMm ?? screen?.pixelPitch;
        const brightness = screen?.brightnessNits ?? screen?.brightness;
        const parts: string[] = [];
        if (heightFt && widthFt && Number(heightFt) > 0 && Number(widthFt) > 0) {
            parts.push(`${Number(heightFt).toFixed(1)}' × ${Number(widthFt).toFixed(1)}'`);
        }
        const formattedPitch = formatPitchMm(pitchMm);
        if (formattedPitch) parts.push(`${formattedPitch}mm pitch`);
        if (brightness && Number(brightness) > 0) parts.push(`${formatNumberWithCommas(brightness)} Brightness`);
        // Note: QTY intentionally NOT added here - displayed in dedicated Quantity column
        return parts.join(" · ");
    };

    /**
     * Strip "(QTY N)" or "QTY N" patterns from description text
     * Quantity should be shown in dedicated column, not embedded in description
     */
    const stripQtyFromDescription = (text: string): string => {
        if (!text) return "";
        return text
            .replace(/\s*\(QTY\s*\d+\)/gi, "")  // (QTY 1), (QTY 2), etc.
            .replace(/\s*QTY\s*\d+\s*$/gi, "") // trailing "QTY 1"
            .replace(/\s+-\s*QTY\s*\d+/gi, "") // " - QTY 1"
            .trim();
    };

    // ===== COMPONENTS =====

    // Hybrid Section Header - Vertical blue bar (client-approved look)
    const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
        <div className="mb-6 mt-8 break-inside-avoid">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-5 shrink-0" style={{ background: colors.primary }} />
                <h2 className="text-base font-bold tracking-wide uppercase" style={{ color: colors.text }}>{title}</h2>
            </div>
            {subtitle && <p className="text-xs ml-4" style={{ color: colors.textMuted }}>{subtitle}</p>}
        </div>
    );

    // Hybrid Spec Table - Modern styling with blue headers, zebra striping
    const SpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-6 rounded-lg overflow-hidden border break-inside-avoid" style={{ borderColor: colors.border, background: colors.white, pageBreakInside: 'avoid', breakInside: 'avoid', pageBreakBefore: 'auto' }}>
            {/* Blue Header */}
            <div className="px-4 py-2.5 border-b break-inside-avoid" style={{ borderColor: colors.primary, background: colors.primary }}>
                <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                    {getScreenHeader(screen)}
                </h3>
            </div>
            {/* Two-column layout with zebra striping */}
            <div className="grid grid-cols-2 text-xs">
                {[
                    { label: "Pixel Pitch", value: `${formatPitchMm(screen.pitchMm ?? screen.pixelPitch)}mm` },
                    { label: "Quantity", value: screen.quantity || 1 },
                    { label: "Height", value: `${Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'` },
                    { label: "Width", value: `${Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'` },
                    { label: "Resolution (H)", value: `${screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / safePitch(screen)) || 0}px` },
                    { label: "Resolution (W)", value: `${screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / safePitch(screen)) || 0}px` },
                    ...(() => {
                        const raw = screen.brightnessNits ?? screen.brightness;
                        if (!raw) return [];
                        const num = Number(raw);
                        const isNum = !isNaN(num) && num > 0;
                        // Use formatted number if valid, otherwise use raw string
                        const value = isNum ? `${formatNumberWithCommas(num)} nits` : raw.toString();
                        return [{ label: "Brightness", value }];
                    })(),
                ]
                    .filter((item) => !/Pixel\s*Density|HDR\s*Status/i.test(item.label))
                    .map((item, idx) => (
                        <div
                            key={idx}
                            className={`px-4 py-2 flex justify-between break-inside-avoid ${idx % 2 === 0 ? '' : ''} ${idx < 6 ? 'border-b' : ''}`}
                            style={{
                                borderColor: colors.borderLight,
                                background: idx % 2 === 0 ? colors.white : colors.surface
                            }}
                        >
                            <span style={{ color: colors.textMuted, fontSize: '10px' }}>{item.label}</span>
                            <span className="font-semibold whitespace-nowrap" style={{ color: colors.text, fontSize: '10px' }}>{item.value}</span>
                        </div>
                    ))}
            </div>
            {!mirrorMode && (() => {
                const product = getProduct((screen?.productType || "").toString());
                const stored = screen?.calculatedExhibitG;
                const resolutionW = Number(stored?.resolutionW || screen?.pixelsW || Math.round((Number(screen?.widthFt ?? screen?.width ?? 0) * 304.8) / safePitch(screen)) || 0);
                const resolutionH = Number(stored?.resolutionH || screen?.pixelsH || Math.round((Number(screen?.heightFt ?? screen?.height ?? 0) * 304.8) / safePitch(screen)) || 0);
                const exhibitG = stored || (product && resolutionW > 0 && resolutionH > 0 ? calculateExhibitG(product, resolutionW, resolutionH) : null);
                if (!product && !exhibitG) return null;

                const constantValues: Record<string, string> = {
                    moduleMfg: product ? `${product.manufacturer} (${product.hardware})` : "—",
                    processorMfg: product?.processing || "—",
                    ledDiode: product?.diode || "—",
                    pixelPitch: product ? `${product.pitchMm} mm` : "—",
                    brightness: product?.brightnessNits ? `${formatNumberWithCommas(product.brightnessNits)} nits` : "—",
                    colorTemp: product?.colorTempK ? `${product.colorTempK.nominal}K (${product.colorTempK.min}–${product.colorTempK.max}K)` : "—",
                    pixelDensity: product?.pixelDensityPPF ? `${formatNumberWithCommas(product.pixelDensityPPF)} px/ft²` : "—",
                    lifespan: product?.lifespanHours ? `${formatNumberWithCommas(product.lifespanHours)} hrs` : "—",
                };
                const calculatedValues: Record<string, string> = exhibitG ? {
                    screenWidthFt: `${exhibitG.displayWidthFt} ft`,
                    screenHeightFt: `${exhibitG.displayHeightFt} ft`,
                    screenWidthPx: `${exhibitG.resolutionW}px`,
                    screenHeightPx: `${exhibitG.resolutionH}px`,
                    panelGrid: "—",
                    totalPanels: `${screen?.quantity || 1}`,
                    totalMaxPower: `${formatNumberWithCommas(exhibitG.maxPowerW)} W`,
                    totalAvgPower: `${formatNumberWithCommas(exhibitG.avgPowerW)} W`,
                    totalWeight: `${formatNumberWithCommas(exhibitG.totalWeightLbs)} lbs`,
                } : {};

                const labelMap: Record<string, string> = {
                    moduleMfg: "Module Mfg",
                    processorMfg: "Processor Mfg",
                    ledDiode: "LED Diode",
                    pixelPitch: "Pixel Pitch",
                    brightness: "Brightness",
                    colorTemp: "Color Temp",
                    pixelDensity: "Pixel Density",
                    lifespan: "Lifespan",
                    screenWidthFt: "Width (ft)",
                    screenHeightFt: "Height (ft)",
                    screenWidthPx: "Resolution W",
                    screenHeightPx: "Resolution H",
                    panelGrid: "Panel Grid",
                    totalPanels: "Total Panels",
                    totalMaxPower: "Max Power",
                    totalAvgPower: "Avg Power",
                    totalWeight: "Total Weight",
                };

                return (
                    <div className="border-t" style={{ borderColor: colors.borderLight }}>
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.primaryDark, background: colors.primaryLight }}>
                            Exhibit G Fields
                        </div>
                        <div className="grid grid-cols-2 text-[10px]">
                            {EXHIBIT_G_CONSTANT_FIELDS.map((field, idx) => (
                                <div key={`const-${field}`} className="px-4 py-1.5 flex justify-between border-b" style={{ borderColor: colors.borderLight, background: idx % 2 === 0 ? colors.white : colors.surface }}>
                                    <span style={{ color: colors.textMuted }}>{labelMap[field] || field}</span>
                                    <span className="font-semibold text-right ml-2" style={{ color: colors.text }}>{constantValues[field] || "—"}</span>
                                </div>
                            ))}
                            {EXHIBIT_G_CALCULATED_FIELDS.map((field, idx) => (
                                <div key={`calc-${field}`} className="px-4 py-1.5 flex justify-between border-b" style={{ borderColor: colors.borderLight, background: idx % 2 === 0 ? colors.white : colors.surface }}>
                                    <span style={{ color: colors.textMuted }}>{labelMap[field] || field}</span>
                                    <span className="font-semibold text-right ml-2" style={{ color: colors.text }}>{calculatedValues[field] || "—"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );

    // Calculate project total (shared between LOI summary and pricing section)
    const calculateProjectTotal = () => {
        const softCostItems = internalAudit?.softCostItems || [];
        const pricingDocument = (details as any)?.pricingDocument;
        const pricingTables = (pricingDocument?.tables || []) as Array<{ id?: string; name?: string; grandTotal?: number }>;
        const quoteItems = (((details as any)?.quoteItems || []) as any[]).filter(Boolean);

        // If pricingDocument.tables exists, sum all table grandTotals
        if (pricingTables.length > 0) {
            return pricingTables.reduce((sum, table) => sum + (Number(table?.grandTotal ?? 0) || 0), 0);
        }

        // Otherwise, fall back to quoteItems or screens + softCostItems
        const lineItems = quoteItems.length > 0
            ? quoteItems.map((it: any) => ({ price: Number(it.price || 0) || 0, isAlternate: it.isAlternate || false }))
            : [
                ...(screens || []).map((screen: any) => {
                    const auditRow = isSharedView
                        ? null
                        : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                    const price = auditRow?.breakdown?.sellPrice || auditRow?.breakdown?.finalClientTotal || 0;
                    return { price: Number(price) || 0, isAlternate: screen?.isAlternate || false };
                }).filter((it) => it.isAlternate || Math.abs(it.price) >= 0.01),
                ...softCostItems.map((item: any) => ({
                    price: Number(item?.sell || 0),
                    isAlternate: item?.isAlternate || false,
                })).filter((it: any) => it.isAlternate || Math.abs(it.price) >= 0.01),
            ];

        return lineItems.filter((it) => !it.isAlternate).reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    };

    // LOI Master Table Summary - Shows BEFORE detailed pricing tables per Natalia requirement
    const LOISummaryTable = () => {
        const total = calculateProjectTotal();

        return (
            <div className="px-6 mt-6 break-inside-avoid">
                <SectionHeader title="Project Summary" />
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                    <div
                        className="grid grid-cols-12 px-4 py-4 break-inside-avoid"
                        style={{ borderColor: colors.primary, background: colors.primaryLight }}
                    >
                        <div className="col-span-8 font-bold text-sm uppercase tracking-wide" style={{ color: colors.primaryDark }}>
                            Project Grand Total
                        </div>
                        <div className="col-span-4 text-right font-bold text-lg" style={{ color: colors.primaryDark }}>
                            {formatCurrency(total, Math.abs(total) < 0.01 ? "—" : undefined, currency)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Prompt 51: Master Table Summary — renders the designated "Project Grand Total" table at top
    const MasterTableSummary = () => {
        if (masterTableIndex === null) return null;
        const pricingTables = (pricingDocument?.tables || []) as any[];
        const masterTable = pricingTables[masterTableIndex];
        if (!masterTable) return null;

        const tableHeaderOverrides = ((details as any)?.tableHeaderOverrides || {}) as Record<string, string>;
        const tableName = (masterTable?.name ?? "").toString().trim();
        const tableId = masterTable?.id;
        const override = tableId ? tableHeaderOverrides[tableId] : undefined;
        // Priority: Override > Screen Name Map > Original Name
        const label = (override ?? screenNameMap[tableName] ?? (tableName || "Project Total")).toString().trim();

        // Gather items from the master table (parser outputs "items", not "rows")
        const rows = (masterTable?.items || masterTable?.rows || []) as any[];
        const subtotal = Number(masterTable?.subtotal ?? masterTable?.grandTotal ?? 0);
        const taxInfo = masterTable?.tax;
        const tax = typeof taxInfo === 'object' ? Number(taxInfo?.amount ?? 0) : Number(taxInfo ?? 0);
        const bond = Number(masterTable?.bond ?? 0);
        const grandTotal = Number(masterTable?.grandTotal ?? 0);

        return (
            <div className="px-6 mt-6 break-inside-avoid">
                <SectionHeader title="Project Pricing" />
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                    {/* Darker French Blue header to distinguish from detail tables */}
                    <div
                        className="grid grid-cols-12 px-4 py-2.5 text-xs font-bold uppercase tracking-wider break-inside-avoid"
                        style={{ background: colors.primaryDark, color: colors.white }}
                    >
                        <div className="col-span-8">{colHeaderLeft}</div>
                        <div className="col-span-4 text-right">{colHeaderRight}</div>
                    </div>

                    {/* Rows */}
                    {rows.map((row: any, idx: number) => {
                        const origDesc = (row?.description || row?.name || "Item").toString().trim();
                        const desc = (descriptionOverrides[`${tableId}:${idx}`] || origDesc);
                        const origPrice = Number(row?.sellingPrice ?? row?.price ?? row?.amount ?? 0);
                        const price = priceOverrides[`${tableId}:${idx}`] !== undefined ? priceOverrides[`${tableId}:${idx}`] : origPrice;
                        return (
                            <div
                                key={`master-row-${idx}`}
                                className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid items-center"
                                style={{
                                    borderColor: colors.borderLight,
                                    background: idx % 2 === 1 ? colors.surface : colors.white,
                                    minHeight: '36px',
                                }}
                            >
                                <div className="col-span-8 font-bold text-xs tracking-wide uppercase" style={{ color: colors.text }}>
                                    {desc.toUpperCase()}
                                </div>
                                <div className="col-span-4 text-right font-bold text-sm whitespace-nowrap" style={{ color: colors.primaryDark }}>
                                    {formatCurrency(price, Math.abs(price) < 0.01 ? "—" : undefined, currency)}
                                </div>
                            </div>
                        );
                    })}

                    {/* Subtotal */}
                    {rows.length > 0 && Math.abs(subtotal) >= 0.01 && subtotal !== grandTotal && (
                        <div className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid" style={{ borderColor: colors.border }}>
                            <div className="col-span-8 font-bold text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>Subtotal</div>
                            <div className="col-span-4 text-right font-bold text-sm" style={{ color: colors.text }}>
                                {formatCurrency(subtotal, currency)}
                            </div>
                        </div>
                    )}

                    {/* Tax */}
                    {Math.abs(tax) >= 0.01 && (
                        <div className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid" style={{ borderColor: colors.borderLight }}>
                            <div className="col-span-8 text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>Tax</div>
                            <div className="col-span-4 text-right text-sm" style={{ color: colors.text }}>
                                {formatCurrency(tax, currency)}
                            </div>
                        </div>
                    )}

                    {/* Bond */}
                    {Math.abs(bond) >= 0.01 && (
                        <div className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid" style={{ borderColor: colors.borderLight }}>
                            <div className="col-span-8 text-xs uppercase tracking-wide" style={{ color: colors.textMuted }}>Performance Bond</div>
                            <div className="col-span-4 text-right text-sm" style={{ color: colors.text }}>
                                {formatCurrency(bond, currency)}
                            </div>
                        </div>
                    )}

                    {/* Grand Total */}
                    <div
                        className="grid grid-cols-12 px-4 py-3 border-t-2 break-inside-avoid"
                        style={{ borderColor: colors.primary, background: colors.primaryLight }}
                    >
                        <div className="col-span-8 font-bold text-xs uppercase tracking-wide" style={{ color: colors.primaryDark }}>
                            {label.toUpperCase()}{currency === "CAD" ? " (CAD)" : ""}
                        </div>
                        <div className="col-span-4 text-right font-bold text-lg" style={{ color: colors.primaryDark }}>
                            {formatCurrency(grandTotal, Math.abs(grandTotal) < 0.01 ? "—" : undefined, currency)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Hybrid Pricing Section - Classic text hierarchy (UPPERCASE BOLD name, smaller specs)
    // When pricingDocument.tables exists (Mirror Mode), render FULL DETAIL per table.
    // Otherwise fall back to quoteItems or screens + internalAudit.
    const PricingSection = () => {
        const softCostItems = internalAudit?.softCostItems || [];
        const pricingDocument = (details as any)?.pricingDocument;
        const pricingTables = (pricingDocument?.tables || []) as any[];
        const tableHeaderOverrides = ((details as any)?.tableHeaderOverrides || {}) as Record<string, string>;

        // Mirror Mode: render each table with full item detail
        if (pricingTables.length > 0) {
            const detailTables = pricingTables
                .map((table: any, origIdx: number) => ({ table, origIdx }))
                .filter(({ origIdx }) => origIdx !== masterTableIndex);

            const hasPriceOvr = Object.keys(priceOverrides).length > 0;
            const documentTotal = hasPriceOvr
                ? pricingTables.reduce((sum: number, t: any) => {
                    const tItems = (t?.items || []) as any[];
                    const tSub = tItems.reduce((s: number, item: any, idx: number) => {
                        if (item?.isIncluded) return s;
                        const key = `${t?.id}:${idx}`;
                        return s + (priceOverrides[key] !== undefined ? priceOverrides[key] : Number(item?.sellingPrice ?? 0));
                    }, 0);
                    const tOrigSub = Number(t?.subtotal ?? 0);
                    const tOrigTax = typeof t?.tax === 'object' ? Number(t?.tax?.amount ?? 0) : Number(t?.tax ?? 0);
                    const tRate = tOrigSub > 0 ? tOrigTax / tOrigSub : 0;
                    return sum + tSub + (tSub * tRate) + Number(t?.bond ?? 0);
                }, 0)
                : (Number.isFinite(pricingDocument?.documentTotal)
                    ? pricingDocument.documentTotal
                    : pricingTables.reduce((sum: number, t: any) => sum + (Number(t?.grandTotal ?? 0) || 0), 0));

            // Render a single detail table card (reused in both portrait and landscape)
            const renderDetailTable = ({ table, origIdx }: { table: any; origIdx: number }) => {
                        const tableName = (table?.name ?? "").toString().trim();
                        const tableId = table?.id;
                        const override = tableId ? tableHeaderOverrides[tableId] : undefined;
                        const label = (override || screenNameMap[tableName] || (tableName || "Section")).toString().trim();
                        const items = (table?.items || []) as any[];
                        const alternates = (table?.alternates || []) as any[];
                        const originalSubtotal = Number(table?.subtotal ?? 0);
                        const taxInfo = table?.tax;
                        const originalTaxAmount = typeof taxInfo === 'object' ? Number(taxInfo?.amount ?? 0) : Number(taxInfo ?? 0);
                        const taxLabel = typeof taxInfo === 'object' ? (taxInfo?.label || "TAX") : "TAX";
                        const bond = Number(table?.bond ?? 0);
                        // Recompute totals when price overrides exist
                        const subtotal = items.reduce((sum: number, item: any, idx: number) => {
                            if (item?.isIncluded) return sum;
                            const key = `${tableId}:${idx}`;
                            const price = priceOverrides[key] !== undefined ? priceOverrides[key] : Number(item?.sellingPrice ?? 0);
                            return sum + price;
                        }, 0);
                        const taxRate = originalSubtotal > 0 ? originalTaxAmount / originalSubtotal : 0;
                        const taxAmount = subtotal * taxRate;
                        const grandTotal = subtotal + taxAmount + bond;

                        return (
                            <div key={tableId || `table-${origIdx}`} className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                                    {/* Table header */}
                                    <div
                                        className="grid grid-cols-12 px-4 py-2.5 text-xs font-bold uppercase tracking-wider break-inside-avoid"
                                        style={{ background: colors.primary, color: colors.white }}
                                    >
                                        <div className="col-span-8">{label.toUpperCase()}</div>
                                        <div className="col-span-4 text-right">PRICING{currency === "CAD" ? " (CAD)" : ""}</div>
                                    </div>

                                    {/* Line items (CURRENCY_FORMAT.hideZeroLineItems filters $0 rows) */}
                                    {items.map((item: any, idx: number) => {
                                        const itemPrice = priceOverrides[`${tableId}:${idx}`] !== undefined ? priceOverrides[`${tableId}:${idx}`] : Number(item?.sellingPrice ?? 0);
                                        if (CURRENCY_FORMAT.hideZeroLineItems && !item?.isIncluded && Math.abs(itemPrice) < 0.01) return null;
                                        return (
                                        <div
                                            key={`${tableId}-item-${idx}`}
                                            className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid items-center"
                                            style={{
                                                borderColor: colors.borderLight,
                                                background: idx % 2 === 1 ? colors.surface : colors.white,
                                                minHeight: '32px',
                                            }}
                                        >
                                            <div className="col-span-8 pr-2 text-xs" style={{ color: colors.text }}>
                                                {(descriptionOverrides[`${tableId}:${idx}`] || item?.description || "Item").toString()}
                                            </div>
                                            <div className="col-span-4 text-right font-semibold text-xs whitespace-nowrap" style={{ color: colors.primaryDark }}>
                                                {item?.isIncluded
                                                    ? <span style={{ color: colors.text }}>INCLUDED</span>
                                                    : formatCurrency(itemPrice, currency)}
                                            </div>
                                        </div>
                                        );
                                    })}

                                    {/* Footer: Subtotal / Tax / Bond / Grand Total */}
                                    <div className="border-t-2" style={{ borderColor: colors.border }}>
                                        {Math.abs(subtotal) >= 0.01 && subtotal !== grandTotal && (
                                            <div className="grid grid-cols-12 px-4 py-1.5 text-xs font-bold" style={{ color: colors.text }}>
                                                <div className="col-span-8">SUBTOTAL</div>
                                                <div className="col-span-4 text-right">{formatCurrency(subtotal, currency)}</div>
                                            </div>
                                        )}
                                        {Math.abs(taxAmount) >= 0.01 && (
                                            <div className="grid grid-cols-12 px-4 py-1 text-xs" style={{ color: colors.textMuted }}>
                                                <div className="col-span-8">{taxLabel}</div>
                                                <div className="col-span-4 text-right">{formatCurrency(taxAmount, currency)}</div>
                                            </div>
                                        )}
                                        {(Math.abs(bond) >= 0.01 || Math.abs(taxAmount) >= 0.01) && (
                                            <div className="grid grid-cols-12 px-4 py-1 text-xs" style={{ color: colors.textMuted }}>
                                                <div className="col-span-8">BOND</div>
                                                <div className="col-span-4 text-right">{formatCurrency(bond, currency)}</div>
                                            </div>
                                        )}
                                        <div
                                            className="grid grid-cols-12 px-4 py-2.5 border-t break-inside-avoid"
                                            style={{ borderColor: colors.primary, background: colors.primaryLight }}
                                        >
                                            <div className="col-span-8 font-bold text-xs uppercase tracking-wide" style={{ color: colors.primaryDark }}>GRAND TOTAL</div>
                                            <div className="col-span-4 text-right font-bold text-sm" style={{ color: colors.primaryDark }}>{formatCurrency(grandTotal, currency)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Alternates — separate table AFTER grand total (mirrors Excel structure) */}
                                {alternates.length > 0 && (
                                    <div className="mt-4 rounded-lg border overflow-hidden break-inside-avoid" style={{ borderColor: colors.border }}>
                                        <div
                                            className="grid grid-cols-12 px-4 py-2.5 text-xs font-bold uppercase tracking-wider break-inside-avoid"
                                            style={{ background: colors.primary, color: colors.white }}
                                        >
                                            <div className="col-span-8">ALTERNATES — ADD TO COST ABOVE</div>
                                            <div className="col-span-4 text-right">PRICING{currency === "CAD" ? " (CAD)" : ""}</div>
                                        </div>
                                        {alternates.map((alt: any, aidx: number) => (
                                            <div
                                                key={`alt-${aidx}`}
                                                className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid items-center"
                                                style={{
                                                    borderColor: colors.borderLight,
                                                    background: aidx % 2 === 1 ? colors.surface : colors.white,
                                                    minHeight: '32px',
                                                }}
                                            >
                                                <div className="col-span-8 pr-2 text-xs" style={{ color: colors.text }}>
                                                    {(alt?.description || "Alternate").toString()}
                                                </div>
                                                <div className="col-span-4 text-right font-semibold text-xs whitespace-nowrap" style={{ color: colors.primaryDark }}>
                                                    {formatCurrency(Number(alt?.priceDifference ?? 0), currency)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
            };

            return (
                <>
                    {/* Landscape: two-column grid for detail tables. Portrait: single column */}
                    {isLandscape ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {detailTables.map((entry) => (
                                <div key={entry.table?.id || `table-${entry.origIdx}`} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                    {renderDetailTable(entry)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        detailTables.map((entry) => renderDetailTable(entry))
                    )}

                    {/* Document total (when multiple detail tables and no master table) */}
                    {detailTables.length > 1 && masterTableIndex === null && (
                        <div className="mt-6 break-inside-avoid">
                            <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.primary }}>
                                <div className="grid grid-cols-12 px-4 py-3" style={{ background: colors.primaryLight }}>
                                    <div className="col-span-8 font-bold text-sm uppercase tracking-wide" style={{ color: colors.primaryDark }}>
                                        PROJECT GRAND TOTAL{currency === "CAD" ? " (CAD)" : ""}
                                    </div>
                                    <div className="col-span-4 text-right font-bold text-lg" style={{ color: colors.primaryDark }}>
                                        {formatCurrency(documentTotal, currency)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            );
        }

        // Intelligence Mode fallback: quoteItems or screens + internalAudit
        type LineItem = { key: string; name: string; description: string; price: number; isAlternate?: boolean };
        // Get quote items if available
        const quoteItems = (((details as any)?.quoteItems || []) as any[]).filter(Boolean);

        const lineItems: LineItem[] = quoteItems.length > 0
                ? quoteItems.map((it: any, idx: number) => {
                    const rawLocation = (it.locationName || "ITEM").toString();
                    const matchingScreen = screens.find((s: any) => {
                        if (s.id && it.id && s.id === it.id) return true;
                        const sName = (s.externalName || s.name || "").toString().trim().toUpperCase();
                        const itName = (it.locationName || "").toString().trim().toUpperCase();
                        if (sName === itName && sName.length > 0) return true;
                        if (sName.length > 3 && itName.includes(sName)) return true;
                        return false;
                    });
                    const customOverride = matchingScreen?.customDisplayName;
                    const effectiveLocation = customOverride || rawLocation;
                    const split = splitDisplayNameAndSpecs(effectiveLocation);
                    const header = (split.header || effectiveLocation).toString();

                    // Strip location name from description
                    let desc = (it.description || "").toString();
                    const stripLeadingLocation = (locationName: string, raw: string) => {
                        const loc = (locationName || "").toString().trim();
                        const text = (raw || "").toString().trim();
                        if (!loc || !text) return text;
                        const locUpper = loc.toUpperCase();
                        const textUpper = text.toUpperCase();
                        if (textUpper === locUpper) return "";
                        const dashPrefix = `${locUpper} - `;
                        if (textUpper.startsWith(dashPrefix)) return text.slice(dashPrefix.length).trim();
                        if (textUpper.startsWith(locUpper)) return text.slice(loc.length).replace(/^(\s*[-–—:]\s*)/, "").trim();
                        return text;
                    };
                    desc = stripLeadingLocation(rawLocation, desc);
                    desc = stripLeadingLocation(effectiveLocation, desc);
                    let combined = [split.specs, desc].filter(Boolean).join(" ").trim();
                    combined = stripQtyFromDescription(stripDensityAndHDRFromSpecText(sanitizeNitsForDisplay(combined)));

                    const normalizedHeader = header.replace(/\s*-\s*/g, " - ").trim();
                    return {
                        key: it.id || `quote-${idx}`,
                        name: stripQtyFromDescription(sanitizeNitsForDisplay(normalizedHeader)).toUpperCase(),
                        description: combined,
                        price: Number(it.price || 0) || 0,
                        isAlternate: it.isAlternate || false,
                    };
                }).filter((it: any) => it.isAlternate || Math.abs(it.price) >= 0.01)
                : [
                    ...(screens || []).map((screen: any, idx: number) => {
                        const auditRow = isSharedView
                            ? null
                            : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                        const price = auditRow?.breakdown?.sellPrice || auditRow?.breakdown?.finalClientTotal || 0;
                        const label = (screen?.externalName || screen?.customDisplayName || screen?.name || "Display").toString().trim();
                        const split = splitDisplayNameAndSpecs(label);
                        const rawDesc = split.specs || buildDescription(screen);
                        const cleanDesc = stripQtyFromDescription(stripDensityAndHDRFromSpecText(sanitizeNitsForDisplay(rawDesc)));
                        return {
                            key: `screen-${screen?.id || screen?.name || idx}`,
                            name: stripQtyFromDescription((split.header ? sanitizeNitsForDisplay(split.header) : getScreenHeader(screen))).toUpperCase(),
                            description: cleanDesc,
                            price: Number(price) || 0,
                            isAlternate: screen?.isAlternate || false,
                        };
                    }).filter((it: any) => it.isAlternate || Math.abs(it.price) >= 0.01),
                    ...softCostItems.map((item: any, idx: number) => ({
                        key: `soft-${idx}`,
                        name: stripQtyFromDescription(sanitizeNitsForDisplay((item?.name || "Item").toString())).toUpperCase(),
                        description: stripQtyFromDescription(stripDensityAndHDRFromSpecText(sanitizeNitsForDisplay((item?.description || "").toString()))),
                        price: Number(item?.sell || 0),
                        isAlternate: item?.isAlternate || false,
                    })).filter((it: any) => it.isAlternate || Math.abs(it.price) >= 0.01),
                ];

        const primaryItems = lineItems.filter((it) => !it.isAlternate);
        const alternateItems = lineItems.filter((it) => it.isAlternate);
        const subtotal = primaryItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

        return (
            <div className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {/* Modern table container */}
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                    {/* Header */}
                    <div
                        className="grid grid-cols-12 px-4 py-2.5 text-xs font-bold uppercase tracking-wider break-inside-avoid"
                        style={{ background: colors.primary, color: colors.white }}
                    >
                        <div className="col-span-8">{colHeaderLeft}</div>
                        <div className="col-span-4 text-right">{colHeaderRight}</div>
                    </div>

                    {/* Primary Items - Classic hierarchy: UPPERCASE BOLD name, smaller specs (tight rows) */}
                    {primaryItems.map((item, idx) => (
                        <div
                            key={item.key}
                            className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid items-center"
                            style={{
                                borderColor: colors.borderLight,
                                background: idx % 2 === 1 ? colors.surface : colors.white,
                                minHeight: '36px',
                                pageBreakInside: 'avoid',
                                breakInside: 'avoid',
                            }}
                        >
                            <div className="col-span-8 pr-2">
                                {/* Line 1: UPPERCASE BOLD - allow wrapping */}
                                <div className="font-bold text-xs tracking-wide uppercase" style={{ color: colors.text }}>
                                    {item.name}
                                </div>
                                {/* Line 2: Specs - allow wrapping, compact */}
                                {item.description && (
                                    <div className="text-xs leading-none mt-0.5" style={{ color: colors.textMuted, fontSize: '9px' }}>
                                        {item.description}
                                    </div>
                                )}
                            </div>
                            <div className="col-span-4 text-right font-bold text-sm whitespace-nowrap" style={{ color: colors.primaryDark }}>
                                {formatCurrency(item.price, Math.abs(Number(item.price)) < 0.01 ? "—" : undefined, currency)}
                            </div>
                        </div>
                    ))}

                    {/* PROJECT TOTAL = sum of primary items only (alternates excluded) */}
                    <div
                        className="grid grid-cols-12 px-4 py-3 border-t-2 break-inside-avoid"
                        style={{ borderColor: colors.border, background: colors.white }}
                    >
                        <div className="col-span-8 font-bold text-xs uppercase tracking-wide" style={{ color: colors.text }}>
                            Project Total{currency === "CAD" ? " (CAD)" : ""}
                        </div>
                        <div className="col-span-4 text-right font-bold text-sm" style={{ color: colors.text }}>
                            {formatCurrency(subtotal, Math.abs(subtotal) < 0.01 ? "—" : undefined, currency)}
                        </div>
                    </div>

                    {/* Alternate Items — shown below total, visually distinct */}
                    {alternateItems.length > 0 && (
                        <>
                            <div
                                className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid"
                                style={{ borderColor: colors.border, background: colors.surface }}
                            >
                                <div className="col-span-12 text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>
                                    Alternates (not included in total)
                                </div>
                            </div>
                            {alternateItems.map((item, idx) => (
                                <div
                                    key={item.key}
                                    className="grid grid-cols-12 px-4 py-2 border-t break-inside-avoid items-center"
                                    style={{
                                        borderColor: colors.borderLight,
                                        background: colors.surface,
                                        minHeight: '36px',
                                        pageBreakInside: 'avoid',
                                        breakInside: 'avoid',
                                        opacity: 0.75,
                                    }}
                                >
                                    <div className="col-span-8 pr-2">
                                        <div className="text-xs tracking-wide uppercase italic" style={{ color: colors.textMuted }}>
                                            {item.name}
                                        </div>
                                        {item.description && (
                                            <div className="text-xs leading-none mt-0.5 italic" style={{ color: colors.textMuted, fontSize: '9px' }}>
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-4 text-right text-sm whitespace-nowrap italic" style={{ color: colors.textMuted }}>
                                        {formatCurrency(item.price, Math.abs(Number(item.price)) < 0.01 ? "—" : undefined, currency)}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Payment Terms Section
    const PaymentTermsSection = () => {
        // FR-4.3: Use custom payment terms if provided, otherwise use default
        const defaultTerms = "50% on Deposit\n40% on Mobilization\n10% on Substantial Completion";
        const raw = (customPaymentTerms?.trim() || defaultTerms).toString();
        const lines = raw.split(/\r?\n|,/g).map((l: string) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        return (
            <div className="mt-8 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <SectionHeader title="Payment Terms" />
                <div className="rounded-lg p-4 text-sm leading-relaxed break-inside-avoid" style={{ background: colors.surface, color: colors.textMuted }}>
                    {lines.map((line: string, idx: number) => <div key={idx} className="py-0.5 break-inside-avoid">{line}</div>)}
                </div>
            </div>
        );
    };

    // Notes Section - Universal (available for all document types)
    const NotesSection = () => {
        const raw = (details?.additionalNotes || "").toString().trim();
        if (!raw) return null;
        return (
            <div className="mt-8 break-inside-avoid">
                <SectionHeader title="Notes" />
                <div className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap break-inside-avoid" style={{ background: colors.surface, color: colors.text }}>
                    {raw}
                </div>
            </div>
        );
    };

    // Scope of Work Section - Universal (available for all document types)
    const ScopeOfWorkSection = () => {
        const sowText = (details as any)?.scopeOfWorkText;
        return (
            <div className="mt-8 break-inside-avoid">
                <SectionHeader title="Scope of Work" />
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-inside-avoid" style={{ color: colors.text }}>
                    {sowText || "No scope of work specified."}
                </div>
            </div>
        );
    };

    // Default LOI signature legal text (per-project override via details.signatureBlockText)
    const DEFAULT_SIGNATURE_BLOCK_TEXT =
        "Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein and to authorize ANC to commence production. If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language, including terms of liability, indemnification, and warranty. Payment is due within thirty (30) days of ANC's invoice(s).";

    // Signature Block - Universal (available for all document types)
    const SignatureBlock = () => (
        <div className="mt-12 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="text-xs leading-relaxed text-justify mb-8 break-inside-avoid" style={{ color: colors.textMuted }}>
                {((details as any)?.signatureBlockText || "").trim() || DEFAULT_SIGNATURE_BLOCK_TEXT}
            </div>
            <h4 className="font-bold text-xs uppercase mb-6 border-b-2 pb-1 break-inside-avoid" style={{ borderColor: colors.text, color: colors.text }}>
                Agreed To And Accepted:
            </h4>
            <div className="grid grid-cols-2 gap-8 break-inside-avoid">
                {[
                    { title: "ANC Sports Enterprises, LLC", subtitle: "Seller" },
                    { title: receiver?.name || "Purchaser", subtitle: "Purchaser" }
                ].map((party, idx) => (
                    <div key={idx} className="space-y-4 break-inside-avoid">
                        <div className="break-inside-avoid">
                            <div className="font-bold text-xs" style={{ color: colors.primary }}>{party.title}</div>
                            <div className="text-xs" style={{ color: colors.textMuted }}>{party.subtitle}</div>
                        </div>
                        <div className="break-inside-avoid">
                            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.textMuted }}>Signature</div>
                            <div className="h-8 border-b-2" style={{ borderColor: colors.border }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 break-inside-avoid">
                            <div className="break-inside-avoid">
                                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.textMuted }}>Name</div>
                                <div className="h-6 border-b" style={{ borderColor: colors.border }} />
                            </div>
                            <div className="break-inside-avoid">
                                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.textMuted }}>Date</div>
                                <div className="h-6 border-b" style={{ borderColor: colors.border }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // Continuation page header — slim blue bar with client + project name
    const ContinuationPageHeader = () => {
        const label = details?.proposalName
            ? `${purchaserName} — ${details.proposalName}`.toUpperCase()
            : purchaserName.toUpperCase();
        return (
            <div
                className="text-center py-2 text-[9px] font-bold uppercase tracking-widest break-inside-avoid"
                style={{ background: colors.primary, color: colors.white }}
            >
                {label}
            </div>
        );
    };

    // Resp Matrix Statement of Work (parsed from Excel "Resp Matrix" sheet)
    const respMatrix: RespMatrix | null = pricingDocument?.respMatrix ?? null;

    const RespMatrixSOW = () => {
        if (!respMatrix || !respMatrix.categories || respMatrix.categories.length === 0) return null;

        const isIncludeStatement = (anc: string) => {
            const upper = anc.toUpperCase().trim();
            return upper === "INCLUDE STATEMENT" || upper === "INCLUDED STATEMENT";
        };
        const isXMark = (val: string) => val.trim().toUpperCase().startsWith("X");

        const categorizeSection = (cat: RespMatrixCategory): "table" | "paragraph" => {
            const xItems = cat.items.filter(i => isXMark(i.anc) || isXMark(i.purchaser));
            const includeItems = cat.items.filter(i => isIncludeStatement(i.anc));
            return xItems.length >= includeItems.length ? "table" : "paragraph";
        };

        return (
            <div className="px-6 break-before-page">
                <div className="text-center mb-6">
                    <div className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.text }}>
                        {receiver?.name || "Client"}
                    </div>
                    <h2 className="text-lg font-bold uppercase tracking-wide pb-2 mt-1 border-b-2" style={{ color: colors.primary, borderColor: colors.primary }}>
                        STATEMENT OF WORK
                    </h2>
                </div>
                <div className="border rounded overflow-hidden" style={{ borderColor: colors.border }}>
                    {respMatrix.categories.map((cat, catIdx) => {
                        const sectionType = respMatrix.format === "short"
                            ? "paragraph"
                            : respMatrix.format === "long"
                            ? "table"
                            : categorizeSection(cat);

                        return (
                            <div key={catIdx} className="break-inside-avoid">
                                {/* Category header bar */}
                                <div
                                    className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold uppercase tracking-wider break-inside-avoid"
                                    style={{ background: '#6b7280', color: '#ffffff' }}
                                >
                                    <div className={sectionType === "table" ? "col-span-8" : "col-span-12"}>{cat.name}</div>
                                    {sectionType === "table" && (
                                        <>
                                            <div className="col-span-2 text-center">ANC</div>
                                            <div className="col-span-2 text-center">PURCHASER</div>
                                        </>
                                    )}
                                </div>
                                {/* Items */}
                                {sectionType === "table" ? (
                                    cat.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-12 px-4 py-2 text-[10px] break-inside-avoid border-b items-start"
                                            style={{ borderColor: colors.borderLight, background: idx % 2 === 1 ? colors.surface : colors.white }}
                                        >
                                            <div className="col-span-8 leading-relaxed pr-2" style={{ color: colors.text }}>{item.description}</div>
                                            <div className="col-span-2 text-center font-medium" style={{ color: colors.text }}>
                                                {item.anc && !isIncludeStatement(item.anc) && item.anc.toUpperCase() !== "NA" ? item.anc : ""}
                                            </div>
                                            <div className="col-span-2 text-center font-medium" style={{ color: colors.text }}>
                                                {item.purchaser && item.purchaser.toUpperCase() !== "EDITABLE" ? item.purchaser : ""}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    cat.items.filter(item => isIncludeStatement(item.anc)).map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="px-4 py-2.5 text-[10px] leading-relaxed break-inside-avoid border-b"
                                            style={{ borderColor: colors.borderLight, color: colors.text, background: idx % 2 === 1 ? colors.surface : colors.white }}
                                        >
                                            {item.description}
                                        </div>
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const ProjectScheduleSection = () => {
        if (!hasGeneratedSchedule) return null;

        const ntpLabel = (details as any)?.ntpDate;
        const completionLabel = generatedSchedule?.completionDate;
        const totalDuration = Number(generatedSchedule?.totalDurationDays || 0);
        const phaseOrder = ["design", "manufacturing", "shipping", "install"];
        const grouped = phaseOrder.map((phase) => ({
            phase,
            tasks: generatedScheduleTasks.filter((task: any) => (task?.phase || "").toString().toLowerCase() === phase),
        })).filter((group) => group.tasks.length > 0);
        let taskNumber = 0;

        return (
            <div className="mt-8 break-inside-avoid">
                <SectionHeader title="Project Schedule" subtitle="Generated from NTP date and screen configuration" />
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                    <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: colors.primaryLight, color: colors.primaryDark }}>
                        <div className="col-span-4">NTP: {ntpLabel || "—"}</div>
                        <div className="col-span-4 text-center">Completion: {completionLabel || "—"}</div>
                        <div className="col-span-4 text-right">Duration: {totalDuration > 0 ? `${totalDuration} business days` : "—"}</div>
                    </div>

                    <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-t" style={{ borderColor: colors.borderLight, background: colors.primary, color: colors.white }}>
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">Task</div>
                        <div className="col-span-2">Location</div>
                        <div className="col-span-2">Start</div>
                        <div className="col-span-2">End</div>
                        <div className="col-span-1 text-right">Days</div>
                    </div>

                    {grouped.map((group) => (
                        <React.Fragment key={`phase-${group.phase}`}>
                            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-t" style={{ borderColor: colors.borderLight, background: colors.surface, color: colors.primaryDark }}>
                                {group.phase}
                            </div>
                            {group.tasks.map((task: any, idx: number) => {
                                taskNumber += 1;
                                return (
                                    <div
                                        key={`${group.phase}-${idx}-${task?.taskName || "task"}`}
                                        className="grid grid-cols-12 px-4 py-2 text-[10px] border-t items-center"
                                        style={{ borderColor: colors.borderLight, background: idx % 2 === 1 ? colors.surface : colors.white }}
                                    >
                                        <div className="col-span-1" style={{ color: colors.textMuted }}>{taskNumber}</div>
                                        <div className="col-span-4 font-semibold" style={{ color: colors.text }}>
                                            {task?.isParallel ? "↳ " : ""}{task?.taskName || "Task"}
                                        </div>
                                        <div className="col-span-2" style={{ color: colors.textMuted }}>{task?.locationName || "Global"}</div>
                                        <div className="col-span-2" style={{ color: colors.text }}>{task?.startDate || "—"}</div>
                                        <div className="col-span-2" style={{ color: colors.text }}>{task?.endDate || "—"}</div>
                                        <div className="col-span-1 text-right" style={{ color: colors.text }}>{task?.durationDays ?? "—"}</div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    // Bold-style Footer with dark blue slash
    const HybridFooter = () => (
        <div className="mt-16 pt-6 border-t break-inside-avoid" style={{ borderColor: colors.border }}>
            <div className="flex justify-between items-end break-inside-avoid">
                <div className="break-inside-avoid">
                    <div className="font-bold text-xs tracking-wide uppercase" style={{ color: colors.text }}>ANC Sports Enterprises, LLC</div>
                    <div className="text-xs mt-1" style={{ color: colors.textMuted }}>2 Manhattanville Road, Suite 402 · Purchase, NY 10577 · anc.com</div>
                </div>
                {/* Dark blue slash accent from Bold template */}
                <div className="flex items-center gap-1 break-inside-avoid">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-4 h-1 rounded-full opacity-30 break-inside-avoid"
                            style={{ background: colors.primaryDark, transform: `skewX(-20deg)` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <ProposalLayout data={data} disableFixedFooter>
            {/* Hybrid Header - Clean Modern style with left-aligned logo (no badge box) */}
            <div className="flex justify-between items-start px-6 pt-6 pb-4 mb-6 border-b break-inside-avoid" style={{ borderColor: colors.border, background: 'transparent' }}>
                <LogoSelectorServer theme="light" width={140} height={70} className="p-0" />
                <div className="text-right break-inside-avoid" style={{ background: 'transparent' }}>
                    <div className="text-xs uppercase tracking-widest font-bold" style={{ color: colors.primary, background: 'transparent' }}>{docLabel}</div>
                    <h1 className="text-xl font-bold mt-1" style={{ color: colors.text, background: 'transparent' }}>{details?.proposalName || receiver?.name || "Client Name"}</h1>
                </div>
            </div>

            {/* Intro - 10pt font */}
            {showIntroText && (
                <div className="px-6 mb-6 break-inside-avoid">
                    <div className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                        {(shouldRenderLegalIntro && (details as any)?.loiHeaderText?.trim()) ? (
                            <p className="text-justify whitespace-pre-wrap">{(details as any).loiHeaderText.trim()}</p>
                        ) : customIntroText?.trim() ? (
                            <p className="text-justify whitespace-pre-wrap">{customIntroText.trim()}</p>
                        ) : shouldRenderLegalIntro ? (
                            <p className="text-justify">
                                This Sales Quotation will set forth the terms by which <strong style={{ color: colors.text }}>{purchaserLegalName}</strong> ("Purchaser"){purchaserAddress ? ` located at ${purchaserAddress}` : ""} and <strong style={{ color: colors.text }}>ANC Sports Enterprises, LLC</strong> ("ANC") located at 2 Manhattanville Road, Suite 402, Purchase, NY 10577 (collectively, the "Parties") agree that ANC will provide following LED Display and services (the "Display System") described below for the <strong style={{ color: colors.text }}>{details?.proposalName || (details as any)?.clientName || receiver?.name || "project"}</strong>.
                            </p>
                        ) : documentMode === "PROPOSAL" ? (
                            <p>
                                ANC is pleased to present the following {displayTypeLabel} proposal for <strong style={{ color: colors.text }}>{purchaserName}</strong> per the specifications and pricing below.
                            </p>
                        ) : (
                            <p>
                                ANC is pleased to present the following {displayTypeLabel} budget to <strong style={{ color: colors.text }}>{purchaserName}</strong> per the specifications below.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Prompt 58: Custom Proposal Notes (Fix 3) */}
            {((details as any)?.customProposalNotes) && (
                <div className="px-6 mb-6 break-inside-avoid">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: colors.textMuted }}>
                        {(details as any).customProposalNotes}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                LOI MODE — Natalia's required page structure (Prompt 41)
                Structure A (master table): Intro → Summary → Payment/Sig → Breakdown → Specs
                Structure B (no master):    Intro → Breakdown → Payment/Sig → Specs
               ════════════════════════════════════════════════════════════ */}
            {isLOI ? (
                masterTableIndex !== null ? (
                    /* ── Structure A: Master table selected ── */
                    <>
                        {/* Page 1: Master Table (project summary) */}
                        {showPricingTables && <MasterTableSummary />}

                        {/* Page 2: Payment Terms + Notes + Signature Block */}
                        <PageBreak />
                        <ContinuationPageHeader />
                        {shouldRenderPaymentTerms && (
                            <div className="px-6 break-inside-avoid">
                                <PaymentTermsSection />
                            </div>
                        )}
                        {showNotes && (
                            <div className="px-6 break-inside-avoid">
                                <NotesSection />
                            </div>
                        )}
                        {shouldRenderSignatureBlock && (
                            <div className="px-6 break-inside-avoid">
                                <SignatureBlock />
                            </div>
                        )}

                        {/* Page 3+: Detailed Breakdown (all section pricing tables) */}
                        {showPricingTables && <PageBreak />}
                        {showPricingTables && <ContinuationPageHeader />}
                        {showPricingTables && (
                            <div className="px-6 break-inside-avoid">
                                <div className="break-inside-avoid">
                                    <PricingSection />
                                </div>
                            </div>
                        )}

                        {/* Last pages: Technical Specifications */}
                        {showSpecifications && screens.length > 0 && (
                            <>
                                <PageBreak />
                                <ContinuationPageHeader />
                                <div className="px-6 break-inside-avoid">
                                    <SectionHeader title={specsSectionTitle} subtitle="Technical details for each display" />
                                    <div className="break-inside-avoid">
                                        {screens.map((screen: any, idx: number) => (
                                            <SpecTable key={idx} screen={screen} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {hasGeneratedSchedule && (
                            <>
                                <PageBreak />
                                <ContinuationPageHeader />
                                <div className="px-6 break-inside-avoid">
                                    <ProjectScheduleSection />
                                </div>
                            </>
                        )}

                        {showExhibitA && <PageBreak />}
                        {showExhibitA && <ContinuationPageHeader />}
                        {showExhibitA && (
                            <div className="px-6 break-inside-avoid">
                                <ExhibitA_TechnicalSpecs data={data} showSOW={showScopeOfWork} />
                            </div>
                        )}

                        {showScopeOfWork && (details as any)?.scopeOfWorkText?.trim() && (
                            <div className="px-6 break-inside-avoid">
                                <ScopeOfWorkSection />
                            </div>
                        )}

                        {/* Resp Matrix SOW (if present in Excel) */}
                        <RespMatrixSOW />

                        {shouldRenderCompanyFooter && (
                            <div className="px-6">
                                <HybridFooter />
                            </div>
                        )}
                    </>
                ) : (
                    /* ── Structure B: No master table — detail tables first ── */
                    <>
                        {/* LOI fallback summary (document total) */}
                        {showPricingTables && <LOISummaryTable />}

                        {/* Pricing tables immediately after intro */}
                        {showPricingTables && (
                            <div className="px-6 break-inside-avoid">
                                <div className="break-inside-avoid">
                                    <PricingSection />
                                </div>
                            </div>
                        )}

                        {/* Then: Payment Terms + Notes + Signature Block */}
                        {shouldRenderPaymentTerms && (
                            <div className="px-6 break-inside-avoid">
                                <PaymentTermsSection />
                            </div>
                        )}
                        {showNotes && (
                            <div className="px-6 break-inside-avoid">
                                <NotesSection />
                            </div>
                        )}
                        {shouldRenderSignatureBlock && (
                            <div className="px-6 break-inside-avoid">
                                <SignatureBlock />
                            </div>
                        )}

                        {/* Last pages: Technical Specifications */}
                        {showSpecifications && screens.length > 0 && (
                            <>
                                <PageBreak />
                                <ContinuationPageHeader />
                                <div className="px-6 break-inside-avoid">
                                    <SectionHeader title={specsSectionTitle} subtitle="Technical details for each display" />
                                    <div className="break-inside-avoid">
                                        {screens.map((screen: any, idx: number) => (
                                            <SpecTable key={idx} screen={screen} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {hasGeneratedSchedule && (
                            <>
                                <PageBreak />
                                <ContinuationPageHeader />
                                <div className="px-6 break-inside-avoid">
                                    <ProjectScheduleSection />
                                </div>
                            </>
                        )}

                        {showExhibitA && <PageBreak />}
                        {showExhibitA && <ContinuationPageHeader />}
                        {showExhibitA && (
                            <div className="px-6 break-inside-avoid">
                                <ExhibitA_TechnicalSpecs data={data} showSOW={showScopeOfWork} />
                            </div>
                        )}

                        {showScopeOfWork && (details as any)?.scopeOfWorkText?.trim() && (
                            <div className="px-6 break-inside-avoid">
                                <ScopeOfWorkSection />
                            </div>
                        )}

                        {/* Resp Matrix SOW (if present in Excel) */}
                        <RespMatrixSOW />

                        {shouldRenderCompanyFooter && (
                            <div className="px-6">
                                <HybridFooter />
                            </div>
                        )}
                    </>
                )
            ) : (
                /* Budget / Proposal order: Header → Intro → Master Table → Page Break → Pricing → Notes → Specs → Exhibit A */
                <>
                    {/* Master table (project summary) on page 1 */}
                    {showPricingTables && masterTableIndex !== null && <MasterTableSummary />}

                    {/* Page break: detail section breakdowns start on a new page */}
                    {showPricingTables && masterTableIndex !== null && <PageBreak />}
                    {showPricingTables && masterTableIndex !== null && <ContinuationPageHeader />}

                    {/* Pricing tables */}
                    {showPricingTables && (
                        <div className="px-6 break-inside-avoid">
                            <div className="break-inside-avoid">
                                <PricingSection />
                            </div>
                        </div>
                    )}

                    {showNotes && (
                        <div className="px-6 break-inside-avoid">
                            <NotesSection />
                        </div>
                    )}
                    {showScopeOfWork && (
                        <div className="px-6 break-inside-avoid">
                            <ScopeOfWorkSection />
                        </div>
                    )}
                    {showSpecifications && screens.length > 0 && (
                        <>
                            <PageBreak />
                            <ContinuationPageHeader />
                            <div className="px-6 break-inside-avoid">
                                <SectionHeader title={specsSectionTitle} subtitle="Technical details for each display" />
                                <div className="break-inside-avoid">
                                    {screens.map((screen: any, idx: number) => (
                                        <SpecTable key={idx} screen={screen} />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    {hasGeneratedSchedule && (
                        <>
                            <PageBreak />
                            <ContinuationPageHeader />
                            <div className="px-6 break-inside-avoid">
                                <ProjectScheduleSection />
                            </div>
                        </>
                    )}
                    {shouldRenderCompanyFooter && (
                        <div className="px-6">
                            <HybridFooter />
                        </div>
                    )}
                    {showExhibitA && (
                        <>
                            <PageBreak />
                            <ContinuationPageHeader />
                            <div className="px-6 break-inside-avoid">
                                <ExhibitA_TechnicalSpecs data={data} showSOW={showScopeOfWork} />
                            </div>
                        </>
                    )}

                    {/* Resp Matrix SOW (if present in Excel) */}
                    <RespMatrixSOW />

                    {shouldRenderPaymentTerms && (
                        <div className="px-6 break-inside-avoid">
                            <PaymentTermsSection />
                        </div>
                    )}
                    {shouldRenderSignatureBlock && (
                        <>
                            <PageBreak />
                            <ContinuationPageHeader />
                            <div className="px-6 break-inside-avoid">
                                <SignatureBlock />
                            </div>
                        </>
                    )}
                </>
            )}
        </ProposalLayout>
    );
};

export default ProposalTemplate5;
