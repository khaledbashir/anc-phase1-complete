/**
 * ProposalTemplate4 - "ANC Premium"
 * 
 * A dramatic, high-impact variant with:
 * - Dark hero header with gradient
 * - Bold, impactful typography
 * - Strong visual hierarchy
 * - Prominent slash patterns (55° brand element)
 * - High contrast sections
 */

import React from "react";

// Components
import { ProposalLayout } from "@/app/components";
import LogoSelectorServer from "@/app/components/reusables/LogoSelectorServer";
import ExhibitA_TechnicalSpecs from "@/app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs";

// Helpers
import { formatNumberWithCommas, formatCurrency } from "@/lib/helpers";
import { resolveDocumentMode } from "@/lib/documentMode";

// Types
import { ProposalType } from "@/types";

interface ProposalTemplate4Props extends ProposalType {
    forceWhiteLogo?: boolean;
    screens?: any[];
    isSharedView?: boolean;
}

const ProposalTemplate4 = (data: ProposalTemplate4Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens: screensProp, isSharedView = false } = data;
    const screens = screensProp || details?.screens || [];
    const internalAudit = details?.internalAudit as any;
    const totals = internalAudit?.totals;

    const documentMode = resolveDocumentMode(details);
    const docLabel = documentMode === "BUDGET" ? "BUDGET ESTIMATE" : documentMode === "PROPOSAL" ? "PROPOSAL" : "LETTER OF INTENT";
    const isLOI = documentMode === "LOI";

    const purchaserName = receiver?.name || "Client";
    const purchaserAddress = (() => {
        const parts = [receiver?.address, receiver?.city, receiver?.zipCode].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "";
    })();

    const specsSectionTitle = ((details as any)?.specsSectionTitle || "").trim() || "SPECIFICATIONS";

    // Bold color palette
    const colors = {
        primary: "#0A52EF",
        dark: "#0F172A",
        accent: "#3B82F6",
        gold: "#F59E0B",
        text: "#111827",
        textMuted: "#6B7280",
        white: "#FFFFFF",
        surface: "#F8FAFC",
    };

    const getScreenHeader = (screen: any) => {
        return (screen?.customDisplayName || screen?.externalName || screen?.name || "Display").toString().trim();
    };

    const buildDescription = (screen: any) => {
        const heightFt = screen?.heightFt ?? screen?.height;
        const widthFt = screen?.widthFt ?? screen?.width;
        const pitchMm = screen?.pitchMm ?? screen?.pixelPitch;
        const qty = screen?.quantity || 1;
        const brightness = screen?.brightnessNits ?? screen?.brightness;
        const parts: string[] = [];
        if (heightFt && widthFt) parts.push(`${Number(heightFt).toFixed(1)}' H × ${Number(widthFt).toFixed(1)}' W`);
        if (pitchMm) parts.push(`${pitchMm}mm pitch`);
        if (brightness) parts.push(`${formatNumberWithCommas(brightness)} nits`);
        if (qty > 1) parts.push(`QTY ${qty}`);
        return parts.join(" | ");
    };

    // Bold Slash Pattern (55° angle per ANC brand)
    const SlashPattern = ({ count = 7, light = false }: { count?: number; light?: boolean }) => (
        <div className="flex gap-1.5">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="w-3 h-10"
                    style={{
                        background: light 
                            ? `linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)`
                            : `linear-gradient(145deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                        transform: "skewX(-35deg)",
                    }}
                />
            ))}
        </div>
    );

    // Bold Section Divider
    const SectionDivider = ({ title }: { title: string }) => (
        <div className="mt-12 mb-8 flex items-center gap-4">
            <div className="flex-1 h-1 rounded-full" style={{ background: colors.dark }} />
            <h2 className="text-lg font-black tracking-[0.3em] uppercase" style={{ color: colors.dark }}>{title}</h2>
            <div className="flex-1 h-1 rounded-full" style={{ background: colors.dark }} />
        </div>
    );

    // Bold Spec Table
    const BoldSpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-8 break-inside-avoid">
            {/* Header with gradient */}
            <div 
                className="px-6 py-4 flex justify-between items-center"
                style={{ background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.primary} 100%)` }}
            >
                <h3 className="font-black text-base uppercase tracking-widest text-white">
                    {getScreenHeader(screen)}
                </h3>
                <SlashPattern count={3} light />
            </div>
            
            {/* Specs Grid */}
            <div className="border-x-2 border-b-2" style={{ borderColor: colors.dark }}>
                {[
                    { label: "PIXEL PITCH", value: `${screen.pitchMm ?? screen.pixelPitch ?? 0} mm`, highlight: true },
                    { label: "QUANTITY", value: screen.quantity || 1 },
                    { label: "DISPLAY HEIGHT", value: `${Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'` },
                    { label: "DISPLAY WIDTH", value: `${Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'` },
                    { label: "RESOLUTION (H)", value: `${screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} px` },
                    { label: "RESOLUTION (W)", value: `${screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} px` },
                    ...(screen.brightnessNits || screen.brightness ? [{ label: "BRIGHTNESS", value: `${formatNumberWithCommas(screen.brightnessNits || screen.brightness)} nits`, highlight: true }] : []),
                ].map((item: any, idx) => (
                    <div 
                        key={idx} 
                        className={`flex justify-between px-6 py-3 text-sm ${idx % 2 === 0 ? '' : ''}`}
                        style={{ background: idx % 2 === 0 ? colors.surface : colors.white }}
                    >
                        <span className="font-bold uppercase tracking-wider text-xs" style={{ color: colors.textMuted }}>{item.label}</span>
                        <span 
                            className="font-black"
                            style={{ color: item.highlight ? colors.primary : colors.text }}
                        >
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    // Bold Pricing Section
    const BoldPricingSection = () => {
        const softCostItems = internalAudit?.softCostItems || [];
        const lineItems = [
            ...(screens || []).map((screen: any, idx: number) => {
                const auditRow = isSharedView ? null : internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                const price = auditRow?.breakdown?.sellPrice || auditRow?.breakdown?.finalClientTotal || 0;
                return { key: `screen-${idx}`, name: getScreenHeader(screen), description: buildDescription(screen), price: Number(price) || 0 };
            }).filter((it) => Math.abs(it.price) >= 0.01),
            ...softCostItems.map((item: any, idx: number) => ({
                key: `soft-${idx}`,
                name: (item?.name || "").toString().toUpperCase(),
                description: "",
                price: Number(item?.sell || 0),
            })).filter((it: any) => Math.abs(it.price) >= 0.01),
        ];
        const total = lineItems.reduce((sum, it) => sum + it.price, 0);

        return (
            <div className="mt-8">
                {lineItems.map((item, idx) => (
                    <div 
                        key={item.key} 
                        className={`flex justify-between items-start py-5 px-6 border-l-4 mb-4`}
                        style={{ 
                            borderLeftColor: colors.primary,
                            background: idx % 2 === 0 ? colors.surface : colors.white 
                        }}
                    >
                        <div>
                            <div className="font-black uppercase tracking-wide" style={{ color: colors.text }}>{item.name}</div>
                            {item.description && <div className="text-xs mt-1" style={{ color: colors.textMuted }}>{item.description}</div>}
                        </div>
                        <div className="font-black text-xl" style={{ color: colors.text }}>
                            {formatCurrency(item.price)}
                        </div>
                    </div>
                ))}
                
                {/* Total */}
                <div 
                    className="mt-6 p-6 flex justify-between items-center"
                    style={{ background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.primary} 100%)` }}
                >
                    <div className="flex items-center gap-4">
                        <SlashPattern count={4} light />
                        <span className="font-black text-lg uppercase tracking-[0.2em] text-white">PROJECT TOTAL</span>
                    </div>
                    <span className="font-black text-3xl text-white">{formatCurrency(total)}</span>
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
                <SectionDivider title="Payment Terms" />
                <div className="space-y-2">
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-2 h-2" style={{ background: colors.primary, transform: "rotate(45deg)" }} />
                            <span className="text-sm" style={{ color: colors.text }}>{line}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const LegalNotesSection = () => {
        const raw = (details?.additionalNotes || "").toString().trim();
        if (!raw) return null;
        return (
            <div className="mt-10">
                <SectionDivider title="Notes" />
                <div className="text-sm leading-relaxed whitespace-pre-wrap p-6 border-2" style={{ borderColor: colors.dark, color: colors.text }}>
                    {raw}
                </div>
            </div>
        );
    };

    const BoldSignatureBlock = () => (
        <div className="mt-16 break-inside-avoid">
            <div className="text-sm leading-relaxed mb-10 p-6" style={{ background: colors.surface, color: colors.textMuted }}>
                {((details as any)?.signatureBlockText || "").trim() || 
                    `Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein and authorize ANC to commence production.`}
            </div>
            
            <div className="grid grid-cols-2 gap-8">
                {[
                    { title: "ANC SPORTS ENTERPRISES, LLC" },
                    { title: (receiver?.name || "PURCHASER").toUpperCase() }
                ].map((party, idx) => (
                    <div key={idx} className="border-2 p-6" style={{ borderColor: colors.dark }}>
                        <div 
                            className="font-black text-sm tracking-widest uppercase mb-6 pb-3 border-b-2"
                            style={{ color: colors.primary, borderColor: colors.primary }}
                        >
                            {party.title}
                        </div>
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs uppercase tracking-wider font-bold" style={{ color: colors.textMuted }}>Signature</span>
                                <div className="mt-2 h-12 border-b-2" style={{ borderColor: colors.dark }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs uppercase tracking-wider font-bold" style={{ color: colors.textMuted }}>Name</span>
                                    <div className="mt-2 h-8 border-b" style={{ borderColor: colors.textMuted }} />
                                </div>
                                <div>
                                    <span className="text-xs uppercase tracking-wider font-bold" style={{ color: colors.textMuted }}>Date</span>
                                    <div className="mt-2 h-8 border-b" style={{ borderColor: colors.textMuted }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const BoldFooter = () => (
        <div className="mt-16 pt-8 border-t-4" style={{ borderColor: colors.dark }}>
            <div className="flex justify-between items-center">
                <div>
                    <div className="font-black text-xs tracking-[0.2em] uppercase" style={{ color: colors.dark }}>ANC Sports Enterprises, LLC</div>
                    <div className="text-xs mt-1" style={{ color: colors.textMuted }}>2 Manhattanville Road, Suite 402 · Purchase, NY 10577 · anc.com</div>
                </div>
                <SlashPattern count={5} />
            </div>
        </div>
    );

    const showPaymentTerms = (details as any)?.showPaymentTerms ?? true;
    const showSignatureBlock = (details as any)?.showSignatureBlock ?? true;
    const showSpecifications = (details as any)?.showSpecifications ?? true;
    const showExhibitA = (details as any)?.showExhibitA ?? false;

    return (
        <ProposalLayout data={data} disableFixedFooter>
            {/* Hero Header */}
            <div 
                className="px-8 py-10 mb-8"
                style={{ background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.primary} 100%)` }}
            >
                <div className="flex justify-between items-start">
                    <LogoSelectorServer theme="dark" width={160} height={80} />
                    <SlashPattern count={8} light />
                </div>
                <div className="mt-8">
                    <div className="text-sm uppercase tracking-[0.4em] font-medium text-white/60 mb-2">{docLabel}</div>
                    <h1 className="text-4xl font-black uppercase tracking-wide text-white leading-tight">
                        {receiver?.name || "Client Name"}
                    </h1>
                    {details?.proposalName && (
                        <div className="text-lg mt-2 text-white/80">{details.proposalName}</div>
                    )}
                </div>
            </div>

            {/* Intro */}
            <div className="px-8 mb-10">
                <div className="text-sm leading-relaxed" style={{ color: colors.text }}>
                    {documentMode === "LOI" ? (
                        <p className="text-justify">
                            This Sales Quotation establishes the terms by which <strong>{purchaserName}</strong>
                            {purchaserAddress && ` (${purchaserAddress})`} and <strong>ANC Sports Enterprises, LLC</strong> agree 
                            to the LED Display System defined in this document.
                        </p>
                    ) : (
                        <p>
                            ANC is pleased to present this {documentMode.toLowerCase()} for <strong>{purchaserName}</strong> 
                            {details?.proposalName && ` regarding ${details.proposalName}`}.
                        </p>
                    )}
                </div>
            </div>

            {/* Pricing */}
            {!isLOI && (
                <div className="px-8">
                    <SectionDivider title="Project Pricing" />
                    <BoldPricingSection />
                </div>
            )}

            {/* LOI Sections */}
            {isLOI && (
                <div className="px-8">
                    <LegalNotesSection />
                    {showPaymentTerms && <PaymentTermsSection />}
                    {showSignatureBlock && <BoldSignatureBlock />}
                </div>
            )}

            {/* Specifications */}
            {!isLOI && showSpecifications && screens.length > 0 && (
                <div className="px-8 break-before-page">
                    <SectionDivider title={specsSectionTitle} />
                    {screens.map((screen: any, idx: number) => (
                        <BoldSpecTable key={idx} screen={screen} />
                    ))}
                </div>
            )}

            {/* LOI Exhibit A */}
            {isLOI && showExhibitA && (
                <div className="break-before-page px-8">
                    <ExhibitA_TechnicalSpecs data={data} />
                </div>
            )}

            {/* LOI Exhibit B */}
            {isLOI && (details as any)?.scopeOfWorkText && (
                <div className="break-before-page px-8">
                    <SectionDivider title="Exhibit B – Scope of Work" />
                    <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: colors.text }}>
                        {(details as any).scopeOfWorkText}
                    </div>
                </div>
            )}

            <div className="px-8">
                <BoldFooter />
            </div>
        </ProposalLayout>
    );
};

export default ProposalTemplate4;
