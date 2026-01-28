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
    screens?: any[];
}

const ProposalTemplate2 = (data: ProposalTemplate2Props) => {
    const { sender, receiver, details, forceWhiteLogo, screens } = data;
    const internalAudit = details?.internalAudit as any; // Cast for now if schema update lags
    const totals = internalAudit?.totals;

    // Filter out "summary" tables only? Or generic items?
    // Dynamic Template Mapping:
    // This template binds to ProposalContext data.
    // 1. Specs (Screen Configs)
    // 2. Pricing Breakdown (Audit Table)
    // 3. Summary (Totals)

    // Helper for Header
    const SectionHeader = ({ title }: { title: string }) => (
        <div className="text-center mb-8 mt-4">
            <h2 style={{ color: PDF_COLORS.FRENCH_BLUE }} className="text-xl font-bold tracking-wide">{title}</h2>
        </div>
    );

    // Helper for Spec Table - Updated to match ABCDE style
    const SpecTable = ({ screen }: { screen: any }) => (
        <div className="mb-8 break-inside-avoid">
            {/* Gray Header Bar */}
            <div className="flex justify-between items-center bg-gray-200 px-2 py-1 border-b border-gray-300">
                <h3 className="font-bold text-sm text-gray-900">{screen.name}</h3>
                <span className="font-bold text-sm text-gray-900">Specifications</span>
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
                    {screen.brightness && (
                        <tr className="bg-white border-b border-gray-100">
                            <td className="p-1 pl-2 text-gray-600">Brightness (nits)</td>
                            <td className="p-1 text-right pr-2 font-medium text-gray-900">{screen.brightness} nits</td>
                        </tr>
                    )}
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
                    <h3 className="font-bold text-sm text-gray-900">{screen.name}</h3>
                    <span className="font-bold text-sm text-gray-900">Pricing</span>
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
                            <td className="p-2 text-right text-gray-900">Subtotal:</td>
                            <td className="p-2 text-right text-black">{formatCurrency(b?.finalClientTotal)}</td>
                        </tr>
                        {/* Tax Row */}
                        <tr className="border-b border-gray-300">
                            <td className="p-1 text-right text-[10px] text-gray-500">Tax (Est):</td>
                            <td className="p-1 text-right text-[10px] text-gray-500">$0.00</td>
                        </tr>
                        {/* Final Total Row */}
                        <tr className="font-bold border-b-2 border-black">
                            <td className="p-2 text-right text-gray-900">Total:</td>
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
                    <h1 className="text-2xl font-bold text-[#0A52EF] leading-tight mb-1">{data.details.proposalName || "Project Name"}</h1>
                    <h2 className="text-xl font-bold text-gray-800 leading-none">Sales Quotation</h2>
                </div>
            </div>

            {/* Intro Paragraph (Dynamic Header Injection per Architect Directive) */}
            <div className="mb-10 text-xs text-gray-600 text-justify leading-relaxed mx-1">
                <p>
                    This Sales Quotation will set forth the terms by which {receiver.name} (“Purchaser”) located at {receiver.address} and ANC Sports Enterprises, LLC (“ANC”) located at {sender.address} (collectively, the “Parties”) agree that ANC will provide following Display System and services (“the Display System”) described below for the {details.location || details.proposalName || "Project"}.
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
            <div className="mt-8 border-t-4 border-[#0A52EF] pt-4">
                <div className="flex justify-end">
                    <div className="w-1/2">
                        <div className="flex justify-between py-2 border-b border-gray-300">
                            <span className="font-bold text-gray-700">PROJECT TOTAL</span>
                            <span className="font-bold text-gray-900">{formatCurrency(totals?.finalClientTotal || details?.totalAmount || 0)}</span>
                        </div>
                        {/* Payment Terms? */}
                        {details.paymentTerms && (
                            <div className="mt-4 text-xs text-gray-500 text-right">
                                <p className="font-bold text-gray-700">Payment Terms</p>
                                <p>{details.paymentTerms}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 6. STATEMENT OF WORK (DYNAMTIC HEADER) */}
            <div className="break-before-page"></div>
            <div className="pt-8">
                <SectionHeader title={`STATEMENT OF WORK: ${details.proposalName || "PROJECT"}`} />

                <div className="space-y-8 text-[11px] leading-relaxed text-gray-700">
                    <section>
                        <h4 style={{ color: PDF_COLORS.FRENCH_BLUE }} className="font-bold border-b border-gray-100 pb-1 mb-2 tracking-wide">1. PHYSICAL INSTALLATION</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>ANC will furnish and install necessary structural secondary steel/aluminum framing for LED display mounting.</li>
                            <li>Installation includes mounting of all LED display cabinets, internal cabling, and module populating.</li>
                            <li>Includes final alignment, seam adjustments, and physical cleaning of display surfaces.</li>
                            <li>Assumes standard union/non-union labor rates as defined in the project scope document.</li>
                        </ul>
                    </section>

                    <section>
                        <h4 style={{ color: PDF_COLORS.FRENCH_BLUE }} className="font-bold border-b border-gray-100 pb-1 mb-2 tracking-wide">2. ELECTRICAL & DATA INSTALLATION</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>ANC will provide internal DC power and data distribution within the LED display system.</li>
                            <li>Client/Purchaser to provide primary AC power (breakers/panels) and permanent data conduit to the ANC head-end.</li>
                            <li>Includes installation of ANC-specified fiber/CAT6 data backhaul from control room to display location.</li>
                            <li>Integration of all display processors, switchers, and monitoring hardware in the centralized rack.</li>
                        </ul>
                    </section>

                    <section>
                        <h4 style={{ color: PDF_COLORS.FRENCH_BLUE }} className="font-bold border-b border-gray-100 pb-1 mb-2 tracking-wide">3. CONTROL SYSTEM</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Installation and commissioning of the ANC vSOFT™ Control System or specified CMS platform.</li>
                            <li>Configuration of screen layouts, zones, and content mapping per project specifications.</li>
                            <li>System on-site training for two (2) client operators (approx. 4 hours total).</li>
                            <li>Network configuration for remote monitoring and diagnostics support via ANC Proactive.</li>
                        </ul>
                    </section>

                    <section>
                        <h4 style={{ color: PDF_COLORS.FRENCH_BLUE }} className="font-bold border-b border-gray-100 pb-1 mb-2 tracking-wide">4. GENERAL CONDITIONS</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Price includes one (1) round of submittals and engineering shop drawings.</li>
                            <li>ANC to maintain standard Liability and Workers Comp insurance during on-site performance.</li>
                            <li>Site access, lift equipment, and storage staging areas to be provided by Purchaser unless specifically cited as an ANC line item.</li>
                            <li>Final acceptance based on "No-Fault" commissioning of 99.9% pixel integrity.</li>
                        </ul>
                    </section>
                </div>
            </div>

            {/* 7. SIGNATURE (Moved below SOW for finality) */}
            <div className="mt-12 break-inside-avoid">
                <div className="border-t-2 border-gray-300 pt-8 flex justify-between gap-12">
                    <div className="flex-1">
                        <p className="font-bold text-[#0A52EF] mb-12">Agreed To And Accepted By:</p>
                        <div className="border-b border-black mb-2"></div>
                        <p className="text-xs font-bold text-gray-600">Signature</p>

                        <div className="border-b border-black mb-2 mt-8"></div>
                        <p className="text-xs font-bold text-gray-600">Date</p>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-[#0A52EF] mb-12">{receiver.name}</p>
                        <div className="border-b border-black mb-2"></div>
                        <p className="text-xs font-bold text-gray-600">Printed Name</p>

                        <div className="border-b border-black mb-2 mt-8"></div>
                        <p className="text-xs font-bold text-gray-600">Title</p>
                    </div>
                </div>
            </div>

        </ProposalLayout>
    );
};

export default ProposalTemplate2;
