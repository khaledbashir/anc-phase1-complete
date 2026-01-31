import React from "react";
import { formatCurrency } from "@/lib/helpers";
import { ProposalType } from "@/types";

interface ExhibitBProps {
    data: ProposalType;
}

const ExhibitB_CostSchedule = ({ data }: ExhibitBProps) => {
    const { details, receiver } = data;
    const screens = details?.screens || [];
    const internalAudit = (details as any).internalAudit;
    const totals = internalAudit?.totals;

    const taxRate = (details as any)?.taxRateOverride ?? 0.095;
    const bondRate = (details as any)?.bondRateOverride ?? 0.015;

    const projectSubtotal = totals?.sellPrice || screens.reduce((sum: number, s: any) => {
        const audit = internalAudit?.perScreen?.find((a: any) => a.id === s.id || a.name === s.name);
        return sum + (audit?.breakdown?.sellPrice || 0);
    }, 0);

    const projectBondCost = totals?.bondCost || (projectSubtotal * bondRate);
    const insuranceRate = (details as any).insuranceRateOverride || 0;
    const projectInsuranceCost = projectSubtotal * insuranceRate;

    // Detect WVU / Morgantown Compliance (REQ-WVU)
    const clientName = (details?.clientName || "").toLowerCase();
    const loc = (details?.location || "").toLowerCase();
    const name = (details?.proposalName || "").toLowerCase();
    const isWVU = clientName.includes("wvu") || clientName.includes("west virginia") ||
        loc.includes("morgantown") || loc.includes("wvu") || loc.includes("puskar") ||
        name.includes("morgantown") || name.includes("wvu") || name.includes("puskar") || (details?.venue && details?.venue !== "Generic");

    // B&O Tax (Specific to Morgantown/WVU)
    const projectBoTaxCost = totals?.boTaxCost || (isWVU ? (projectSubtotal + projectBondCost + projectInsuranceCost) * 0.02 : 0);

    const projectTaxableAmount = projectSubtotal + projectBondCost + projectInsuranceCost + projectBoTaxCost;
    const projectSalesTax = projectTaxableAmount * taxRate;
    const projectGrandTotal = projectTaxableAmount + projectSalesTax;

    // Alternates Handling
    const alternates = (details?.items || []).filter((item: any) =>
        item.name.toLowerCase().includes("alternate") || item.description?.toLowerCase().includes("alternate")
    );

    // Change Order Rates
    const overheadRate = (details as any).overheadRate ?? 0.10;
    const profitRate = (details as any).profitRate ?? 0.05;

    // Signatures
    const signerName = (details as any).signerName || "";
    const signerTitle = (details as any).signerTitle || "";

    return (
        <div className="pt-8">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-[#0A52EF] uppercase tracking-wider">Exhibit B</h2>
                <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest">
                    {isWVU ? "Project Cost Schedule (WVU Compliant)" : "Final Cost Schedule"}
                </h3>
            </div>

            {/* 1. Base Bid: Display System Pricing */}
            <div className="mb-8 p-6 border border-gray-200 rounded-2xl bg-gray-50/30">
                <h4 className="text-sm font-bold border-b border-black pb-2 mb-6 uppercase tracking-widest">1. Base Bid Display System(s)</h4>
                <table className="w-full text-[11px]">
                    <tbody>
                        {screens.map((screen: any, idx: number) => {
                            const audit = internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                            const price = audit?.breakdown?.sellPrice || (screen.lineItems || []).reduce((acc: number, li: any) => acc + (li.price || 0), 0);
                            return (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3 pr-4 font-bold text-[#0A52EF]">{screen.name}</td>
                                    <td className="py-3 text-gray-600">Complete LED Display System as per Exhibit A Specifications</td>
                                    <td className="py-3 text-right font-bold text-gray-900 min-w-[120px]">{formatCurrency(price)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 2. Alternates / Options */}
            {alternates.length > 0 && (
                <div className="mb-8 p-6 border border-gray-200 rounded-2xl bg-white">
                    <h4 className="text-sm font-bold border-b border-gray-300 pb-2 mb-6 uppercase tracking-widest text-[#0A52EF]">2. Project Alternates (Add/Deduct)</h4>
                    <table className="w-full text-[11px]">
                        <tbody>
                            {alternates.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                    <td className="py-3 pr-4 font-bold text-gray-800">{item.name}</td>
                                    <td className="py-3 text-gray-500 italic">{item.description || "Project Alternate"}</td>
                                    <td className="py-3 text-right font-bold text-[#0A52EF] min-w-[120px]">{formatCurrency(item.total || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-4 text-[9px] text-gray-400 italic font-medium">* Alternates are not included in the Base Bid Grand Total below unless specifically accepted via initialing here: ________</p>
                </div>
            )}

            {/* 3. Financial Consolidation */}
            <div className="mb-12">
                <h4 className="text-sm font-bold border-b border-black pb-2 mb-6 uppercase tracking-widest">3. Financial Consolidation (Base Bid)</h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project Subtotal:</span>
                        <span className="text-xs font-bold text-gray-900">{formatCurrency(projectSubtotal)}</span>
                    </div>

                    {/* REQ-WVU Mandatory Breakout */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex justify-between items-center px-4 py-2 border border-gray-100 rounded-lg">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Performance Bond ({(bondRate * 100).toFixed(1)}%):</span>
                            <span className="text-xs font-bold text-gray-900">{formatCurrency(projectBondCost)}</span>
                        </div>
                        {(isWVU || projectInsuranceCost > 0) && (
                            <div className="flex justify-between items-center px-4 py-2 border border-gray-100 rounded-lg">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Insurance Cost:</span>
                                <span className="text-xs font-bold text-gray-900">{formatCurrency(projectInsuranceCost)}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {projectBoTaxCost > 0 && (
                            <div className="flex justify-between items-center px-4 py-2 border border-gray-100 rounded-lg">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">WV B&O Tax (2.0%):</span>
                                <span className="text-xs font-bold text-gray-900">{formatCurrency(projectBoTaxCost)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center px-4 py-2 border border-gray-100 rounded-lg">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Sales Tax ({(taxRate * 100).toFixed(1)}%):</span>
                            <span className="text-xs font-bold text-gray-900">{formatCurrency(projectSalesTax)}</span>
                        </div>
                    </div>

                    {/* Change Order Provisions - ONLY rendered for WVU compliance */}
                    {isWVU && (
                        <div className="p-3 border border-dashed border-[#0A52EF]/30 rounded-lg bg-[#0A52EF]/5">
                            <p className="text-[9px] font-bold text-[#0A52EF] uppercase mb-2">Change Order Provisions (Direct Job Cost Additive)</p>
                            <div className="flex gap-8">
                                <div className="text-[10px]">
                                    <span className="text-gray-500 font-bold uppercase">Overhead:</span>
                                    <span className="ml-2 font-bold text-gray-900">{(overheadRate * 100).toFixed(0)}%</span>
                                </div>
                                <div className="text-[10px]">
                                    <span className="text-gray-500 font-bold uppercase">Profit:</span>
                                    <span className="ml-2 font-bold text-gray-900">{(profitRate * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center px-6 py-4 bg-[#0A52EF] text-white rounded-xl shadow-lg mt-6">
                        <span className="text-sm font-bold uppercase tracking-widest">Base Bid Grand Total:</span>
                        <span className="text-2xl font-bold">{formatCurrency(projectGrandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Authorization Block */}
            <div className="mt-16 p-8 border-2 border-dashed border-gray-200 rounded-2xl break-inside-avoid">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-8 text-center italic">Exhibit B Authorization Block</h4>
                <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-widest border-b border-gray-100 pb-1">ANC SPORTS ENTERPRISES, LLC</p>
                        <div className="mt-8 border-b border-black h-8"></div>
                        <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
                            <span>Authorized Signature</span>
                            <span>Date</span>
                        </div>
                        <div className="pt-2">
                            <p className="text-[10px] font-bold text-gray-900">Name: ________________________</p>
                            <p className="text-[10px] font-bold text-gray-900">Title: _________________________</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-widest border-b border-gray-100 pb-1">{receiver?.name?.toUpperCase() || "PURCHASER"} ACCEPTANCE</p>
                        <div className="mt-8 border-b border-black h-8"></div>
                        <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
                            <span>Signature</span>
                            <span>Date</span>
                        </div>
                        <div className="pt-2">
                            <p className="text-[10px] font-bold text-gray-900">Name: <span className="border-b border-gray-300 min-w-[120px] inline-block">{signerName}</span></p>
                            <p className="text-[10px] font-bold text-gray-900">Title: <span className="border-b border-gray-300 min-w-[120px] inline-block">{signerTitle}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExhibitB_CostSchedule;
