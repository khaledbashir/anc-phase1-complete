/**
 * ProposalTemplate3 - "ANC Modern"
 * 
 * A clean, minimalist variant with:
 * - Larger whitespace
 * - Subtle accent colors
 * - Modern typography with thin weights
 * - Card-style sections
 * - Gradient accent touches
 */

import React from "react";

// Components
import { ProposalLayout } from "@/app/components";
import LogoSelectorServer from "@/app/components/reusables/LogoSelectorServer";
import ExhibitA_TechnicalSpecs from "@/app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs";

// Helpers
import { formatNumberWithCommas, formatCurrency, sanitizeNitsForDisplay, normalizePitch } from "@/lib/helpers";
import { resolveDocumentMode } from "@/lib/documentMode";

// Types
import { ProposalType } from "@/types";

interface ProposalTemplate3Props extends ProposalType {
    forceWhiteLogo?: boolean;
    screens?: any[];
    isSharedView?: boolean;
}

const ProposalTemplate3 = (data: ProposalTemplate3Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens: screensProp, isSharedView = false } = data;
    const screens = screensProp || details?.screens || [];
    const internalAudit = details?.internalAudit as any;
    const totals = internalAudit?.totals;

    const documentMode = resolveDocumentMode(details);
    const docLabel = documentMode === "BUDGET" ? "Budget Estimate" : documentMode === "PROPOSAL" ? "Proposal" : "Letter of Intent";
    const isLOI = documentMode === "LOI";

    const purchaserName = receiver?.name || "Client";
    const purchaserAddress = (() => {
        const address = receiver?.address;
        const city = receiver?.city;
        const zip = receiver?.zipCode;
        const parts = [address, city, zip].filter(Boolean) as string[];
        if (parts.length === 0) return "";
        return parts.join(", ");
    })();

    const ancAddress = sender?.address || "2 Manhattanville Road, Suite 402, Purchase, NY 10577";
    const specsSectionTitle = ((details as any)?.specsSectionTitle || "").trim() || "Specifications";

    // Modern color palette
    const colors = {
        primary: "#0A52EF",
        primaryLight: "#E8F0FE",
        accent: "#6366F1",
        text: "#1F2937",
        textLight: "#6B7280",
        border: "#E5E7EB",
        surface: "#F9FAFB",
    };

    const getScreenHeader = (screen: any) => {
        const customName = (screen?.customDisplayName || "").toString().trim();
        if (customName) return sanitizeNitsForDisplay(customName);
        const externalName = (screen?.externalName || "").toString().trim();
        if (externalName) return sanitizeNitsForDisplay(externalName);
        return sanitizeNitsForDisplay((screen?.name || "Display").toString().trim()) || "Display";
    };

    const buildDescription = (screen: any) => {
        const heightFt = screen?.heightFt ?? screen?.height;
        const widthFt = screen?.widthFt ?? screen?.width;
        const pitchMm = screen?.pitchMm ?? screen?.pixelPitch;
        const qty = screen?.quantity || 1;
        const brightness = screen?.brightnessNits ?? screen?.brightness;
        const parts: string[] = [];
        if (heightFt && widthFt && Number(heightFt) > 0 && Number(widthFt) > 0) {
            parts.push(`${Number(heightFt).toFixed(1)}' × ${Number(widthFt).toFixed(1)}'`);
        }
        if (pitchMm && Number(pitchMm) > 0) parts.push(`${pitchMm}mm`);
        if (brightness && Number(brightness) > 0) parts.push(`${formatNumberWithCommas(brightness)} Brightness`);
        if (qty > 1) parts.push(`×${qty}`);
        return parts.join(" · ");
    };

    // Modern Section Header
    const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
        <div className="mb-8 mt-12">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-6 rounded-full" style={{ background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.accent} 100%)` }} />
                <h2 className="text-lg font-semibold tracking-wide uppercase" style={{ color: colors.text }}>{title}</h2>
            </div>
            {subtitle && <p className="text-sm ml-4" style={{ color: colors.textLight }}>{subtitle}</p>}
        </div>
    );

    // Modern Spec Card
    const SpecCard = ({ screen }: { screen: any }) => (
        <div className="mb-6 rounded-lg overflow-hidden border break-inside-avoid" style={{ borderColor: colors.border, background: colors.surface }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: colors.border, background: colors.primaryLight }}>
                <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: colors.primary }}>
                    {getScreenHeader(screen)}
                </h3>
            </div>
            <div className="grid grid-cols-2 text-xs">
                {(() => { const sp = normalizePitch(screen.pitchMm ?? screen.pixelPitch) || 10; return [
                    { label: "Pixel Pitch", value: `${sp < 2 ? sp.toFixed(2) : (sp % 1 === 0 ? sp.toFixed(0) : sp.toFixed(2))}mm` },
                    { label: "Quantity", value: screen.quantity || 1 },
                    { label: "Height", value: `${Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'` },
                    { label: "Width", value: `${Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'` },
                    { label: "Resolution (H)", value: `${screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / sp) || 0}px` },
                    { label: "Resolution (W)", value: `${screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / sp) || 0}px` },
                    ...(screen.brightnessNits || screen.brightness ? [{ label: "Brightness", value: `${formatNumberWithCommas(screen.brightnessNits || screen.brightness)} Brightness` }] : []),
                ]; })()
                    .filter((item) => !/Pixel\s*Density|HDR\s*Status/i.test(item.label))
                    .map((item, idx) => (
                    <div key={idx} className={`px-5 py-2.5 flex justify-between break-inside-avoid ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''}`} style={{ borderColor: colors.border }}>
                        <span style={{ color: colors.textLight }}>{item.label}</span>
                        <span className="font-medium" style={{ color: colors.text }}>{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // Modern Pricing Row
    const PricingSection = () => {
        const softCostItems = internalAudit?.softCostItems || [];
        const lineItems = [
            ...(screens || []).map((screen: any, idx: number) => {
                const auditRow = isSharedView ? null : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                const price = auditRow?.breakdown?.sellPrice || auditRow?.breakdown?.finalClientTotal || 0;
                return {
                    key: `screen-${idx}`,
                    name: getScreenHeader(screen),
                    description: buildDescription(screen),
                    price: Number(price) || 0,
                };
            }).filter((it) => Math.abs(it.price) >= 0.01),
            ...softCostItems.map((item: any, idx: number) => ({
                key: `soft-${idx}`,
                name: (item?.name || "Item").toString().toUpperCase(),
                description: (item?.description || "").toString(),
                price: Number(item?.sell || 0),
            })).filter((it: any) => Math.abs(it.price) >= 0.01),
        ];
        const subtotal = lineItems.reduce((sum, it) => sum + it.price, 0);

        return (
            <div className="mt-8">
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                    {/* Header */}
                    <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ background: colors.surface, color: colors.textLight }}>
                        <div className="col-span-7">Description</div>
                        <div className="col-span-5 text-right">Amount</div>
                    </div>
                    
                    {/* Items */}
                    {lineItems.map((item, idx) => (
                        <div key={item.key} className={`grid grid-cols-12 px-5 py-4 border-t ${idx % 2 === 1 ? '' : ''}`} style={{ borderColor: colors.border }}>
                            <div className="col-span-7">
                                <div className="font-medium text-sm" style={{ color: colors.text }}>{item.name}</div>
                                {item.description && <div className="text-xs mt-0.5" style={{ color: colors.textLight }}>{item.description}</div>}
                            </div>
                            <div className="col-span-5 text-right font-semibold text-sm" style={{ color: colors.text }}>
                                {formatCurrency(item.price)}
                            </div>
                        </div>
                    ))}
                    
                    {/* Total */}
                    <div className="grid grid-cols-12 px-5 py-4 border-t-2" style={{ borderColor: colors.primary, background: colors.primaryLight }}>
                        <div className="col-span-7 font-bold text-sm uppercase tracking-wide" style={{ color: colors.primary }}>Project Total</div>
                        <div className="col-span-5 text-right font-bold text-lg" style={{ color: colors.primary }}>
                            {formatCurrency(subtotal)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const PaymentTermsSection = () => {
        const raw = (details?.paymentTerms || "").toString();
        const lines = raw.split(/\r?\n|,/g).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        return (
            <div className="mt-10">
                <SectionHeader title="Payment Terms" />
                <div className="rounded-lg p-5 text-sm leading-relaxed" style={{ background: colors.surface, color: colors.textLight }}>
                    {lines.map((line, idx) => <div key={idx} className="py-1">{line}</div>)}
                </div>
            </div>
        );
    };

    const LegalNotesSection = () => {
        const raw = (details?.additionalNotes || "").toString().trim();
        if (!raw) return null;
        return (
            <div className="mt-10">
                <SectionHeader title="Additional Notes" />
                <div className="rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: colors.surface, color: colors.textLight }}>
                    {raw}
                </div>
            </div>
        );
    };

    const SignatureBlock = () => (
        <div className="mt-16 break-inside-avoid">
            <div className="text-xs leading-relaxed text-justify mb-10" style={{ color: colors.textLight }}>
                {((details as any)?.signatureBlockText || "").trim() || 
                    `Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein.`}
            </div>
            <div className="grid grid-cols-2 gap-12">
                {[
                    { title: "ANC Sports Enterprises, LLC", subtitle: "Seller" },
                    { title: receiver?.name || "Purchaser", subtitle: "Purchaser" }
                ].map((party, idx) => (
                    <div key={idx} className="space-y-6">
                        <div>
                            <div className="font-semibold text-sm" style={{ color: colors.primary }}>{party.title}</div>
                            <div className="text-xs" style={{ color: colors.textLight }}>{party.subtitle}</div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.textLight }}>Signature</div>
                            <div className="h-10 border-b-2" style={{ borderColor: colors.text }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.textLight }}>Name</div>
                                <div className="h-8 border-b" style={{ borderColor: colors.border }} />
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.textLight }}>Date</div>
                                <div className="h-8 border-b" style={{ borderColor: colors.border }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const Footer = () => (
        <div className="mt-16 pt-6 border-t text-center" style={{ borderColor: colors.border }}>
            <div className="text-xs tracking-wider uppercase" style={{ color: colors.textLight }}>ANC Sports Enterprises, LLC</div>
            <div className="text-xs mt-1" style={{ color: colors.textLight }}>2 Manhattanville Road, Suite 402, Purchase, NY 10577 · anc.com</div>
            <div className="flex justify-center gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-6 h-1 rounded-full opacity-20" style={{ background: colors.primary, transform: `skewX(-20deg)` }} />
                ))}
            </div>
        </div>
    );

    const showPaymentTerms = (details as any)?.showPaymentTerms ?? true;
    const showSignatureBlock = (details as any)?.showSignatureBlock ?? true;
    const showSpecifications = (details as any)?.showSpecifications ?? true;
    const showExhibitA = (details as any)?.showExhibitA ?? false;

    return (
        <ProposalLayout data={data} disableFixedFooter>
            {/* Header */}
            <div className="flex justify-between items-center px-6 pt-8 pb-6 mb-8 border-b" style={{ borderColor: colors.border }}>
                <LogoSelectorServer theme="light" width={140} height={70} />
                <div className="text-right">
                    <div className="text-xs uppercase tracking-widest font-medium" style={{ color: colors.textLight }}>{docLabel}</div>
                    <h1 className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{receiver?.name || "Client Name"}</h1>
                    {details?.proposalName && <div className="text-sm mt-1" style={{ color: colors.textLight }}>{details.proposalName}</div>}
                </div>
            </div>

            {/* Intro */}
            <div className="px-6 mb-8">
                <div className="text-sm leading-relaxed" style={{ color: colors.textLight }}>
                    {documentMode === "LOI" ? (
                        <p className="text-justify">
                            This document sets forth the terms by which <strong style={{ color: colors.text }}>{purchaserName}</strong>
                            {purchaserAddress && <span> located at {purchaserAddress}</span>} and <strong style={{ color: colors.text }}>ANC Sports Enterprises, LLC</strong> agree 
                            to the LED Display System described below.
                        </p>
                    ) : (
                        <p>
                            ANC is pleased to present the following {documentMode.toLowerCase()} for <strong style={{ color: colors.text }}>{purchaserName}</strong>.
                        </p>
                    )}
                </div>
            </div>

            {/* Pricing */}
            {!isLOI && (
                <div className="px-6">
                    <SectionHeader title="Project Pricing" subtitle={`${screens.length} display system${screens.length !== 1 ? 's' : ''}`} />
                    <PricingSection />
                </div>
            )}

            {/* LOI Sections */}
            {isLOI && (
                <div className="px-6">
                    <LegalNotesSection />
                    {showPaymentTerms && <PaymentTermsSection />}
                    {showSignatureBlock && <SignatureBlock />}
                </div>
            )}

            {/* Specifications */}
            {!isLOI && showSpecifications && screens.length > 0 && (
                <div className="px-6 break-before-page">
                    <SectionHeader title={specsSectionTitle} subtitle="Technical details for each display" />
                    {screens.map((screen: any, idx: number) => (
                        <SpecCard key={idx} screen={screen} />
                    ))}
                </div>
            )}

            {/* LOI Exhibit A */}
            {isLOI && showExhibitA && (
                <div className="break-before-page px-6">
                    <ExhibitA_TechnicalSpecs data={data} />
                </div>
            )}

            {/* LOI Exhibit B - Scope of Work */}
            {isLOI && (details as any)?.scopeOfWorkText && (
                <div className="break-before-page px-6">
                    <SectionHeader title="Exhibit B – Scope of Work" />
                    <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: colors.textLight }}>
                        {(details as any).scopeOfWorkText}
                    </div>
                </div>
            )}

            <Footer />
        </ProposalLayout>
    );
};

export default ProposalTemplate3;
