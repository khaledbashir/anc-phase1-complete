/* BACKUP OF APPROVED DESIGN - SAVED FEB 2, 2026. DO NOT MODIFY. USE THIS AS A REFERENCE IF THE MAIN PROPOSAL UI BREAKS. */

import React from "react";

// Components
import { ProposalLayout } from "@/app/components";
import LogoSelectorServer from "@/app/components/reusables/LogoSelectorServer";
import BaseBidDisplaySystemSection from "@/app/components/templates/proposal-pdf/BaseBidDisplaySystemSection";
import ExhibitA_TechnicalSpecs from "@/app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs";
import ExhibitB_CostSchedule from "@/app/components/templates/proposal-pdf/exhibits/ExhibitB_CostSchedule";

// Helpers
import { formatNumberWithCommas, isDataUrl, formatCurrency } from "@/lib/helpers";
import { resolveDocumentMode } from "@/lib/documentMode";

// Variables
import { DATE_OPTIONS } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

// Styles
import { PDF_COLORS, PDF_STYLES } from "./PdfStyles";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";

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

    const documentMode = resolveDocumentMode(details);
    const docLabel = documentMode === "BUDGET" ? "BUDGET ESTIMATE" : "SALES QUOTATION";
    const isLOI = documentMode === "LOI";

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

    const formatFeet = (value: any) => {
        const n = Number(value);
        if (!isFinite(n)) return "";
        const rounded = Math.round(n * 100) / 100;
        const asInt = Math.round(rounded);
        if (Math.abs(rounded - asInt) < 0.00001) return `${asInt}'`;
        return `${rounded.toFixed(2)}'`;
    };

    const splitDisplayNameAndSpecs = (value: string) => {
        const raw = (value || "").toString().trim();
        if (!raw) return { header: "", specs: "" };
        const idxParen = raw.indexOf("(");
        const idxColon = raw.indexOf(":");
        const idx =
            idxParen === -1 ? idxColon : idxColon === -1 ? idxParen : Math.min(idxParen, idxColon);
        if (idx === -1) return { header: raw, specs: "" };
        const header = raw.slice(0, idx).trim().replace(/[-–—]\s*$/, "").trim();
        const specs = raw.slice(idx).trim();
        return { header, specs };
    };

    const getScreenLabel = (screen: any) => {
        const label = (screen?.customDisplayName || screen?.externalName || screen?.name || "Display").toString().trim();
        const split = splitDisplayNameAndSpecs(label);
        const header = split.header || label;
        return header.length > 0 ? header : "Display";
    };

    const getScreenHeader = (screen: any) => {
        const customName = (screen?.customDisplayName || "").toString().trim();
        if (customName) return customName;

        const externalName = (screen?.externalName || "").toString().trim();
        if (externalName) return externalName;

        const name = (screen?.name || "Display").toString().trim();
        const serviceType = (screen?.serviceType || "").toString().toLowerCase();
        const serviceLabel = serviceType.includes("top") ? "RIBBON DISPLAY" : serviceType ? "VIDEO DISPLAY" : "";

        const heightFt = screen?.heightFt ?? screen?.height;
        const widthFt = screen?.widthFt ?? screen?.width;
        const pitchMm = screen?.pitchMm ?? screen?.pixelPitch;

        const parts: string[] = [name];
        if (serviceLabel) parts.push(serviceLabel);
        if (heightFt != null && widthFt != null && Number(heightFt) > 0 && Number(widthFt) > 0) {
            parts.push(`${formatFeet(heightFt)} H X ${formatFeet(widthFt)} W`);
        }
        if (pitchMm != null && Number(pitchMm) > 0) {
            parts.push(`${Math.round(Number(pitchMm))}MM`);
        }
        return parts.filter(Boolean).join(" - ");
    };

    // Helper for Section Title
    const SectionHeader = ({ title }: { title: string }) => (
        <div className="text-center mb-6 mt-8">
            <h2 className="text-xl font-medium tracking-[0.2em] text-gray-500 uppercase font-sans">{title}</h2>
        </div>
    );

    // Helper for Spec Table - MATCHES IMAGE 1
    const SpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-8 break-inside-avoid">
            {/* Header Bar */}
            <div className="flex justify-between items-center border-b-2 border-[#0A52EF] pb-1 mb-1">
                <h3 className="font-bold text-sm uppercase text-[#0A52EF] font-sans">{getScreenHeader(screen)}</h3>
                <span className="font-bold text-sm uppercase text-[#0A52EF] font-sans">Specifications</span>
            </div>
            <table className="w-full text-[11px] border-collapse font-sans">
                <tbody>
                    <tr className="bg-white border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700 w-2/3">MM Pitch</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">{screen.pitchMm ?? screen.pixelPitch ?? 0} mm</td>
                    </tr>
                    <tr className="bg-gray-100 border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700">Quantity</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">{screen.quantity || 1}</td>
                    </tr>
                    <tr className="bg-white border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700">Active Display Height (ft.)</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">{Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'</td>
                    </tr>
                    <tr className="bg-gray-100 border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700">Active Display Width (ft.)</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">{Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'</td>
                    </tr>
                    <tr className="bg-white border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700">Pixel Resolution (H)</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">{screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} p</td>
                    </tr>
                    <tr className="bg-gray-100 border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700">Pixel Resolution (W)</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">{screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} p</td>
                    </tr>
                    <tr className="bg-white border-b border-gray-200 last:border-b-0">
                        <td className="p-1.5 pl-4 text-gray-700">Brightness</td>
                        <td className="p-1.5 text-right pr-4 text-gray-900">
                            {screen.brightnessNits ? `${formatNumberWithCommas(screen.brightnessNits)}` : "Standard"}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    // ===== TOGGLES FROM DETAILS =====
    const includePricingBreakdown = (details as any)?.includePricingBreakdown ?? true;
    const showPricingTables = (details as any)?.showPricingTables ?? true;
    const showIntroText = (details as any)?.showIntroText ?? true;
    const showBaseBidTable = (details as any)?.showBaseBidTable ?? true;
    const showSpecifications = (details as any)?.showSpecifications ?? true;
    const showCompanyFooter = (details as any)?.showCompanyFooter ?? true;
    const showExhibitA = (details as any)?.showExhibitA ?? false;
    const showExhibitB = (details as any)?.showExhibitB ?? false;
    const showSignatureBlock = (details as any)?.showSignatureBlock ?? true;
    const showPaymentTerms = (details as any)?.showPaymentTerms ?? true;
    const effectiveShowPaymentTerms = documentMode === "LOI" && showPaymentTerms;
    const effectiveShowSignatureBlock = documentMode === "LOI" && showSignatureBlock;

    // Detailed Pricing Table - Shows category breakdown (when toggle is ON)
    const DetailedPricingTable = ({ screen }: { screen: any }) => {
        const auditRow = isSharedView ? null : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
        const b = auditRow?.breakdown;

        const getPrice = (category: string) => {
            if (b) return b[category] || 0;
            return 0;
        };

        const hardwarePrice = b ? (b.hardware * 1.3) : getPrice("Hardware");
        const structurePrice = b ? b.structure : getPrice("Structure");
        const installPrice = b ? b.install : getPrice("Install");
        const powerPrice = b ? b.power : getPrice("Power");
        const pmTravelPrice = b ? (b.pm + b.travel + b.generalConditions) : getPrice("PM");
        const engineeringPrice = b ? (b.engineering + b.permits + b.submittals) : getPrice("Engineering");
        const cmsPrice = b ? b.cms : getPrice("CMS");
        const subtotal = b?.finalClientTotal || (hardwarePrice + structurePrice + installPrice + powerPrice + pmTravelPrice + engineeringPrice + cmsPrice);
        const isNonZeroMoney = (value: any) => Math.abs(Number(value) || 0) >= 0.01;
        const lineItems = [
            { label: "LED Display System", value: hardwarePrice },
            { label: "Structural Materials", value: structurePrice },
            { label: "Installation Labor", value: installPrice },
            { label: "Electrical & Data", value: powerPrice },
            { label: "PM, Travel & General Conditions", value: pmTravelPrice },
            { label: "Engineering & Permits", value: engineeringPrice },
            { label: "CMS & Commissioning", value: cmsPrice },
        ].filter((row) => isNonZeroMoney(row.value));

        return (
            <div className="mb-6 break-inside-avoid">
                <div className="flex justify-between items-center border-b-2 border-[#0A52EF] pb-1 mb-1">
                    <h3 className="font-bold text-sm uppercase text-[#0A52EF]">{getScreenHeader(screen)}</h3>
                    <span className="font-bold text-sm uppercase text-[#0A52EF]">Pricing</span>
                </div>
                <table className="w-full text-[11px] border-collapse">
                    <tbody>
                        {lineItems.map((row, idx) => (
                            <tr key={row.label} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}>
                                <td className="p-1.5 pl-4 text-gray-700">{row.label}</td>
                                <td className="p-1.5 pr-4 text-right text-gray-900 font-medium">{formatCurrency(row.value)}</td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-black font-bold">
                            <td className="p-2 pl-4 text-gray-900 uppercase text-xs">Subtotal</td>
                            <td className="p-2 pr-4 text-right text-[#0A52EF]">{formatCurrency(subtotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // Simple Pricing Section - Shows Name + Total Price only (when toggle is OFF)
    const SimplePricingSection = () => {
        const softCostItems = internalAudit?.softCostItems || [];

        const toWholeFeet = (value: any) => {
            const n = Number(value);
            if (!isFinite(n)) return "";
            return `${Math.round(n)}'`;
        };

        const toExactFeet = (value: any) => {
            const n = Number(value);
            if (!isFinite(n)) return "";
            return `${(Math.round(n * 100) / 100).toFixed(2)}'`;
        };

        const buildDescription = (screen: any) => {
            const serviceType = (screen?.serviceType || "").toString().toLowerCase();
            const serviceLabel = serviceType.includes("top") ? "Ribbon Display" : serviceType ? "Video Display" : "Display";

            const heightFt = screen?.heightFt ?? screen?.height;
            const widthFt = screen?.widthFt ?? screen?.width;
            const pitchMm = screen?.pitchMm ?? screen?.pixelPitch;
            const qty = screen?.quantity || 1;

            const parts: string[] = [];
            parts.push(serviceLabel);

            if (heightFt != null && widthFt != null && Number(heightFt) > 0 && Number(widthFt) > 0) {
                parts.push(`${toWholeFeet(heightFt)} H x ${toWholeFeet(widthFt)} W`);
                parts.push(`${toExactFeet(heightFt)} H x ${toExactFeet(widthFt)} W`);
            }

            if (pitchMm != null && Number(pitchMm) > 0) {
                parts.push(`${Math.round(Number(pitchMm))}mm`);
            }

            parts.push(`QTY ${qty}`);
            return parts.filter(Boolean).join(" - ");
        };

        const quoteItems = (((details as any)?.quoteItems || []) as any[]).filter(Boolean);
        const stripLeadingLocation = (locationName: string, raw: string) => {
            const loc = (locationName || "").toString().trim();
            const text = (raw || "").toString().trim();
            if (!loc || !text) return text;
            const locUpper = loc.toUpperCase();
            const textUpper = text.toUpperCase();
            if (textUpper === locUpper) return "";
            const dashPrefix = `${locUpper} - `;
            if (textUpper.startsWith(dashPrefix)) {
                return text.slice(dashPrefix.length).trim();
            }
            if (textUpper.startsWith(locUpper)) {
                return text.slice(loc.length).replace(/^(\s*[-–—:]\s*)/, "").trim();
            }
            return text;
        };
        const lineItems =
            quoteItems.length > 0
                ? quoteItems.map((it: any, idx: number) => ({
                    key: it.id || `quote-${idx}`,
                    ...(() => {
                        const rawLocation = (it.locationName || "ITEM").toString();

                        // Try to find matching screen to check for customDisplayName
                        // 1. Try ID match
                        // 2. Try exact Name match (case-insensitive)
                        // 3. Try partial match (if quote item contains screen name)
                        const matchingScreen = screens.find((s: any) => {
                            if (s.id && it.id && s.id === it.id) return true;

                            const sName = (s.externalName || s.name || "").toString().trim().toUpperCase();
                            const itName = (it.locationName || "").toString().trim().toUpperCase();

                            // Exact match
                            if (sName === itName && sName.length > 0) return true;

                            // Partial match (e.g. "BASE - ATRIUM" contains "ATRIUM")
                            // Ensure sName is substantial enough to avoid false positives
                            if (sName.length > 3 && itName.includes(sName)) return true;

                            return false;
                        });

                        const customOverride = matchingScreen?.customDisplayName;

                        // If override exists, use it as the header
                        const effectiveLocation = customOverride || rawLocation;

                        const split = splitDisplayNameAndSpecs(effectiveLocation);
                        const header = (split.header || effectiveLocation).toString();

                        // CRITICAL: Strip the ORIGINAL location name from the description
                        // Otherwise "BASE - ATRIUM DISPLAY" remains in the description text
                        let desc = (it.description || "").toString();
                        desc = stripLeadingLocation(rawLocation, desc);
                        desc = stripLeadingLocation(effectiveLocation, desc); // Also strip new name just in case

                        const combined = [split.specs, desc].filter(Boolean).join(" ").trim();
                        return {
                            locationName: header.toUpperCase(),
                            description: combined,
                        };
                    })(),
                    price: Number(it.price || 0) || 0,
                })).filter((it: any) => Math.abs(it.price) >= 0.01)
                : [
                    ...(screens || []).map((screen: any, idx: number) => {
                        const auditRow = isSharedView
                            ? null
                            : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                        const price = auditRow?.breakdown?.sellPrice || auditRow?.breakdown?.finalClientTotal || 0;
                        const label = (screen?.customDisplayName || screen?.externalName || screen?.name || "Display").toString().trim();
                        const split = splitDisplayNameAndSpecs(label);
                        return {
                            key: `screen-${screen?.id || screen?.name || idx}`,
                            locationName: (split.header || getScreenLabel(screen)).toUpperCase(),
                            description: split.specs || buildDescription(screen),
                            price: Number(price) || 0,
                        };
                    }).filter((it) => Math.abs(it.price) >= 0.01),
                    ...softCostItems
                        .map((item: any, idx: number) => {
                            const sell = Number(item?.sell || 0);
                            return {
                                key: `soft-${idx}`,
                                locationName: (item?.name || "Item").toString().toUpperCase(),
                                description: (item?.description || "").toString(),
                                price: sell,
                            };
                        })
                        .filter((it: any) => Math.abs(it.price) >= 0.01),
                ];

        const subtotal = lineItems.reduce((sum: number, it: any) => sum + (Number(it.price) || 0), 0);

        return (
            <div className="mt-6 mb-8">
                <div className="flex justify-between border-b-2 border-black pb-2 mb-4">
                    <h2 className="text-2xl font-bold tracking-tight text-black font-sans">Project Total</h2>
                    <h2 className="text-2xl font-bold tracking-tight text-black font-sans">Pricing</h2>
                </div>

                <div className="space-y-0">
                    {lineItems.map((it: any, idx: number) => (
                        <div
                            key={it.key}
                            className={`${idx % 2 === 1 ? "bg-black/5" : ""} flex justify-between items-center py-5 px-4 -mx-4 gap-6`}
                        >
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <h3 className="font-bold text-[13px] uppercase tracking-widest mb-1 text-black font-sans">
                                    {it.locationName}
                                </h3>
                                <p className="text-[12px] text-[#6B7280] font-normal leading-relaxed pl-1">
                                    {it.description}
                                </p>
                            </div>
                            <div className="shrink-0 w-[170px] self-stretch flex items-center justify-end text-right">
                                <span className="font-bold text-lg text-black whitespace-nowrap">
                                    {formatCurrency(it.price)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex justify-end items-center space-x-12 border-t border-gray-100 pt-8">
                    <span className="font-bold text-lg tracking-widest uppercase text-gray-600">Subtotal:</span>
                    <span className="font-bold text-2xl text-black">{formatCurrency(subtotal)}</span>
                </div>

                <div className="mt-20 border-b-4 border-black w-24" />
            </div>
        );
    };

    const PaymentTermsSection = () => {
        const raw = (details?.paymentTerms || "").toString();
        const lines = raw
            .split(/\r?\n|,/g)
            .map((l) => l.trim())
            .filter(Boolean);

        if (lines.length === 0) return null;

        return (
            <div className="px-4 mt-8 break-inside-avoid">
                <SectionHeader title="PAYMENT TERMS" />
                <div className="text-[11px] text-gray-700 space-y-1">
                    {lines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                    ))}
                </div>
            </div>
        );
    };

    const LegalNotesSection = () => {
        const raw = (details?.additionalNotes || "").toString().trim();
        if (!raw) return null;
        const lines = raw
            .split(/\r?\n/g)
            .map((l) => l.trim())
            .filter(Boolean);
        if (lines.length === 0) return null;
        return (
            <div className="px-4 mt-8 break-inside-avoid">
                <SectionHeader title="LEGAL NOTES" />
                <div className="text-[11px] text-gray-700 space-y-1 whitespace-pre-wrap">
                    {lines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                    ))}
                </div>
            </div>
        );
    };

    const CompanyFooter = () => (
        <div className="px-4 mt-12 pb-6 border-t border-gray-100 text-center">
            <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase mb-1">ANC SPORTS ENTERPRISES, LLC</p>
            <p className="text-[8px] text-gray-400 font-medium">2 Manhattanville Road, Suite 402, Purchase, NY 10577  |  www.anc.com</p>
            <div className="flex justify-center mt-6 opacity-20">
                <BrandSlashes count={3} width={50} height={15} />
            </div>
        </div>
    );

    const SignatureBlock = () => (
        <div className="mt-12 break-inside-avoid">
            <p className="text-[10px] text-gray-600 leading-relaxed text-justify mb-10" style={{ fontFamily: "'Helvetica Condensed', sans-serif" }}>
                Please sign below to indicate Purchaser&apos;s agreement to purchase the Display System as described herein and to authorize ANC to commence production.
                <br /><br />
                If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties.
            </p>
            <h4 className="font-bold text-[11px] uppercase mb-8 border-b-2 border-black pb-1">Agreed To And Accepted:</h4>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="font-bold text-[10px] text-[#0A52EF] mb-2">ANC SPORTS ENTERPRISES, LLC</p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">By:</p>
                                <div className="border-b border-black h-6" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Title:</p>
                                    <div className="border-b border-black h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Date:</p>
                                    <div className="border-b border-black h-6" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="font-bold text-[10px] text-[#0A52EF] mb-2">{receiver?.name || "PURCHASER"}</p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">By:</p>
                                <div className="border-b border-black h-6" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Title:</p>
                                    <div className="border-b border-black h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Date:</p>
                                    <div className="border-b border-black h-6" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <ProposalLayout data={data} disableFixedFooter>
            {/* 1. HEADER (Summary Page) - Refined for ABCDE Layout */}
            <div className="flex justify-between items-start mb-10 px-4 pt-4 break-inside-avoid">
                {/* Logo Left */}
                <div className="w-1/2 flex items-center">
                    <LogoSelectorServer theme="light" width={160} height={80} />
                </div>
                {/* Title Right - Prevent layout shift with min-height */}
                <div className="w-1/2 text-right flex flex-col justify-center">
                    <h1 className="text-2xl font-bold text-[#0A52EF] uppercase leading-tight mb-0 min-h-[1.5em]">
                        {receiver?.name || "Client Name"}
                    </h1>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mt-1">
                        {docLabel}
                    </h2>
                </div>
            </div>

            {showIntroText && (
                <div className="mb-10 text-[11px] text-gray-700 text-justify leading-relaxed px-4">
                    {documentMode === "LOI" ? (
                        <p>
                            This Sales Quotation will set forth the terms by which {purchaserName} (“Purchaser”) located at {purchaserAddress} and ANC Sports Enterprises, LLC (“ANC”) located at {ancAddress} (collectively, the “Parties”) agree that ANC will provide following LED Display and services (the “Display System”) described below for {details?.location || details?.proposalName || "the project"}.
                        </p>
                    ) : documentMode === "PROPOSAL" ? (
                        <p>
                            ANC is pleased to present the following LED Display proposal to {purchaserName} per the specifications and pricing below.
                        </p>
                    ) : (
                        <p>
                            ANC is pleased to present the following LED Display budget to {purchaserName} per the specifications and pricing below.
                        </p>
                    )}
                </div>
            )}

            {showBaseBidTable && (
                <div className="px-4">
                    <BaseBidDisplaySystemSection data={data} />
                </div>
            )}

            <div className="px-4">
                {!isLOI && showPricingTables && (
                    <>
                        <SectionHeader title="PRICING" />
                        {includePricingBreakdown ? (
                            screens && screens.length > 0 ? (
                                screens.map((screen: any, idx: number) => (
                                    <DetailedPricingTable key={idx} screen={screen} />
                                ))
                            ) : null
                        ) : (
                            <SimplePricingSection />
                        )}
                    </>
                )}

                {/* PROJECT GRAND TOTAL */}
                {(!showPricingTables || includePricingBreakdown) && (
                    <div className="mt-8 border-t-4 border-[#0A52EF] pt-4 flex justify-end">
                        <div className="w-1/2">
                            <div className="flex justify-between items-center py-2 border-b-2 border-black">
                                <span className="font-bold text-sm uppercase text-black">Project Grand Total</span>
                                <span className="font-bold text-lg text-black">
                                    {formatCurrency(isSharedView ? details?.totalAmount || 0 : totals?.finalClientTotal || details?.totalAmount || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isLOI && (
                <>
                    {effectiveShowPaymentTerms && <PaymentTermsSection />}
                    <LegalNotesSection />
                    {effectiveShowSignatureBlock && (
                        <div className="px-4">
                            <SignatureBlock />
                        </div>
                    )}
                </>
            )}

            {!isLOI && showSpecifications && (
                <div className="break-before-page px-4">
                    <SectionHeader title="SPECIFICATIONS" />
                    {screens && screens.length > 0 ? (
                        screens.map((screen: any, idx: number) => (
                            <SpecTable key={idx} screen={screen} />
                        ))
                    ) : (
                        <div className="text-center text-gray-400 italic py-8">No screens configured.</div>
                    )}
                </div>
            )}

            {!isLOI && documentMode === "PROPOSAL" && showExhibitA && (
                <div className="break-before-page px-4">
                    <SectionHeader title="STATEMENT OF WORK" />
                    <div className="space-y-6 text-[10px] leading-relaxed text-gray-700">
                        <section className="break-inside-avoid">
                            <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">1. PHYSICAL INSTALLATION</h4>
                            <div className="px-2 space-y-2">
                                <p>ANC assumes all base building structure is to be provided by others or is existing and is of sufficient capacity to support the proposed display systems.</p>
                                <p>ANC assumes reasonable access will be provided to the installation team and any unknown site conditions such as lane closures, site protection, permitting, etc. is not currently in this proposal.</p>
                            </div>
                        </section>

                        <section className="break-inside-avoid">
                            <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">2. ELECTRICAL & DATA INSTALLATION</h4>
                            <div className="px-2 space-y-2">
                                <p>ANC assumes primary power feed will be provided by others or is existing, within 5' of the display location with sufficient amps; typically 208v 3-phase.</p>
                                <p>ANC will provide data cabling and labor to pull cable from control location to the display(s).</p>
                            </div>
                        </section>

                        <section className="break-inside-avoid">
                            <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">3. CONTROL SYSTEM</h4>
                            <div className="px-2 space-y-2">
                                <p>Installation and commissioning of the ANC vSOFT™ Control System or specified CMS platform.</p>
                                <p>Includes configuration of screen layouts and zones per project specifications.</p>
                            </div>
                        </section>

                        <section className="break-inside-avoid">
                            <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">4. GENERAL CONDITIONS</h4>
                            <div className="px-2 space-y-2">
                                <p>Price includes one (1) round of submittals and engineering shop drawings.</p>
                                <p>ANC has not included bonding of any kind unless specifically noted.</p>
                                <p>Shipping included at current market rates; subject to change due to global logistics impacts.</p>
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {isLOI && (showSpecifications || showExhibitA) && (
                <div className="break-before-page px-4">
                    {(showExhibitA || showSpecifications) && <ExhibitA_TechnicalSpecs data={data} />}

                    {showExhibitA && (
                        <div>
                            <SectionHeader title="STATEMENT OF WORK" />
                            <div className="space-y-6 text-[10px] leading-relaxed text-gray-700">
                                <section className="break-inside-avoid">
                                    <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">1. PHYSICAL INSTALLATION</h4>
                                    <div className="px-2 space-y-2">
                                        <p>ANC assumes all base building structure is to be provided by others or is existing and is of sufficient capacity to support the proposed display systems.</p>
                                        <p>ANC assumes reasonable access will be provided to the installation team and any unknown site conditions such as lane closures, site protection, permitting, etc. is not currently in this proposal.</p>
                                    </div>
                                </section>

                                <section className="break-inside-avoid">
                                    <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">2. ELECTRICAL & DATA INSTALLATION</h4>
                                    <div className="px-2 space-y-2">
                                        <p>ANC assumes primary power feed will be provided by others or is existing, within 5' of the display location with sufficient amps; typically 208v 3-phase.</p>
                                        <p>ANC will provide data cabling and labor to pull cable from control location to the display(s).</p>
                                    </div>
                                </section>

                                <section className="break-inside-avoid">
                                    <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">3. CONTROL SYSTEM</h4>
                                    <div className="px-2 space-y-2">
                                        <p>Installation and commissioning of the ANC vSOFT™ Control System or specified CMS platform.</p>
                                        <p>Includes configuration of screen layouts and zones per project specifications.</p>
                                    </div>
                                </section>

                                <section className="break-inside-avoid">
                                    <h4 className="bg-black text-white font-bold py-1 px-2 mb-2 uppercase">4. GENERAL CONDITIONS</h4>
                                    <div className="px-2 space-y-2">
                                        <p>Price includes one (1) round of submittals and engineering shop drawings.</p>
                                        <p>ANC has not included bonding of any kind unless specifically noted.</p>
                                        <p>Shipping included at current market rates; subject to change due to global logistics impacts.</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isLOI && showExhibitB && (
                <div className="break-before-page px-4">
                    <ExhibitB_CostSchedule data={data} />
                </div>
            )}

            {showCompanyFooter && <CompanyFooter />}

        </ProposalLayout>
    );
};

export default ProposalTemplate2;
