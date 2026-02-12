import React from "react";
import { PricingDocument, PricingTable } from "@/types/pricing";
import { formatCurrency } from "@/lib/helpers";
import {
    computeTableTotals,
    computeDocumentTotal,
    getEffectiveDescription,
} from "@/lib/pricingMath";

// ─── Override props interface ────────────────────────────────────────────────

interface OverrideProps {
    headerOverrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}

// ============================================================================
// CLASSIC MIRROR SECTION
// ============================================================================

export const MirrorPricingSection = ({
    document,
    overrides,
    descriptionOverrides = {},
    priceOverrides = {},
}: {
    document: PricingDocument;
    overrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}) => {
    const currency = document.currency || "USD";
    const docTotal = computeDocumentTotal(document, priceOverrides, descriptionOverrides);
    return (
        <div className="px-4 mt-4">
            {document.tables.map((table, idx) => (
                <ClassicMirrorTable
                    key={table.id || idx}
                    table={table}
                    currency={currency}
                    overrides={overrides}
                    descriptionOverrides={descriptionOverrides}
                    priceOverrides={priceOverrides}
                />
            ))}

            {/* Document Total - Only show if there are multiple tables to verify total */}
            {document.tables.length > 1 && (
                <div className="mt-4 border-t-4 border-[#0A52EF] pt-2 flex justify-end">
                    <div className="w-1/2">
                        <div className="flex justify-between items-center py-2 border-b-2 border-black">
                            <span className="font-bold text-sm uppercase text-black">Project Grand Total</span>
                            <span className="font-bold text-lg text-black">{formatCurrency(docTotal, currency)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClassicMirrorTable = ({
    table,
    currency,
    overrides,
    descriptionOverrides = {},
    priceOverrides = {},
}: {
    table: PricingTable;
    currency: "CAD" | "USD";
    overrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}) => {
    const headerName = overrides?.[table.id] || overrides?.[table.name] || table.name;
    const totals = computeTableTotals(table, priceOverrides, descriptionOverrides);

    return (
        <div className="mb-5">
            {/* Table Name */}
            {headerName && (
                <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-2">
                    <h3 className="font-bold text-lg uppercase text-black font-sans">{headerName}</h3>
                </div>
            )}

            {/* Items — pre-filtered & pre-rounded by computeTableTotals */}
            <div className="space-y-1.5 mb-3">
                {totals.items.map((ri) => (
                    <div key={ri.originalIndex} className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                            <p className="text-sm font-medium text-gray-900 uppercase">
                                {ri.description}
                            </p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <span className="font-bold text-sm text-black">
                                {ri.isIncluded ? "INCLUDED" : formatCurrency(ri.price, currency)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtotal */}
            <div className="flex justify-end border-t border-gray-200 pt-1 mb-1">
                <div className="w-1/2 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Subtotal</span>
                    <span className="font-bold text-sm text-black">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
            </div>

            {/* Tax */}
            {table.tax && (
                <div className="flex justify-end mb-1">
                    <div className="w-1/2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-gray-500">{totals.taxLabel}</span>
                        <span className="font-bold text-sm text-black">{formatCurrency(totals.tax, currency)}</span>
                    </div>
                </div>
            )}

            {/* Bond */}
            {totals.bond > 0 && (
                <div className="flex justify-end mb-1">
                    <div className="w-1/2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-gray-500">Bond</span>
                        <span className="font-bold text-sm text-black">{formatCurrency(totals.bond, currency)}</span>
                    </div>
                </div>
            )}

            {/* Table Total */}
            <div className="flex justify-end border-t-2 border-gray-900 pt-1 mb-3">
                <div className="w-1/2 flex justify-between items-center">
                    <span className="text-sm font-bold uppercase text-black">Total</span>
                    <span className="font-bold text-lg text-black">{formatCurrency(totals.grandTotal, currency)}</span>
                </div>
            </div>

            {/* Alternates */}
            {table.alternates.length > 0 && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2 border-b border-gray-200 pb-1">Alternates / Options</h4>
                    <div className="space-y-1.5">
                        {table.alternates.map((alt, idx) => (
                            <div key={idx} className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <p className="text-xs font-medium text-gray-700 uppercase italic">{alt.description}</p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-bold text-xs text-gray-600">
                                        {alt.priceDifference === 0 ? "No Change" : (alt.priceDifference < 0 ? `(${formatCurrency(Math.abs(alt.priceDifference), currency)})` : formatCurrency(alt.priceDifference, currency))}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


// ============================================================================
// PREMIUM MIRROR SECTION
// ============================================================================

export const PremiumMirrorPricingSection = ({
    document,
    overrides,
    descriptionOverrides = {},
    priceOverrides = {},
}: {
    document: PricingDocument;
    overrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}) => {
    const currency = document.currency || "USD";
    const docTotal = computeDocumentTotal(document, priceOverrides);
    return (
        <div className="mt-4">
            {document.tables.map((table, idx) => (
                <PremiumMirrorTable
                    key={table.id || idx}
                    table={table}
                    currency={currency}
                    overrides={overrides}
                    descriptionOverrides={descriptionOverrides}
                    priceOverrides={priceOverrides}
                />
            ))}

            {/* Document Total */}
            {document.tables.length > 1 && (
                <div className="mt-4 flex justify-end items-center gap-10 border-t-2 border-black pt-2">
                    <span className="font-bold text-lg uppercase tracking-widest text-[#6B7280]">Project Total:</span>
                    <span className="font-bold text-3xl text-[#002C73]">{formatCurrency(docTotal, currency)}</span>
                </div>
            )}
        </div>
    );
};

const PremiumMirrorTable = ({
    table,
    currency,
    overrides,
    descriptionOverrides = {},
    priceOverrides = {},
}: {
    table: PricingTable;
    currency: "CAD" | "USD";
    overrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}) => {
    const headerName = overrides?.[table.id] || overrides?.[table.name] || table.name || "Pricing";
    const totals = computeTableTotals(table, priceOverrides, descriptionOverrides);

    return (
        <div className="mb-6">
            {/* Header */}
            <div className="flex justify-between border-b-2 border-black pb-1 mb-2">
                <h2 className="text-xl font-bold tracking-tight text-[#002C73] font-sans">
                    {headerName}
                </h2>
                {table.name ? (
                    <h2 className="text-xl font-bold tracking-tight text-[#002C73] font-sans">Pricing</h2>
                ) : null}
            </div>

            {/* Line Items — pre-filtered & pre-rounded by computeTableTotals */}
            <div className="space-y-0">
                {totals.items.map((ri) => (
                    <div key={ri.originalIndex} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                            <h3 className="font-bold text-sm uppercase text-[#002C73] font-sans">
                                {ri.description}
                            </h3>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-xl text-[#002C73]">
                                {ri.isIncluded ? "INCLUDED" : formatCurrency(ri.price, currency)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtotal & Extras */}
            <div className="mt-3 flex flex-col items-end gap-1">
                <div className="flex justify-end items-center gap-10">
                    <span className="font-bold text-sm uppercase tracking-widest text-[#6B7280]">Subtotal:</span>
                    <span className="font-bold text-2xl text-[#002C73]">{formatCurrency(totals.subtotal, currency)}</span>
                </div>

                {table.tax && (
                    <div className="flex justify-end items-center gap-10">
                        <span className="font-medium text-xs uppercase tracking-widest text-[#6B7280]">{totals.taxLabel}:</span>
                        <span className="font-medium text-lg text-[#002C73]">{formatCurrency(totals.tax, currency)}</span>
                    </div>
                )}

                {totals.bond > 0 && (
                    <div className="flex justify-end items-center gap-10">
                        <span className="font-medium text-xs uppercase tracking-widest text-[#6B7280]">Bond:</span>
                        <span className="font-medium text-lg text-[#002C73]">{formatCurrency(totals.bond, currency)}</span>
                    </div>
                )}

                <div className="mt-2 pt-2 border-t border-gray-200 w-full flex justify-end items-center gap-10">
                    <span className="font-bold text-base uppercase tracking-widest text-[#6B7280]">Total:</span>
                    <span className="font-bold text-3xl text-[#002C73]">{formatCurrency(totals.grandTotal, currency)}</span>
                </div>
            </div>

            {/* Alternates */}
            {table.alternates.length > 0 && (
                <div className="mt-4 bg-[#F3F4F6] p-4 rounded-xl">
                    <h4 className="font-bold text-sm uppercase text-[#002C73] mb-2 border-b border-white pb-1">Alternates / Options</h4>
                    <div className="space-y-2">
                        {table.alternates.map((alt, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <div className="flex-1 pr-6">
                                    <p className="text-sm font-medium text-[#4B5563] uppercase italic">{alt.description}</p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-bold text-sm text-[#002C73]">
                                        {alt.priceDifference === 0 ? "No Change" : (alt.priceDifference < 0 ? `(${formatCurrency(Math.abs(alt.priceDifference), currency)})` : formatCurrency(alt.priceDifference, currency))}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
