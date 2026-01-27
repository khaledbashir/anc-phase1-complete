import React from "react";

// Components
import { ProposalLayout, LogoSelector } from "@/app/components";

// Helpers
import { formatNumberWithCommas, isDataUrl, formatCurrency } from "@/lib/helpers";

// Variables
import { DATE_OPTIONS } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

// Styles
import { PDF_COLORS, PDF_STYLES } from "./PdfStyles";

interface ProposalTemplate2Props extends ProposalType {
    forceWhiteLogo?: boolean;
}

const ProposalTemplate2 = (data: ProposalTemplate2Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens } = data;
    const internalAudit = details?.internalAudit as any; // Cast for now if schema update lags
    const totals = internalAudit?.totals;

    // Filter out "summary" tables only? Or generic items?
    // Indiana Fever has 3 Sections:
    // 1. Specs (Screen Configs)
    // 2. Pricing Breakdown (Audit Table)
    // 3. Summary (Totals)

    // Helper for Header
    const SectionHeader = ({ title }: { title: string }) => (
        <div style={{ color: PDF_COLORS.FRENCH_BLUE }} className="text-center mb-4 mt-8">
            <h2 className="text-xl font-bold uppercase tracking-widest">{title}</h2>
        </div>
    );

    // Helper for Spec Table
    const SpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-6 break-inside-avoid">
            <div className="flex justify-between items-end mb-1 border-b-2 border-black pb-1">
                <h3 className="font-bold text-lg uppercase text-gray-900">{screen.name}</h3>
                <span className="font-bold text-sm uppercase text-gray-900">SPECIFICATIONS</span>
            </div>
            <table className="w-full text-xs">
                <tbody>
                    <tr className="bg-gray-100">
                        <td className="p-1 font-bold pl-2">MM Pitch</td>
                        <td className="p-1 text-right pr-2">{screen.pitchMm ?? screen.pixelPitch}mm</td>
                    </tr>
                    <tr>
                        <td className="p-1 font-bold pl-2">Quantity</td>
                        <td className="p-1 text-right pr-2">{screen.quantity}</td>
                    </tr>
                    <tr className="bg-gray-100">
                        <td className="p-1 font-bold pl-2">Active Display Height (ft.)</td>
                        <td className="p-1 text-right pr-2">{screen.heightFt ?? screen.height}'</td>
                    </tr>
                    <tr>
                        <td className="p-1 font-bold pl-2">Active Display Width (ft.)</td>
                        <td className="p-1 text-right pr-2">{screen.widthFt ?? screen.width}'</td>
                    </tr>
                    <tr className="bg-gray-100">
                        <td className="p-1 font-bold pl-2">Pixel Resolution (H)</td>
                        <td className="p-1 text-right pr-2">{screen.resolutionH ?? ((screen.heightFt ?? screen.height) * 12 * 25.4 / (screen.pitchMm ?? screen.pixelPitch)).toFixed(0)} p</td>
                    </tr>
                    <tr>
                        <td className="p-1 font-bold pl-2">Pixel Resolution (W)</td>
                        <td className="p-1 text-right pr-2">{screen.resolutionW ?? ((screen.widthFt ?? screen.width) * 12 * 25.4 / (screen.pitchMm ?? screen.pixelPitch)).toFixed(0)} p</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    // Helper for Pricing Table
    const PricingTable = ({ screen }: { screen: any }) => {
        // If we have internal audit breakdown, use it. Else fallback.
        const auditRow = internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
        const b = auditRow?.breakdown;

        // Mock rows if real data missing (fallback to legacy items?)
        // Assuming Enterprise flow always has audit.
        if (!auditRow) return null;

        return (
            <div className="mb-6 break-inside-avoid">
                <div className="flex justify-between items-end mb-1 border-b-2 border-black pb-1">
                    <h3 className="font-bold text-lg uppercase text-gray-900">{screen.name}</h3>
                    <span className="font-bold text-sm uppercase text-gray-900">PRICING</span>
                </div>
                <table className="w-full text-xs">
                    <tbody>
                        {/* Base Hardware (Sell Price) */}
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-gray-700">Base LED Display Hardware - {screen.pitchMm}mm SMD</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(b?.hardware * 1.3)}</td>
                            {/* Note: logic above is illustrative, usually 'Sell Price' is the line item. 
                                In 'AuditTable', we have 'b.sellPrice'. 
                                We probably want to break it down.
                                Let's assume 'b.sellPrice' is the total line for this screen.
                            */}
                        </tr>
                        {/* Services Bundle */}
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <td className="p-2 text-gray-700">LED Mounts and Secondary Support</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(b?.structure)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-gray-700">LED and Material Installation</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(b?.install)}</td>
                        </tr>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <td className="p-2 text-gray-700">Project Management, Power & Data</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(b?.pm + b?.power)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-gray-700">Engineering and Permits</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(b?.engineering)}</td>
                        </tr>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <td className="p-2 text-gray-700">Warranty (2 Years Parts)</td>
                            <td className="p-2 text-right font-medium">Included</td>
                        </tr>

                        {/* Subtotal */}
                        <tr className="border-t-2 border-black">
                            <td className="p-2 font-bold text-right uppercase">Subtotal:</td>
                            <td className="p-2 text-right font-bold text-black text-sm">{formatCurrency(b?.finalClientTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <ProposalLayout data={data}>
            {/* 1. HEADER (Summary Page) */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    {/* Dynamic Logo based on guard */}
                    <LogoSelector theme={forceWhiteLogo ? "dark" : "light"} width={140} height={100} />
                    <div className="mt-4">
                        <h1 className="text-3xl font-bold text-[#003366] uppercase leading-none">Sales Quotation</h1>
                        <p className="text-sm text-gray-500 mt-1">Proposal #{details.proposalId ?? "DRAFT"}</p>
                    </div>
                </div>
                <div className="text-right text-xs text-gray-600">
                    <p className="font-bold text-gray-900 text-sm">{sender.name}</p>
                    <p>{sender.address}</p>
                    <p>{sender.city}, {sender.country} {sender.zipCode}</p>
                    <p className="mt-2 text-[#0A52EF]">{sender.email}</p>
                </div>
            </div>

            {/* 2. SPECIFICATIONS SECTION */}
            <SectionHeader title={details.proposalName || "Project Specifications"} />

            {screens && screens.length > 0 ? (
                screens.map((screen: any, idx: number) => (
                    <SpecTable key={idx} screen={screen} />
                ))
            ) : (
                <div className="text-center text-gray-400 italic py-8">No screens configured.</div>
            )}

            <div className="break-before-page"></div>

            {/* 3. PRICING SECTION */}
            <SectionHeader title="Pricing Breakdown" />

            {screens && screens.length > 0 ? (
                screens.map((screen: any, idx: number) => (
                    <PricingTable key={idx} screen={screen} />
                ))
            ) : null}

            {/* 4. TOTALS SUMMARY */}
            <div className="mt-8 border-t-4 border-[#003366] pt-4">
                <div className="flex justify-end">
                    <div className="w-1/2">
                        <div className="flex justify-between py-2 border-b border-gray-300">
                            <span className="font-bold text-gray-700">PROJECT TOTAL</span>
                            <span className="font-bold text-gray-900">{formatCurrency(totals?.finalClientTotal || details?.totalAmount || 0)}</span>
                        </div>
                        {/* Payment Terms? */}
                        {details.paymentTerms && (
                            <div className="mt-4 text-xs text-gray-500 text-right">
                                <p className="font-bold uppercase text-gray-700">Payment Terms</p>
                                <p>{details.paymentTerms}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. SIGNATURE */}
            <div className="mt-12 break-inside-avoid">
                <div className="border-t-2 border-gray-300 pt-8 flex justify-between gap-12">
                    <div className="flex-1">
                        <p className="font-bold text-[#003366] uppercase mb-12">AGREED TO AND ACCEPTED BY:</p>
                        <div className="border-b border-black mb-2"></div>
                        <p className="text-xs uppercase font-bold text-gray-600">Signature</p>

                        <div className="border-b border-black mb-2 mt-8"></div>
                        <p className="text-xs uppercase font-bold text-gray-600">Date</p>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-[#003366] uppercase mb-12">{receiver.name}</p>
                        <div className="border-b border-black mb-2"></div>
                        <p className="text-xs uppercase font-bold text-gray-600">Printed Name</p>

                        <div className="border-b border-black mb-2 mt-8"></div>
                        <p className="text-xs uppercase font-bold text-gray-600">Title</p>
                    </div>
                </div>
            </div>

        </ProposalLayout>
    );
};

export default ProposalTemplate2;
