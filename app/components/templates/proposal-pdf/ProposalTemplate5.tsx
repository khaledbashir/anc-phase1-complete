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

// Helpers
import { formatNumberWithCommas, formatCurrency } from "@/lib/helpers";
import { resolveDocumentMode } from "@/lib/documentMode";

// Types
import { ProposalType } from "@/types";

// Styles
import { PDF_COLORS } from "./PdfStyles";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";

interface ProposalTemplate5Props extends ProposalType {
    forceWhiteLogo?: boolean;
    screens?: any[];
    isSharedView?: boolean;
}

const ProposalTemplate5 = (data: ProposalTemplate5Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens: screensProp, isSharedView = false } = data;
    const screens = screensProp || details?.screens || [];
    const internalAudit = details?.internalAudit as any;
    const totals = internalAudit?.totals;

    const documentMode = resolveDocumentMode(details);
    const docLabel = documentMode === "BUDGET" ? "BUDGET ESTIMATE" : documentMode === "PROPOSAL" ? "SALES QUOTATION" : "LETTER OF INTENT";
    const isLOI = documentMode === "LOI";

    const purchaserName = receiver?.name || "Client";
    const purchaserAddress = (() => {
        const parts = [receiver?.address, receiver?.city, receiver?.zipCode].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "";
    })();

    const ancAddress = sender?.address || "2 Manhattanville Road, Suite 402, Purchase, NY 10577";
    const specsSectionTitle = ((details as any)?.specsSectionTitle || "").trim() || "TECHNICAL SPECIFICATIONS";

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
    const showExhibitA = (details as any)?.showExhibitA ?? false;

    // ===== HELPERS =====
    const getScreenHeader = (screen: any) => {
        return (screen?.customDisplayName || screen?.externalName || screen?.name || "Display").toString().trim();
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
        if (pitchMm && Number(pitchMm) > 0) parts.push(`${pitchMm}mm pitch`);
        if (brightness && Number(brightness) > 0) parts.push(`${formatNumberWithCommas(brightness)} nits`);
        if (qty > 1) parts.push(`QTY ${qty}`);
        return parts.join(" · ");
    };

    // ===== COMPONENTS =====

    // Hybrid Section Header - Clean Modern style
    const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
        <div className="mb-6 mt-8 break-inside-avoid">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.accent} 100%)` }} />
                <h2 className="text-base font-bold tracking-wide uppercase" style={{ color: colors.text }}>{title}</h2>
            </div>
            {subtitle && <p className="text-xs ml-4" style={{ color: colors.textMuted }}>{subtitle}</p>}
        </div>
    );

    // Hybrid Spec Table - Modern styling with blue headers, zebra striping
    const SpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-6 rounded-lg overflow-hidden border break-inside-avoid" style={{ borderColor: colors.border, background: colors.white }}>
            {/* Blue Header */}
            <div className="px-4 py-2.5 border-b break-inside-avoid" style={{ borderColor: colors.primary, background: colors.primary }}>
                <h3 className="font-bold text-xs uppercase tracking-wide text-white">
                    {getScreenHeader(screen)}
                </h3>
            </div>
            {/* Two-column layout with zebra striping */}
            <div className="grid grid-cols-2 text-xs">
                {[
                    { label: "Pixel Pitch", value: `${screen.pitchMm ?? screen.pixelPitch ?? 0}mm` },
                    { label: "Quantity", value: screen.quantity || 1 },
                    { label: "Height", value: `${Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'` },
                    { label: "Width", value: `${Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'` },
                    { label: "Resolution (H)", value: `${screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0}px` },
                    { label: "Resolution (W)", value: `${screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0}px` },
                    ...(screen.brightnessNits || screen.brightness ? [{ label: "Brightness", value: `${formatNumberWithCommas(screen.brightnessNits || screen.brightness)} nits` }] : []),
                ].map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`px-4 py-2 flex justify-between break-inside-avoid ${idx % 2 === 0 ? '' : ''} ${idx < 6 ? 'border-b' : ''}`} 
                        style={{ 
                            borderColor: colors.borderLight,
                            background: idx % 2 === 0 ? colors.white : colors.surface
                        }}
                    >
                        <span style={{ color: colors.textMuted, fontSize: '10px' }}>{item.label}</span>
                        <span className="font-semibold" style={{ color: colors.text, fontSize: '10px' }}>{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // Hybrid Pricing Section - Classic text hierarchy (UPPERCASE BOLD name, smaller specs)
    const PricingSection = () => {
        const softCostItems = internalAudit?.softCostItems || [];
        
        // Get quote items if available
        const quoteItems = (((details as any)?.quoteItems || []) as any[]).filter(Boolean);
        
        const lineItems = quoteItems.length > 0
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
                const combined = [split.specs, desc].filter(Boolean).join(" ").trim();
                
                return {
                    key: it.id || `quote-${idx}`,
                    name: header.toUpperCase(),
                    description: combined,
                    price: Number(it.price || 0) || 0,
                };
            }).filter((it: any) => Math.abs(it.price) >= 0.01)
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
                        name: (split.header || getScreenHeader(screen)).toUpperCase(),
                        description: split.specs || buildDescription(screen),
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
        
        const subtotal = lineItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

        return (
            <div className="mt-6 break-inside-avoid">
                {/* Modern table container */}
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
                    {/* Header */}
                    <div 
                        className="grid grid-cols-12 px-4 py-2.5 text-xs font-bold uppercase tracking-wider break-inside-avoid" 
                        style={{ background: colors.primary, color: colors.white }}
                    >
                        <div className="col-span-8">Description</div>
                        <div className="col-span-4 text-right">Amount</div>
                    </div>
                    
                    {/* Items - Classic hierarchy: UPPERCASE BOLD name, smaller specs */}
                    {lineItems.map((item, idx) => (
                        <div 
                            key={item.key} 
                            className="grid grid-cols-12 px-4 py-1.5 border-t break-inside-avoid" 
                            style={{ 
                                borderColor: colors.borderLight,
                                background: idx % 2 === 1 ? colors.surface : colors.white
                            }}
                        >
                            <div className="col-span-8">
                                {/* Line 1: UPPERCASE BOLD */}
                                <div className="font-bold text-xs tracking-wide" style={{ color: colors.text }}>
                                    {item.name}
                                </div>
                                {/* Line 2+: Smaller, lighter specs */}
                                {item.description && (
                                    <div className="text-xs mt-0.5 leading-tight" style={{ color: colors.textMuted, fontSize: '10px' }}>
                                        {item.description}
                                    </div>
                                )}
                            </div>
                            <div className="col-span-4 text-right font-bold text-sm" style={{ color: colors.primaryDark }}>
                                {formatCurrency(item.price)}
                            </div>
                        </div>
                    ))}
                    
                    {/* Total */}
                    <div 
                        className="grid grid-cols-12 px-4 py-3 border-t-2 break-inside-avoid" 
                        style={{ borderColor: colors.primary, background: colors.primaryLight }}
                    >
                        <div className="col-span-8 font-bold text-xs uppercase tracking-wide" style={{ color: colors.primaryDark }}>
                            Project Total
                        </div>
                        <div className="col-span-4 text-right font-bold text-xs" style={{ color: colors.primaryDark }}>
                            {formatCurrency(subtotal)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Payment Terms Section
    const PaymentTermsSection = () => {
        const raw = (details?.paymentTerms || "").toString();
        const lines = raw.split(/\r?\n|,/g).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        return (
            <div className="mt-8 break-inside-avoid">
                <SectionHeader title="Payment Terms" />
                <div className="rounded-lg p-4 text-sm leading-relaxed break-inside-avoid" style={{ background: colors.surface, color: colors.textMuted }}>
                    {lines.map((line, idx) => <div key={idx} className="py-0.5 break-inside-avoid">{line}</div>)}
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

    // Signature Block - Universal (available for all document types)
    const SignatureBlock = () => (
        <div className="mt-12 break-inside-avoid">
            <div className="text-xs leading-relaxed text-justify mb-8 break-inside-avoid" style={{ color: colors.textMuted }}>
                {((details as any)?.signatureBlockText || "").trim() || 
                    `Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein and to authorize ANC to commence production.`}
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
            {/* Hybrid Header - Clean Modern style with left-aligned logo */}
            <div className="flex justify-between items-start px-6 pt-6 pb-4 mb-6 border-b break-inside-avoid" style={{ borderColor: colors.border }}>
                {/* Logo left-aligned, flush with content margin */}
                <LogoSelectorServer theme="light" width={140} height={70} className="p-0" />
                <div className="text-right break-inside-avoid">
                    <div className="text-xs uppercase tracking-widest font-bold" style={{ color: colors.primary }}>{docLabel}</div>
                    <h1 className="text-xl font-bold mt-1" style={{ color: colors.text }}>{receiver?.name || "Client Name"}</h1>
                    {details?.proposalName && <div className="text-xs mt-1" style={{ color: colors.textMuted }}>{details.proposalName}</div>}
                </div>
            </div>

            {/* Intro - 10pt font */}
            {showIntroText && (
                <div className="px-6 mb-6 break-inside-avoid">
                    <div className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                        {documentMode === "LOI" ? (
                            <p className="text-justify">
                                This Sales Quotation establishes the terms by which <strong style={{ color: colors.text }}>{purchaserName}</strong>
                                {purchaserAddress && <span> located at {purchaserAddress}</span>} and <strong style={{ color: colors.text }}>ANC Sports Enterprises, LLC</strong> located at {ancAddress} (collectively, the "Parties") agree that ANC will provide the LED Display System described below.
                            </p>
                        ) : documentMode === "PROPOSAL" ? (
                            <p>
                                ANC is pleased to present the following {documentMode.toLowerCase()} for <strong style={{ color: colors.text }}>{purchaserName}</strong> per the specifications and pricing below.
                            </p>
                        ) : (
                            <p>
                                ANC is pleased to present the following LED Display budget to <strong style={{ color: colors.text }}>{purchaserName}</strong> per the specifications below.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Pricing - Available for all document types when enabled */}
            {showPricingTables && (
                <div className="px-6 break-inside-avoid">
                    <SectionHeader title="Project Pricing" />
                    <PricingSection />
                </div>
            )}

            {/* Payment Terms - Universal */}
            {showPaymentTerms && (
                <div className="px-6 break-inside-avoid">
                    <PaymentTermsSection />
                </div>
            )}

            {/* Notes - Universal (available for all document types) */}
            {showNotes && (
                <div className="px-6 break-inside-avoid">
                    <NotesSection />
                </div>
            )}

            {/* Scope of Work - Universal (available for all document types) */}
            {showScopeOfWork && (
                <div className="px-6 break-inside-avoid">
                    <ScopeOfWorkSection />
                </div>
            )}

            {/* Specifications - Available for all document types when enabled */}
            {showSpecifications && screens.length > 0 && (
                <div className="px-6 break-before-page">
                    <SectionHeader title={specsSectionTitle} subtitle="Technical details for each display" />
                    {screens.map((screen: any, idx: number) => (
                        <SpecTable key={idx} screen={screen} />
                    ))}
                </div>
            )}

            {/* Exhibit A - Technical Specs (when enabled) */}
            {showExhibitA && (
                <div className="px-6 break-before-page">
                    <ExhibitA_TechnicalSpecs data={data} showSOW={showScopeOfWork} />
                </div>
            )}

            {/* Signature Block - Universal (available for all document types) */}
            {showSignatureBlock && (
                <div className="px-6 break-before-page">
                    <SignatureBlock />
                </div>
            )}

            {/* Hybrid Footer - Bold style with dark blue slash */}
            {showCompanyFooter && (
                <div className="px-6">
                    <HybridFooter />
                </div>
            )}
        </ProposalLayout>
    );
};

export default ProposalTemplate5;
