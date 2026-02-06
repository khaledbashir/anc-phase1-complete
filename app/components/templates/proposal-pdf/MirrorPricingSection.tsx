import React from "react";
import { PricingDocument, PricingTable } from "@/types/pricing";
import { formatCurrency } from "@/lib/helpers";

// ============================================================================
// CLASSIC MIRROR SECTION
// ============================================================================

export const MirrorPricingSection = ({ document, overrides }: { document: PricingDocument; overrides?: Record<string, string> }) => {
    return (
        <div className="px-4 mt-8 break-inside-avoid">
            {/* Note: Title is rendered by parent usually, but we can include it here if needed */}
            {document.tables.map((table, idx) => (
                <ClassicMirrorTable key={table.id || idx} table={table} overrides={overrides} />
            ))}

            {/* Document Total - Only show if there are multiple tables to verify total */}
            {document.tables.length > 1 && (
                <div className="mt-8 border-t-4 border-[#0A52EF] pt-4 flex justify-end">
                    <div className="w-1/2">
                        <div className="flex justify-between items-center py-2 border-b-2 border-black">
                            <span className="font-bold text-sm uppercase text-black">Project Grand Total</span>
                            <span className="font-bold text-lg text-black">{formatCurrency(document.documentTotal)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClassicMirrorTable = ({ table, overrides }: { table: PricingTable; overrides?: Record<string, string> }) => {
    const headerName = overrides?.[table.name] || table.name;
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
                            <p className="text-sm font-medium text-gray-900 uppercase">{item.description}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <span className="font-bold text-sm text-black">
                                {item.isIncluded ? "INCLUDED" : formatCurrency(item.sellingPrice)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtotal */}
            <div className="flex justify-end border-t border-gray-200 pt-2 mb-2">
                <div className="w-1/2 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Subtotal</span>
                    <span className="font-bold text-sm text-black">{formatCurrency(table.subtotal)}</span>
                </div>
            </div>

            {/* Tax */}
            {table.tax && (
                <div className="flex justify-end mb-2">
                    <div className="w-1/2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-gray-500">{table.tax.label}</span>
                        <span className="font-bold text-sm text-black">{formatCurrency(table.tax.amount)}</span>
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
                    <span className="font-bold text-lg text-black">{formatCurrency(table.grandTotal)}</span>
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

export const PremiumMirrorPricingSection = ({ document, overrides }: { document: PricingDocument; overrides?: Record<string, string> }) => {
    return (
        <div className="mt-8 break-inside-avoid">
            {document.tables.map((table, idx) => (
                <PremiumMirrorTable key={table.id || idx} table={table} overrides={overrides} />
            ))}

            {/* Document Total */}
            {document.tables.length > 1 && (
                <div className="mt-10 flex justify-end items-center gap-10 border-t-2 border-black pt-4">
                    <span className="font-bold text-lg uppercase tracking-widest text-[#6B7280]">Project Total:</span>
                    <span className="font-bold text-3xl text-[#002C73]">{formatCurrency(document.documentTotal)}</span>
                </div>
            )}
        </div>
    );
};

const PremiumMirrorTable = ({ table, overrides }: { table: PricingTable; overrides?: Record<string, string> }) => {
    const headerName = overrides?.[table.name] || table.name || "Pricing";
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
                            <h3 className="font-bold text-sm uppercase text-[#002C73] font-sans">{it.description}</h3>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-xl text-[#002C73]">
                                {it.isIncluded ? "INCLUDED" : formatCurrency(it.sellingPrice)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtotal & Extras */}
            <div className="mt-6 flex flex-col items-end gap-2">
                <div className="flex justify-end items-center gap-10">
                    <span className="font-bold text-sm uppercase tracking-widest text-[#6B7280]">Subtotal:</span>
                    <span className="font-bold text-2xl text-[#002C73]">{formatCurrency(table.subtotal)}</span>
                </div>

                {table.tax && (
                    <div className="flex justify-end items-center gap-10">
                        <span className="font-medium text-xs uppercase tracking-widest text-[#6B7280]">{table.tax.label}:</span>
                        <span className="font-medium text-lg text-[#002C73]">{formatCurrency(table.tax.amount)}</span>
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
                    <span className="font-bold text-3xl text-[#002C73]">{formatCurrency(table.grandTotal)}</span>
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
