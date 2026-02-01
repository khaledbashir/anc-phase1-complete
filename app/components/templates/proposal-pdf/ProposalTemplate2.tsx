import React from "react";

// Components
import ProposalLayout from "./ProposalLayout";
import LogoSelectorServer from "@/app/components/reusables/LogoSelectorServer";

// Helpers
import { formatNumberWithCommas, isDataUrl, formatCurrency } from "@/lib/helpers";

// Variables
import { DATE_OPTIONS } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

// Styles
import { PDF_COLORS, PDF_STYLES } from "./PdfStyles";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";

// Placeholders
import { PDF_PLACEHOLDERS } from "@/lib/pdfPlaceholders";
import ExhibitA_SOW from "./exhibits/ExhibitA_SOW";
import ExhibitB_CostSchedule from "./exhibits/ExhibitB_CostSchedule";

interface ProposalTemplate2Props extends ProposalType {
    forceWhiteLogo?: boolean;
    screens?: any[];
    isSharedView?: boolean;
}

const ProposalTemplate2 = (data: ProposalTemplate2Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens: screensProp, isSharedView = false } = data;
    const screens = screensProp || details?.screens || [];
    const internalAudit = details?.internalAudit as any;
    const totals = internalAudit?.totals;

    const documentType = (details as any).documentType as "LOI" | "First Round" | undefined;
    const pricingType = (details as any).pricingType as "Hard Quoted" | "Budget" | undefined;
    const headerType = documentType === "LOI" ? "LOI" : pricingType === "Hard Quoted" ? "PROPOSAL" : "BUDGET";
    const docLabel = headerType === "BUDGET" ? "BUDGET ESTIMATE" : "SALES QUOTATION";

    const purchaserName = receiver?.name || "Client Name";
    const purchaserAddress =
        details?.venue === "Milan Puskar Stadium"
            ? "1 Ira Errett Rodgers Drive, Morgantown, WV 26505"
            : details?.venue === "WVU Coliseum"
                ? "3450 Monongahela Blvd, Morgantown, WV 26505"
                : (() => {
                    const address = receiver?.address;
                    const city = receiver?.city;
                    const zip = receiver?.zipCode;
                    const parts = [address, city, zip].filter(Boolean) as string[];
                    if (parts.length === 0) return "[CLIENT ADDRESS]";
                    if (parts.length === 1) return parts[0];
                    if (parts.length === 2) return `${parts[0]}, ${parts[1]}`;
                    return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
                })();

    const ancAddress = sender?.address || "2 Manhattanville Road, Suite 402, Purchase, NY 10577";

    // Helper for Section Title
    const SectionHeader = ({ title }: { title: string }) => (
        <div className="text-center mb-6 mt-8">
            <h2 className="text-xl font-medium tracking-[0.2em] text-gray-500 uppercase" style={{ fontFamily: "'Work Sans', sans-serif" }}>{title}</h2>
        </div>
    );

    // Helper for Spec Table - MATCHES IMAGE 1
    const SpecTable = ({ screen }: { screen: any }) => {
        // REQ-UserFeedback: Conditional Rendering for "Soft Cost" Items
        // If technical fields (pitch, width) are missing/zero, skip technical rendering to prevent 500 Error
        const isSoftCost = (!screen.pitchMm || screen.pitchMm === 0) && (!screen.widthFt || screen.widthFt === 0) && (!screen.pixelPitch);

        if (isSoftCost) {
            return (
                <div className="mb-4 break-inside-avoid">
                    <div className="flex justify-between items-center border-b-2 border-gray-200 pb-1 mb-1">
                        <h3 className="font-bold text-sm uppercase text-gray-500" style={{ fontFamily: "'Work Sans', sans-serif" }}>{screen.name || "Service Item"}</h3>
                        <span className="text-xs text-gray-400 uppercase">Service / Soft Cost</span>
                    </div>
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded text-[10px] text-gray-500 italic">
                        Technical specifications not applicable for this service item.
                    </div>
                </div>
            );
        }

        return (
            <div className="mb-8 break-inside-avoid">
                {/* Header Bar */}
                <div className="flex justify-between items-center border-b-2 border-[#0A52EF] pb-1 mb-1">
                    <h3 className="font-bold text-sm uppercase text-[#0A52EF]" style={{ fontFamily: "'Work Sans', sans-serif" }}>{screen.name || "Display"}</h3>
                    <span className="font-bold text-sm uppercase text-[#0A52EF]" style={{ fontFamily: "'Work Sans', sans-serif" }}>Specifications</span>
                </div>
                <table className="w-full text-[11px] border-collapse" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    <tbody>
                        <tr className="bg-white">
                            <td className="p-1.5 pl-4 text-gray-700 w-2/3">MM Pitch</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{screen.pitchMm ?? screen.pixelPitch ?? 0} mm</td>
                        </tr>
                        <tr className="bg-gray-100">
                            <td className="p-1.5 pl-4 text-gray-700">Quantity</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{screen.quantity || 1}</td>
                        </tr>
                        <tr className="bg-white">
                            <td className="p-1.5 pl-4 text-gray-700">Active Display Height (ft.)</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'</td>
                        </tr>
                        <tr className="bg-gray-100">
                            <td className="p-1.5 pl-4 text-gray-700">Active Display Width (ft.)</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'</td>
                        </tr>
                        <tr className="bg-white">
                            <td className="p-1.5 pl-4 text-gray-700">Pixel Resolution (H)</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{screen?.pixelsH || Math.round((Number(screen?.heightFt ?? 0) * 304.8) / (screen?.pitchMm || 10)) || 0} p</td>
                        </tr>
                        <tr className="bg-gray-100">
                            <td className="p-1.5 pl-4 text-gray-700">Pixel Resolution (W)</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{screen?.pixelsW || Math.round((Number(screen?.widthFt ?? 0) * 304.8) / (screen?.pitchMm || 10)) || 0} p</td>
                        </tr>
                        <tr className="bg-white">
                            <td className="p-1.5 pl-4 text-gray-700">Pixel Density (sq. ft.)</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">
                                {formatNumberWithCommas(Math.round(92903 / Math.pow(screen?.pitchMm || 10, 2)))} pixels
                            </td>
                        </tr>
                        <tr className="bg-gray-100">
                            <td className="p-1.5 pl-4 text-gray-700">Brightness</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">
                                {screen.brightness ? `${formatNumberWithCommas(screen.brightness)}` : "Standard"}
                            </td>
                        </tr>
                        <tr className="bg-white">
                            <td className="p-1.5 pl-4 text-gray-700">HDR Status</td>
                            <td className="p-1.5 text-right pr-4 text-gray-900">{screen.isHDR ? "Enabled" : "Standard"}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // REQ-124: Context-bound tax/bond rates (not hardcoded)
    const taxRate = (details as any)?.taxRateOverride ?? 0.095; // Default 9.5%
    const bondRate = (details as any)?.bondRateOverride ?? 0.015; // Default 1.5%

    // REQ-124: Project-level totals for consolidated tax display
    const projectSubtotal = totals?.sellPrice || screens.reduce((sum: number, s: any) => {
        const audit = internalAudit?.perScreen?.find((a: any) => a.id === s.id || a.name === s.name);
        return sum + (audit?.breakdown?.sellPrice || 0);
    }, 0);
    const projectBondCost = totals?.bondCost || (projectSubtotal * bondRate);
    const projectBoTaxCost = totals?.boTaxCost || 0; // Only from audit (Morgantown detection)
    const projectTaxableAmount = projectSubtotal + projectBondCost + projectBoTaxCost;
    const projectSalesTax = projectTaxableAmount * taxRate;
    const projectGrandTotal = projectTaxableAmount + projectSalesTax;

    // Helper for Pricing Table - Shows screen line items only (no per-screen tax)
    const PricingTable = ({ screen, isLastScreen }: { screen: any; isLastScreen: boolean }) => {
        // REQ-28: Security - If shared view, we MUST NOT use internal audit data directly if it contains costs/margins
        const auditRow = isSharedView ? null : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
        const b = auditRow?.breakdown;

        // Fallback for shared view where internalAudit might be missing/sanitized
        const getPrice = (category: string) => {
            if (b) return b[category] || 0;
            const item = screen.lineItems?.find((li: any) => li.category?.toLowerCase() === category.toLowerCase());
            return item?.price || 0;
        };

        const hardwarePrice = b ? (b.hardware * 1.3) : getPrice("Hardware");
        const structurePrice = b ? b.structure : getPrice("Structure");
        const installPrice = b ? b.install : getPrice("Install");
        const powerPrice = b ? b.power : getPrice("Power");
        const pmTravelPrice = b ? (b.pm + b.travel + b.generalConditions) : getPrice("PM");
        const engineeringPrice = b ? (b.engineering + b.permits + b.submittals) : getPrice("Engineering");
        const cmsPrice = b ? b.cms : getPrice("CMS");

        // REQ-124: Screen-level subtotal only (Bond, B&O, Tax shown at project level)
        const lineItemsSubtotal = hardwarePrice + structurePrice + installPrice + powerPrice + pmTravelPrice + engineeringPrice + cmsPrice;
        const screenSellPrice = b ? b.sellPrice : lineItemsSubtotal;

        // REQ-UserFeedback: Conditional Rendering for Pricing Table (Soft Costs)
        const isSoftCost = (!screen.pitchMm || screen.pitchMm === 0) && (!screen.widthFt || screen.widthFt === 0) && !auditRow;

        if (isSoftCost) {
            const total = screen.sellPrice || screen.price || 0;
            return (
                <div className="mb-4 break-inside-avoid">
                    <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-1">
                        <h3 className="font-bold text-sm uppercase text-black">{screen.name || "Service Item"}</h3>
                        <span className="font-bold text-sm uppercase text-black">Pricing</span>
                    </div>
                    <table className="w-full text-[11px] border-collapse">
                        <tbody>
                            <tr className="bg-white border-b border-gray-100">
                                <td className="p-2 pl-4 text-gray-700 font-bold w-3/4">{screen.name}</td>
                                <td className="p-2 text-right pr-4 font-bold text-[#0A52EF] w-1/4">{formatCurrency(total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        }

        return (
            <div className="mb-8 break-inside-avoid">
                {/* Header Bar */}
                <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-1">
                    <h3 className="font-bold text-sm uppercase text-black">{screen.name || "Display"}</h3>
                    <span className="font-bold text-sm uppercase text-black">Pricing</span>
                </div>

                <table className="w-full text-[11px] border-collapse">
                    <tbody>
                        <tr className="bg-white border-b border-gray-100">
                            <td className="p-2 pl-4 text-gray-700 w-3/4">
                                <div className="font-bold text-black uppercase">{screen.name}</div>
                                <div className="text-[10px] text-gray-500">
                                    {Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}' H x {Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}' W - {screen.pitchMm ?? screen.pixelPitch ?? 0}mm - QTY {screen.quantity || 1}
                                </div>
                            </td>
                            <td className="p-2 text-right pr-4 font-bold text-gray-900 w-1/4 align-bottom">{formatCurrency(hardwarePrice)}</td>
                        </tr>
                        {/* REQ-UserFeedback: Hide Zero-Cost Rows */}
                        {structurePrice > 0 && (
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <td className="p-1.5 pl-4 text-gray-600">Structural Materials</td>
                                <td className="p-1.5 text-right pr-4 text-gray-900 font-medium">{formatCurrency(structurePrice)}</td>
                            </tr>
                        )}
                        {installPrice > 0 && (
                            <tr className="bg-white border-b border-gray-100">
                                <td className="p-1.5 pl-4 text-gray-600">Structural Labor and LED Installation</td>
                                <td className="p-1.5 text-right pr-4 text-gray-900 font-medium">{formatCurrency(installPrice)}</td>
                            </tr>
                        )}
                        {powerPrice > 0 && (
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <td className="p-1.5 pl-4 text-gray-600">Electrical and Data - Materials and Subcontracting</td>
                                <td className="p-1.5 text-right pr-4 text-gray-900 font-medium">{formatCurrency(powerPrice)}</td>
                            </tr>
                        )}
                        {pmTravelPrice > 0 && (
                            <tr className="bg-white border-b border-gray-100">
                                <td className="p-1.5 pl-4 text-gray-600">Project Management, General Conditions, Travel & Expenses</td>
                                <td className="p-1.5 text-right pr-4 text-gray-900 font-medium">{formatCurrency(pmTravelPrice)}</td>
                            </tr>
                        )}
                        {engineeringPrice > 0 && (
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <td className="p-1.5 pl-4 text-gray-600">Submittals, Engineering, and Permits</td>
                                <td className="p-1.5 text-right pr-4 text-gray-900 font-medium">{formatCurrency(engineeringPrice)}</td>
                            </tr>
                        )}
                        {cmsPrice > 0 && (
                            <tr className="bg-white border-b border-gray-100">
                                <td className="p-1.5 pl-4 text-gray-600">Content Management System Equipment, Installation, and Commissioning</td>
                                <td className="p-1.5 text-right pr-4 text-gray-900 font-medium">{formatCurrency(cmsPrice)}</td>
                            </tr>
                        )}

                        {/* REQ-124: Screen subtotal only - Bond/Tax shown at project level */}
                        <tr className="font-bold border-t-2 border-black bg-gray-50">
                            <td className="p-2 text-right pr-4 uppercase text-xs">Subtotal for {screen.name}:</td>
                            <td className="p-2 text-right pr-4 text-xs text-[#0A52EF]">{formatCurrency(screenSellPrice)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // REQ-124: Project-Level Financial Summary (Bond, B&O Tax, Sales Tax consolidated)
    const ProjectTotalsSummary = () => (
        <div className="mt-8 mb-8 break-inside-avoid px-4">
            <div className="border-t-2 border-black pt-4">
                <h3 className="font-bold text-sm uppercase text-black mb-4" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Project Financial Summary
                </h3>
                <table className="w-full text-[11px]">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-gray-700">Combined Display Subtotal:</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(projectSubtotal)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-gray-700">Performance Bond ({(bondRate * 100).toFixed(1)}%):</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(projectBondCost)}</td>
                        </tr>
                        {projectBoTaxCost > 0 && (
                            <tr className="border-b border-gray-200">
                                <td className="p-2 text-gray-700">WV B&O Tax (2%):</td>
                                <td className="p-2 text-right font-medium">{formatCurrency(projectBoTaxCost)}</td>
                            </tr>
                        )}
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-gray-700">Sales Tax ({(taxRate * 100).toFixed(1)}%):</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(projectSalesTax)}</td>
                        </tr>
                        <tr className="bg-[#0A52EF] text-white">
                            <td className="p-3 font-bold uppercase">Project Grand Total:</td>
                            <td className="p-3 text-right font-bold text-lg">
                                {projectGrandTotal > 0 ? formatCurrency(projectGrandTotal) : PDF_PLACEHOLDERS.TOTAL_PRICE}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <ProposalLayout data={data} disableFixedFooter>
            {/* 1. HEADER (Summary Page) - Refined for ABCDE Layout */}
            <div className="flex justify-between items-start mb-10 px-4 pt-4 break-inside-avoid">
                {/* Logo Left */}
                <div className="w-1/2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/ANC_Logo_2023_blue.png"
                        alt="ANC"
                        style={{ width: '160px', height: 'auto', objectFit: 'contain' }}
                    />
                </div>
                {/* Title Right */}
                <div className="w-1/2 text-right">
                    <h1 className="text-2xl font-bold text-[#0A52EF] uppercase leading-tight mb-1" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                        {receiver?.name || "Client Name"}
                    </h1>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                        {docLabel}
                    </h2>
                </div>
            </div>

            {/* Intro Paragraph */}
            <div className="mb-10 text-[11px] text-gray-700 text-justify leading-relaxed px-4">
                {headerType === "LOI" ? (
                    <p>
                        This Sales Quotation will set forth the terms by which {purchaserName} (“Purchaser”) located at {purchaserAddress} and ANC Sports Enterprises, LLC (“ANC”) located at {ancAddress} (collectively, the “Parties”) agree that ANC will provide following LED Display and services (the “Display System”) described below for {details?.location || details?.proposalName || "the project"}.
                    </p>
                ) : headerType === "PROPOSAL" ? (
                    <p>
                        ANC is pleased to present the following LED Display proposal to {purchaserName} per the specifications and pricing below.
                    </p>
                ) : (
                    <p>
                        ANC is pleased to present the following LED Display budget to {purchaserName} per the specifications and pricing below.
                    </p>
                )}
            </div>

            {/* 2. SPECIFICATIONS SECTION */}
            <div className="px-4">
                <SectionHeader title="SPECIFICATIONS" />
                {screens && screens.length > 0 ? (
                    screens.map((screen: any, idx: number) => {
                        try {
                            return <SpecTable key={idx} screen={screen} />
                        } catch (error) {
                            console.error(`Error rendering SpecTable for screen ${idx}:`, error);
                            return null;
                        }
                    })
                ) : (
                    <div className="text-center text-gray-400 italic py-8">No screens configured.</div>
                )}
            </div>

            {/* EXHIBIT A: SOW & TECH SPECS (AUTO-GENERATED) */}
            <div className="break-before-page px-4">
                <ExhibitA_SOW data={data} />
            </div>

            <div className="break-before-page px-4">
                {/* 3. PRICING SECTION */}
                <SectionHeader title="PRICING" />
                {screens && screens.length > 0 ? (
                    screens.map((screen: any, idx: number) => {
                        try {
                            return <PricingTable key={idx} screen={screen} isLastScreen={idx === screens.length - 1} />
                        } catch (error) {
                            console.error(`Error rendering PricingTable for screen ${idx}:`, error);
                            return null;
                        }
                    })
                ) : null}

                {/* REQ-124: Project-Level Financial Summary (Bond, B&O Tax, Sales Tax consolidated) */}
                <ProjectTotalsSummary />
            </div>

            {/* EXHIBIT B: COST SCHEDULE (AUTO-GENERATED) */}
            <div className="break-before-page px-4">
                <ExhibitB_CostSchedule data={data} />
            </div>

            {/* 6. PROJECT CONSTRAINTS & ASSUMPTIONS - REMOVED per user feedback (marked with X) */}

            {/* 7. SIGNATURES - FORCED TO END */}
            <div className="break-before-page px-4 pt-4">
                {/* REQ-112: Footer moved BEFORE signatures to ensure signatures are absolute final element */}
                <div className="mb-12 pb-6 border-b border-gray-100 text-center">
                    <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase mb-1">ANC SPORTS ENTERPRISES, LLC</p>
                    <p className="text-[8px] text-gray-400 font-medium">2 Manhattanville Road, Suite 402, Purchase, NY 10577  |  www.anc.com</p>
                    <div className="flex justify-center mt-6 opacity-20">
                        <BrandSlashes count={3} width={50} height={15} />
                    </div>
                </div>

                {/* REQ-112: Signature Block as Absolute Final Element - No content renders below this point */}
                <div className="mt-12 break-inside-avoid">
                    <p className="text-[10px] text-gray-600 leading-relaxed text-justify mb-10" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                        Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein and to authorize ANC to commence production.
                        <br /><br />
                        If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties.
                    </p>
                    <h4 className="font-bold text-[11px] uppercase mb-8 border-b-2 border-black pb-1">Agreed To And Accepted:</h4>

                    <div className="space-y-10">
                        {/* ANC Signature Block */}
                        <div>
                            <p className="font-bold text-[11px] text-[#0A52EF] mb-4">ANC SPORTS ENTERPRISES, LLC ("ANC")</p>
                            <p className="text-[10px] text-gray-500 mb-4">2 Manhattanville Road, Suite 402, Purchase, NY 10577</p>
                            <div className="flex gap-6">
                                <div className="flex-[2]">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">By:</p>
                                    <div className="border-b border-black h-8" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Title:</p>
                                    <div className="border-b border-black h-8" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Date:</p>
                                    <div className="border-b border-black h-8" />
                                </div>
                            </div>
                        </div>

                        {/* Purchaser Signature Block */}
                        <div>
                            <p className="font-bold text-[11px] text-[#0A52EF] mb-4">{receiver?.name || "Purchaser"} ("PURCHASER")</p>
                            <p className="text-[10px] text-gray-500 mb-4">{purchaserAddress}</p>
                            <div className="flex gap-6">
                                <div className="flex-[2]">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">By:</p>
                                    <div className="border-b border-black h-8" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Title:</p>
                                    <div className="border-b border-black h-8" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Date:</p>
                                    <div className="border-b border-black h-8" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </ProposalLayout>
    );
};

export default ProposalTemplate2;
