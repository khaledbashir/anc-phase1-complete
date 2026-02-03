/**
 * ProposalTemplate4 - "ANC Premium"
 * 
 * A sophisticated, professional premium variant with:
 * - Elegant header with refined typography
 * - Premium color palette with subtle accents
 * - Professional spacing and layout
 * - Refined visual hierarchy
 * - Corporate-grade presentation
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

    // Premium professional color palette
    const colors = {
        primary: "#0A52EF",
        primaryDark: "#002C73",
        accent: "#3B82F6",
        gold: "#D4AF37",
        text: "#1A1F2E",
        textMuted: "#64748B",
        textLight: "#94A3B8",
        white: "#FFFFFF",
        surface: "#FAFBFC",
        border: "#E2E8F0",
        borderLight: "#F1F5F9",
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

    // Premium Section Divider - Elegant and professional
    const SectionDivider = ({ title }: { title: string }) => (
        <div className="mt-16 mb-10">
            <div className="flex items-center gap-4 mb-3">
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${colors.primary} 0%, transparent 100%)` }} />
                <div className="w-2 h-2 rounded-full" style={{ background: colors.primary }} />
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${colors.border} 100%)` }} />
            </div>
            <h2 className="text-2xl font-bold tracking-wide" style={{ color: colors.text, letterSpacing: "0.05em" }}>
                {title}
            </h2>
        </div>
    );

    // Premium Spec Table - Professional and elegant
    const BoldSpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-10 break-inside-avoid" style={{ 
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
            {/* Header */}
            <div 
                className="px-8 py-5"
                style={{ 
                    background: colors.primary,
                    borderBottom: `2px solid ${colors.primaryDark}`
                }}
            >
                <h3 className="text-lg font-bold tracking-wide text-white" style={{ letterSpacing: "0.05em" }}>
                    {getScreenHeader(screen)}
                </h3>
            </div>
            
            {/* Specs Grid */}
            <div>
                {[
                    { label: "Pixel Pitch", value: `${screen.pitchMm ?? screen.pixelPitch ?? 0} mm`, highlight: true },
                    { label: "Quantity", value: screen.quantity || 1 },
                    { label: "Display Height", value: `${Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'` },
                    { label: "Display Width", value: `${Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'` },
                    { label: "Resolution (H)", value: `${screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} px` },
                    { label: "Resolution (W)", value: `${screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} px` },
                    ...(screen.brightnessNits || screen.brightness ? [{ label: "Brightness", value: `${formatNumberWithCommas(screen.brightnessNits || screen.brightness)} nits`, highlight: true }] : []),
                ].map((item: any, idx) => (
                    <div 
                        key={idx} 
                        className="flex justify-between items-center px-8 py-4 border-b"
                        style={{ 
                            background: idx % 2 === 0 ? colors.white : colors.surface,
                            borderColor: colors.borderLight
                        }}
                    >
                        <span className="text-sm font-medium" style={{ color: colors.textMuted }}>{item.label}</span>
                        <span 
                            className="text-base font-bold"
                            style={{ color: item.highlight ? colors.primary : colors.text }}
                        >
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    // Premium Pricing Section - Professional layout
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
                name: (item?.name || "").toString(),
                description: "",
                price: Number(item?.sell || 0),
            })).filter((it: any) => Math.abs(it.price) >= 0.01),
        ];
        const total = lineItems.reduce((sum, it) => sum + it.price, 0);

        return (
            <div className="mt-8" style={{
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
                {lineItems.map((item, idx) => (
                    <div 
                        key={item.key} 
                        className="flex justify-between items-start py-6 px-8 border-b"
                        style={{ 
                            borderColor: colors.borderLight,
                            background: idx % 2 === 0 ? colors.white : colors.surface 
                        }}
                    >
                        <div className="flex-1">
                            <div className="text-base font-semibold mb-1" style={{ color: colors.text }}>{item.name}</div>
                            {item.description && (
                                <div className="text-sm mt-1" style={{ color: colors.textMuted }}>{item.description}</div>
                            )}
                        </div>
                        <div className="text-xl font-bold ml-6" style={{ color: colors.text }}>
                            {formatCurrency(item.price)}
                        </div>
                    </div>
                ))}
                
                {/* Total */}
                <div 
                    className="px-8 py-6 flex justify-between items-center"
                    style={{ 
                        background: colors.primary,
                        borderTop: `2px solid ${colors.primaryDark}`
                    }}
                >
                    <span className="text-lg font-bold tracking-wide text-white uppercase" style={{ letterSpacing: "0.1em" }}>
                        Project Total
                    </span>
                    <span className="text-3xl font-bold text-white">{formatCurrency(total)}</span>
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
                <div className="space-y-3 pl-2">
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.primary }} />
                            <span className="text-sm leading-relaxed" style={{ color: colors.text }}>{line}</span>
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
                <SectionDivider title="Additional Notes" />
                <div 
                    className="text-sm leading-relaxed whitespace-pre-wrap p-8 rounded-lg" 
                    style={{ 
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        color: colors.text 
                    }}
                >
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
        <div className="mt-16 pt-8 border-t" style={{ borderColor: colors.border }}>
            <div className="flex justify-between items-center">
                <div>
                    <div className="font-bold text-xs tracking-wide uppercase" style={{ color: colors.text }}>ANC Sports Enterprises, LLC</div>
                    <div className="text-xs mt-1.5" style={{ color: colors.textMuted }}>2 Manhattanville Road, Suite 402 · Purchase, NY 10577 · anc.com</div>
                </div>
            </div>
        </div>
    );

    const showPaymentTerms = (details as any)?.showPaymentTerms ?? true;
    const showSignatureBlock = (details as any)?.showSignatureBlock ?? true;
    const showSpecifications = (details as any)?.showSpecifications ?? true;
    const showExhibitA = (details as any)?.showExhibitA ?? false;

    return (
        <ProposalLayout data={data} disableFixedFooter>
            {/* Premium Header */}
            <div 
                className="px-10 py-12 mb-12"
                style={{ 
                    background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%)`,
                    borderRadius: "0 0 12px 12px"
                }}
            >
                <div className="flex justify-between items-start mb-10">
                    <LogoSelectorServer theme="dark" width={180} height={90} />
                </div>
                <div>
                    <div className="text-xs uppercase tracking-[0.3em] font-medium text-white/70 mb-3">{docLabel}</div>
                    <h1 className="text-4xl font-bold text-white leading-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
                        {receiver?.name || "Client Name"}
                    </h1>
                    {details?.proposalName && (
                        <div className="text-base mt-2 text-white/90 font-medium">{details.proposalName}</div>
                    )}
                </div>
            </div>

            {/* Intro */}
            <div className="px-10 mb-12">
                <div className="text-base leading-relaxed max-w-3xl" style={{ color: colors.text }}>
                    {documentMode === "LOI" ? (
                        <p className="text-justify">
                            This Sales Quotation establishes the terms by which <strong style={{ color: colors.text }}>{purchaserName}</strong>
                            {purchaserAddress && ` (${purchaserAddress})`} and <strong style={{ color: colors.text }}>ANC Sports Enterprises, LLC</strong> agree 
                            to the LED Display System defined in this document.
                        </p>
                    ) : (
                        <p>
                            ANC is pleased to present this {documentMode.toLowerCase()} for <strong style={{ color: colors.text }}>{purchaserName}</strong> 
                            {details?.proposalName && ` regarding ${details.proposalName}`}.
                        </p>
                    )}
                </div>
            </div>

            {/* Pricing */}
            {!isLOI && (
                <div className="px-10">
                    <SectionDivider title="Project Pricing" />
                    <BoldPricingSection />
                </div>
            )}

            {/* LOI Sections */}
            {isLOI && (
                <div className="px-10">
                    <LegalNotesSection />
                    {showPaymentTerms && <PaymentTermsSection />}
                    {showSignatureBlock && <BoldSignatureBlock />}
                </div>
            )}

            {/* Specifications */}
            {!isLOI && showSpecifications && screens.length > 0 && (
                <div className="px-10 break-before-page">
                    <SectionDivider title={specsSectionTitle} />
                    {screens.map((screen: any, idx: number) => (
                        <BoldSpecTable key={idx} screen={screen} />
                    ))}
                </div>
            )}

            {/* LOI Exhibit A */}
            {isLOI && showExhibitA && (
                <div className="break-before-page px-10">
                    <ExhibitA_TechnicalSpecs data={data} />
                </div>
            )}

            {/* LOI Exhibit B */}
            {isLOI && (details as any)?.scopeOfWorkText && (
                <div className="break-before-page px-10">
                    <SectionDivider title="Exhibit B – Scope of Work" />
                    <div 
                        className="text-sm leading-relaxed whitespace-pre-wrap p-6 rounded-lg" 
                        style={{ 
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            color: colors.text 
                        }}
                    >
                        {(details as any).scopeOfWorkText}
                    </div>
                </div>
            )}

            <div className="px-10">
                <BoldFooter />
            </div>
        </ProposalLayout>
    );
};

export default ProposalTemplate4;
