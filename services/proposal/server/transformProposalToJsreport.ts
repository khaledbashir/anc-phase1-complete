/**
 * transformProposalToJsreport.ts
 *
 * Pure data reshaping: ProposalType + _audit → flat JSON for jsreport Handlebars template.
 * No business logic — all math is done upstream by pricingMath.ts / ProposalContext.
 */

import { ProposalType } from "@/types";
import { computeTableTotals, computeDocumentTotalFromTables } from "@/lib/pricingMath";
import { normalizePitch } from "@/lib/helpers";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JsreportPricingItem {
    description: string;
    price: string;
}

interface JsreportPricingTable {
    label: string;
    items: JsreportPricingItem[];
    subtotal?: string;
    taxLabel?: string;
    tax?: string;
    bond?: string;
    grandTotal: string;
}

interface JsreportScreen {
    name: string;
    height: string;
    width: string;
    pitch: string;
    resH: string;
    resW: string;
    brightness: string;
    qty: number;
}

export interface JsreportProposalData {
    companyName: string;
    documentType: string;
    date: string;
    proposalNumber: string;
    projectName: string;
    clientName: string;
    introText: string;
    pricingTables: JsreportPricingTable[];
    screens: JsreportScreen[];
    notes: string[];
    // Signature
    showSignatureBlock: boolean;
    purchaserLegalName: string;
    // Document totals
    documentTotal: string;
    currency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = "USD"): string {
    if (!isFinite(amount)) return "$0.00";
    const prefix = currency === "CAD" ? "C$" : "$";
    const formatted = Math.abs(amount)
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return amount < 0 ? `(${prefix}${formatted})` : `${prefix}${formatted}`;
}

function formatFeetPlain(val: any): string {
    const n = Number(val);
    if (!isFinite(n)) return "";
    return `${n.toFixed(2)}'`;
}

function formatPitch(val: any): string {
    const corrected = normalizePitch(val);
    if (corrected <= 0) return "";
    return corrected < 2
        ? corrected.toFixed(2)
        : corrected.toFixed(corrected % 1 === 0 ? 0 : 2);
}

function computePixels(feetValue: any, pitchMm: any): number {
    const ft = Number(feetValue);
    const pitch = normalizePitch(pitchMm);
    if (!isFinite(ft) || ft <= 0 || pitch <= 0) return 0;
    return Math.round((ft * 304.8) / pitch);
}

function numberWithCommas(n: number): string {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getDocumentTypeLabel(mode: string | undefined): string {
    switch (mode) {
        case "LOI": return "Letter of Intent";
        case "PROPOSAL": return "Proposal";
        case "BUDGET": return "Budget Estimate";
        default: return "Proposal";
    }
}

function getDateString(): string {
    const d = new Date();
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ─── Main Transform ──────────────────────────────────────────────────────────

export function transformProposalToJsreport(
    data: ProposalType & { _audit?: any },
): JsreportProposalData {
    const details = data.details as any;
    const pricingDocument = details?.pricingDocument || (data as any)?.pricingDocument;
    const currency: string = pricingDocument?.currency || "USD";
    const priceOverrides = details?.priceOverrides || {};
    const descriptionOverrides = details?.descriptionOverrides || {};
    const tableHeaderOverrides = (details?.tableHeaderOverrides || {}) as Record<string, string>;

    // ── Pricing Tables ──
    const rawTables = (pricingDocument?.tables || []) as any[];
    const masterTableIndex = details?.masterTableIndex ?? -1;

    const pricingTables: JsreportPricingTable[] = rawTables
        .filter((_: any, idx: number) => idx !== masterTableIndex)
        .map((table: any) => {
            const totals = computeTableTotals(table, priceOverrides, descriptionOverrides);
            const tableName = (table?.name ?? "").toString().trim();
            const tableId = table?.id;
            const override = tableId ? tableHeaderOverrides[tableId] : undefined;
            const label = (override || tableName || "Section").toString().trim();

            const items: JsreportPricingItem[] = totals.items.map((item: any) => ({
                description: item.description,
                price: item.isIncluded ? "INCLUDED" : formatCurrency(item.price, currency),
            }));

            const result: JsreportPricingTable = {
                label: label.toUpperCase(),
                items,
                grandTotal: formatCurrency(totals.grandTotal, currency),
            };

            if (Math.abs(totals.subtotal) >= 0.01 && totals.subtotal !== totals.grandTotal) {
                result.subtotal = formatCurrency(totals.subtotal, currency);
            }
            if (Math.abs(totals.tax) >= 0.01) {
                result.taxLabel = totals.taxLabel || "Tax";
                result.tax = formatCurrency(totals.tax, currency);
            }
            if (Math.abs(totals.bond) >= 0.01) {
                result.bond = formatCurrency(totals.bond, currency);
            }

            return result;
        });

    // ── Screens (specs table) ──
    const rawScreens = (details?.screens || []).filter((s: any) => !s?.hiddenFromSpecs);
    const screens: JsreportScreen[] = rawScreens.map((screen: any) => {
        const h = screen?.heightFt ?? screen?.height ?? 0;
        const w = screen?.widthFt ?? screen?.width ?? 0;
        const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
        const pixelsH = screen?.pixelsH || computePixels(h, pitch);
        const pixelsW = screen?.pixelsW || computePixels(w, pitch);
        const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
        const brightnessNumber = Number(rawBrightness);
        const brightnessText =
            rawBrightness == null || rawBrightness === "" || rawBrightness === 0
                ? "—"
                : isFinite(brightnessNumber) && brightnessNumber > 0
                    ? numberWithCommas(brightnessNumber)
                    : "—";

        return {
            name: screen?.customDisplayName || screen?.externalName || screen?.name || "Display",
            height: formatFeetPlain(h),
            width: formatFeetPlain(w),
            pitch: pitch ? `${formatPitch(pitch)}` : "—",
            resH: pixelsH ? pixelsH.toString() : "—",
            resW: pixelsW ? pixelsW.toString() : "—",
            brightness: brightnessText,
            qty: Number(screen?.quantity || 1),
        };
    });

    // ── Notes ──
    const customNotes = details?.customProposalNotes || details?.additionalNotes || "";
    const noteLines: string[] = customNotes
        ? customNotes.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0)
        : [
            "All prices quoted in USD. Valid for 30 days from date of proposal.",
            "Payment terms: 50% upon signing, 40% upon delivery, 10% upon completion.",
        ];

    // ── Document total ──
    const docTotal = rawTables.length > 0
        ? computeDocumentTotalFromTables(rawTables, priceOverrides, descriptionOverrides)
        : 0;

    // ── Intro text ──
    const introText = details?.loiHeaderText
        || details?.introText
        || `We are pleased to present this ${getDocumentTypeLabel(details?.documentMode)} for the design, fabrication, and installation of digital display systems as outlined below.`;

    return {
        companyName: "ANC",
        documentType: getDocumentTypeLabel(details?.documentMode),
        date: getDateString(),
        proposalNumber: details?.proposalId || "DRAFT",
        projectName: details?.proposalName || details?.venue || "Digital Display Systems",
        clientName: data.receiver?.name || details?.clientName || "Client",
        introText,
        pricingTables,
        screens,
        notes: noteLines,
        showSignatureBlock: details?.showSignatureBlock !== false,
        purchaserLegalName: details?.purchaserLegalName || data.receiver?.name || "Client",
        documentTotal: formatCurrency(docTotal, currency),
        currency,
    };
}
