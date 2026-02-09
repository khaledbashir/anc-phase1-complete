import React from "react";
import { PricingDocument, PricingTable } from "@/types/pricing";
import { formatCurrency } from "@/lib/helpers";

// ─── Override helpers ────────────────────────────────────────────────────────

function getEffectivePrice(
    priceOverrides: Record<string, number>,
    tableId: string,
    idx: number,
    original: number
): number {
    const key = `${tableId}:${idx}`;
    return priceOverrides[key] !== undefined ? priceOverrides[key] : original;
}

function getEffectiveDescription(
    descriptionOverrides: Record<string, string>,
    tableId: string,
    idx: number,
    original: string
): string {
    const key = `${tableId}:${idx}`;
    return descriptionOverrides[key] || original;
}

function computeSubtotal(table: PricingTable, priceOverrides: Record<string, number>): number {
    return (table.items || []).reduce((sum, item, idx) => {
        if (item.isIncluded) return sum;
        return sum + getEffectivePrice(priceOverrides, table.id, idx, item.sellingPrice);
    }, 0);
}

function computeTax(table: PricingTable, effectiveSubtotal: number): number {
    if (!table.tax) return 0;
    const rate = table.subtotal > 0 ? table.tax.amount / table.subtotal : 0;
    return effectiveSubtotal * rate;
}

function computeGrandTotal(table: PricingTable, priceOverrides: Record<string, number>): number {
    const sub = computeSubtotal(table, priceOverrides);
    const tax = computeTax(table, sub);
    return sub + tax + (table.bond || 0);
}

