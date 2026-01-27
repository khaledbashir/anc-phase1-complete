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
        <div className="text-center mb-8 mt-4">
            <h2 style={{ color: PDF_COLORS.FRENCH_BLUE }} className="text-xl font-normal uppercase tracking-[0.2em]">{title}</h2>
        </div>
    );

    // Helper for Spec Table - Updated to match ABCDE style
    const SpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-8 break-inside-avoid">
            {/* Gray Header Bar */}
            <div className="flex justify-between items-center bg-gray-200 px-2 py-1 border-b border-gray-300">
                <h3 className="font-bold text-sm uppercase text-gray-900">{screen.name}</h3>
                <span className="font-bold text-sm uppercase text-gray-900">SPECIFICATIONS</span>
            </div>
            <table className="w-full text-xs">
                <tbody>
                    <tr className="bg-white border-b border-gray-100">
                        <td className="p-1 pl-2 text-gray-600">MM Pitch</td>
                        <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.pitchMm ?? screen.pixelPitch} mm</td>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <td className="p-1 pl-2 text-gray-600">Quantity</td>
                        <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.quantity}</td>
                    </tr>
                    <tr className="bg-white border-b border-gray-100">
                        <td className="p-1 pl-2 text-gray-600">Active Display Height (ft.)</td>
                        <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.heightFt ?? screen.height}'</td>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <td className="p-1 pl-2 text-gray-600">Active Display Width (ft.)</td>
                        <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.widthFt ?? screen.width}'</td>
                    </tr>
                    <tr className="bg-white border-b border-gray-100">
                        <td className="p-1 pl-2 text-gray-600">Pixel Resolution (H)</td>
                        <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.resolutionH ?? ((screen.heightFt ?? screen.height) * 12 * 25.4 / (screen.pitchMm ?? screen.pixelPitch)).toFixed(0)} p</td>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <td className="p-1 pl-2 text-gray-600">Pixel Resolution (W)</td>
                        <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.resolutionW ?? ((screen.widthFt ?? screen.width) * 12 * 25.4 / (screen.pitchMm ?? screen.pixelPitch)).toFixed(0)} p</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    // Helper for Pricing Table - Updated to match ABCDE style
    const PricingTable = ({ screen }: { screen: any }) => {
        const auditRow = internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
        const b = auditRow?.breakdown;
        if (!auditRow) return null;

        return (
            <div className="mb-8 break-inside-avoid">
                {/* Gray Header Bar */}
                <div className="flex justify-between items-center bg-gray-200 px-2 py-1 border-b border-gray-300">
                    <h3 className="font-bold text-sm uppercase text-gray-900">{screen.name}</h3>
                    <span className="font-bold text-sm uppercase text-gray-900">PRICING</span>
                </div>

                <table className="w-full text-xs box-border">
                    <tbody>
                        {/* Zebra Striping logic if needed, but screenshot shows mostly white with clean lines */}
                        <tr className="border-b border-gray-100">
                            {/* Make sure we have a description */}
                            <td className="p-2 text-gray-700 w-3/4">{screen.name} - {screen.pitchMm}mm (Qty {screen.quantity})</td>
                            <td className="p-2 text-right font-medium text-gray-900 w-1/4">{formatCurrency(b?.hardware * 1.3)}</td>
                        </tr>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <td className="p-2 text-gray-700">Structural Materials</td>
                            <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(b?.structure)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="p-2 text-gray-700">Structural Labor and LED Installation</td>
                            <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(b?.install)}</td>
                        </tr>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <td className="p-2 text-gray-700">Electrical and Data - Materials and Subcontracting</td>
                            <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(b?.power)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="p-2 text-gray-700">Project Management, General Conditions, Travel & Expenses</td>
                            <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(b?.pm + b?.travel + b?.generalConditions)}</td>
                        </tr>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <td className="p-2 text-gray-700">Submittals, Engineering, and Permits</td>
                            <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(b?.engineering + b?.permits + b?.submittals)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="p-2 text-gray-700">Content Management System Equipment, Installation, and Commissioning</td>
                            <td className="p-2 text-right font-medium text-gray-900">{formatCurrency(b?.cms)}</td>
                        </tr>

                        {/* Subtotal Row - darker bar */}
                        <tr className="bg-gray-100 font-bold border-t border-gray-300">
                            <td className="p-2 text-right uppercase text-gray-900">SUBTOTAL:</td>
                            <td className="p-2 text-right text-black">{formatCurrency(b?.finalClientTotal)}</td>
                        </tr>
                        {/* Tax Row */}
                        <tr className="border-b border-gray-300">
                            <td className="p-1 text-right text-[10px] text-gray-500 uppercase">Tax (EST):</td>
                            <td className="p-1 text-right text-[10px] text-gray-500">$0.00</td>
                        </tr>
                        {/* Final Total Row */}
                        <tr className="font-bold border-b-2 border-black">
                            <td className="p-2 text-right uppercase text-gray-900">TOTAL:</td>
                            <td className="p-2 text-right text-black">{formatCurrency(b?.finalClientTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <ProposalLayout data={data}>
            {/* 1. HEADER (Summary Page) - Refined for ABCDE Layout */}
            <div className="flex justify-between items-start mb-6">
                {/* Logo Left */}
                <div className="w-1/2">
                    <LogoSelector theme={forceWhiteLogo ? "dark" : "light"} width={180} height={100} />
                </div>
                {/* Title Right */}
                <div className="w-1/2 text-right">
                    <h1 className="text-2xl font-bold text-[#003366] uppercase leading-tight mb-1">{data.details.proposalName || "PROJECT NAME"}</h1>
                    <h2 className="text-xl font-bold text-gray-800 uppercase leading-none">SALES QUOTATION</h2>
                </div>
            </div>

            {/* Intro Paragraph (from ABCDE screenshot) */}
            <div className="mb-10 text-xs text-gray-600 text-justify leading-relaxed mx-1">
                <p>
                    This Sales Quotation will set forth the terms by which {receiver.name} ("Purchaser") located at {receiver.address}, and ANC Sports Enterprises, LLC ("ANC") located at {sender.address} (collectively, the "Parties") agree that ANC will provide following LED Display and services ("the Display System") described below for the {data.details.proposalName || "Project"}, as described below.
                </p>
            </div>

            {/* 2. SPECIFICATIONS SECTION */}
            <SectionHeader title="SPECIFICATIONS" />

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