function computeDocumentTotal(document: PricingDocument, priceOverrides: Record<string, number>): number {
    if (Object.keys(priceOverrides).length === 0) {
        return document.documentTotal ?? document.tables.reduce((s, t) => s + t.grandTotal, 0);
    }
    return document.tables.reduce((s, t) => s + computeGrandTotal(t, priceOverrides), 0);
}

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
    const docTotal = computeDocumentTotal(document, priceOverrides);
    return (
        <div className="px-4 mt-8 break-inside-avoid">
            {document.tables.map((table, idx) => (
                <ClassicMirrorTable
                    key={table.id || idx}
                    table={table}
                    overrides={overrides}
                    descriptionOverrides={descriptionOverrides}
                    priceOverrides={priceOverrides}
                />
            ))}

            {/* Document Total - Only show if there are multiple tables to verify total */}
            {document.tables.length > 1 && (
                <div className="mt-8 border-t-4 border-[#0A52EF] pt-4 flex justify-end">
                    <div className="w-1/2">
                        <div className="flex justify-between items-center py-2 border-b-2 border-black">
                            <span className="font-bold text-sm uppercase text-black">Project Grand Total</span>
                            <span className="font-bold text-lg text-black">{formatCurrency(docTotal)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClassicMirrorTable = ({
    table,
    overrides,
    descriptionOverrides = {},
    priceOverrides = {},
}: {
    table: PricingTable;
    overrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}) => {
    const headerName = overrides?.[table.id] || overrides?.[table.name] || table.name;
    const effectiveSub = computeSubtotal(table, priceOverrides);
    const effectiveTax = computeTax(table, effectiveSub);
    const effectiveGrand = effectiveSub + effectiveTax + (table.bond || 0);

    return (
        <div className="mb-10 break-inside-avoid">
            {/* Table Name */}
            {headerName && (
                <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-4">
                    <h3 className="font-bold text-lg uppercase text-black font-sans">{headerName}</h3>
                </div>
            )}

            {/* Items */}
            <div className="space-y-4 mb-6">
                {table.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                            <p className="text-sm font-medium text-gray-900 uppercase">
                                {getEffectiveDescription(descriptionOverrides, table.id, idx, item.description)}
                            </p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <span className="font-bold text-sm text-black">
                                {item.isIncluded
                                    ? "INCLUDED"
                                    : formatCurrency(getEffectivePrice(priceOverrides, table.id, idx, item.sellingPrice))}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtotal */}
            <div className="flex justify-end border-t border-gray-200 pt-2 mb-2">
                <div className="w-1/2 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Subtotal</span>
                    <span className="font-bold text-sm text-black">{formatCurrency(effectiveSub)}</span>
                </div>
            </div>

            {/* Tax */}
            {table.tax && (
                <div className="flex justify-end mb-2">
                    <div className="w-1/2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-gray-500">{table.tax.label}</span>
                        <span className="font-bold text-sm text-black">{formatCurrency(effectiveTax)}</span>
                    </div>
                </div>
            )}

            {/* Bond */}
            {table.bond > 0 && (
                <div className="flex justify-end mb-2">
                    <div className="w-1/2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-gray-500">Bond</span>
                        <span className="font-bold text-sm text-black">{formatCurrency(table.bond)}</span>
                    </div>
                </div>
            )}

            {/* Table Total */}
            <div className="flex justify-end border-t-2 border-gray-900 pt-2 mb-6">
                <div className="w-1/2 flex justify-between items-center">
                    <span className="text-sm font-bold uppercase text-black">Total</span>
                    <span className="font-bold text-lg text-black">{formatCurrency(effectiveGrand)}</span>
                </div>
            </div>

            {/* Alternates */}
            {table.alternates.length > 0 && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-3 border-b border-gray-200 pb-1">Alternates / Options</h4>
                    <div className="space-y-3">
                        {table.alternates.map((alt, idx) => (
                            <div key={idx} className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <p className="text-xs font-medium text-gray-700 uppercase italic">{alt.description}</p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-bold text-xs text-gray-600">
                                        {alt.priceDifference === 0 ? "No Change" : (alt.priceDifference < 0 ? `(${formatCurrency(Math.abs(alt.priceDifference))})` : formatCurrency(alt.priceDifference))}
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
    const docTotal = computeDocumentTotal(document, priceOverrides);
    return (
        <div className="mt-8 break-inside-avoid">
            {document.tables.map((table, idx) => (
                <PremiumMirrorTable
                    key={table.id || idx}
                    table={table}
                    overrides={overrides}
                    descriptionOverrides={descriptionOverrides}
                    priceOverrides={priceOverrides}
                />
            ))}

            {/* Document Total */}
            {document.tables.length > 1 && (
                <div className="mt-10 flex justify-end items-center gap-10 border-t-2 border-black pt-4">
                    <span className="font-bold text-lg uppercase tracking-widest text-[#6B7280]">Project Total:</span>
                    <span className="font-bold text-3xl text-[#002C73]">{formatCurrency(docTotal)}</span>
                </div>
            )}
        </div>
    );
};

const PremiumMirrorTable = ({
    table,
    overrides,
    descriptionOverrides = {},
    priceOverrides = {},
}: {
    table: PricingTable;
    overrides?: Record<string, string>;
    descriptionOverrides?: Record<string, string>;
    priceOverrides?: Record<string, number>;
}) => {
    const headerName = overrides?.[table.id] || overrides?.[table.name] || table.name || "Pricing";
    const effectiveSub = computeSubtotal(table, priceOverrides);
    const effectiveTax = computeTax(table, effectiveSub);
    const effectiveGrand = effectiveSub + effectiveTax + (table.bond || 0);

    return (
        <div className="mb-12">
            {/* Header */}
            <div className="flex justify-between border-b-2 border-black pb-2 mb-4">
                <h2 className="text-xl font-bold tracking-tight text-[#002C73] font-sans">
                    {headerName}
                </h2>
                {table.name ? (
                    <h2 className="text-xl font-bold tracking-tight text-[#002C73] font-sans">Pricing</h2>
                ) : null}
            </div>

            {/* Line Items */}
            <div className="space-y-0">
                {table.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center py-6 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                            <h3 className="font-bold text-sm uppercase text-[#002C73] font-sans">
                                {getEffectiveDescription(descriptionOverrides, table.id, idx, it.description)}
                            </h3>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-xl text-[#002C73]">
                                {it.isIncluded
                                    ? "INCLUDED"
                                    : formatCurrency(getEffectivePrice(priceOverrides, table.id, idx, it.sellingPrice))}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtotal & Extras */}
            <div className="mt-6 flex flex-col items-end gap-2">
                <div className="flex justify-end items-center gap-10">
                    <span className="font-bold text-sm uppercase tracking-widest text-[#6B7280]">Subtotal:</span>
                    <span className="font-bold text-2xl text-[#002C73]">{formatCurrency(effectiveSub)}</span>
                </div>

                {table.tax && (
                    <div className="flex justify-end items-center gap-10">
                        <span className="font-medium text-xs uppercase tracking-widest text-[#6B7280]">{table.tax.label}:</span>
                        <span className="font-medium text-lg text-[#002C73]">{formatCurrency(effectiveTax)}</span>
                    </div>
                )}

                {table.bond > 0 && (
                    <div className="flex justify-end items-center gap-10">
                        <span className="font-medium text-xs uppercase tracking-widest text-[#6B7280]">Bond:</span>
                        <span className="font-medium text-lg text-[#002C73]">{formatCurrency(table.bond)}</span>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 w-full flex justify-end items-center gap-10">
                    <span className="font-bold text-base uppercase tracking-widest text-[#6B7280]">Total:</span>
                    <span className="font-bold text-3xl text-[#002C73]">{formatCurrency(effectiveGrand)}</span>
                </div>
            </div>

            {/* Alternates */}
            {table.alternates.length > 0 && (
                <div className="mt-10 bg-[#F3F4F6] p-6 rounded-xl">
                    <h4 className="font-bold text-sm uppercase text-[#002C73] mb-4 border-b border-white pb-2">Alternates / Options</h4>
                    <div className="space-y-4">
                        {table.alternates.map((alt, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <div className="flex-1 pr-6">
                                    <p className="text-sm font-medium text-[#4B5563] uppercase italic">{alt.description}</p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-bold text-sm text-[#002C73]">
                                        {alt.priceDifference === 0 ? "No Change" : (alt.priceDifference < 0 ? `(${formatCurrency(Math.abs(alt.priceDifference))})` : formatCurrency(alt.priceDifference))}
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
