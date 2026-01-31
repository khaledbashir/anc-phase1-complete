import React from "react";
import { formatNumberWithCommas } from "@/lib/helpers";
import { generateSOWContent, SOWOptions } from "@/lib/sowTemplate";
import { ProposalType } from "@/types";

interface ExhibitAProps {
    data: ProposalType;
}

const ExhibitA_SOW = ({ data }: ExhibitAProps) => {
    const { details, receiver } = data;
    const screens = details?.screens || [];

    const loc = (details?.location || "").toLowerCase();
    const name = (details?.proposalName || "").toLowerCase();
    const isMorgantown = loc.includes("morgantown") || loc.includes("wvu") || loc.includes("puskar") ||
        name.includes("morgantown") || name.includes("wvu") || name.includes("puskar");

    const sowOptions: SOWOptions = {
        documentType: (details as any).documentType || "BUDGET",
        isOutdoor: screens.some((s: any) => s.isOutdoor || s.environment === "OUTDOOR"),
        includeUnionLabor: (details as any).includeUnionLabor || (details as any).isUnionLabor,
        includeSpareParts: (details as any).includeSpareParts,
        atticStockMentioned: (details as any).atticStockMentioned || (details?.additionalNotes || "").toLowerCase().includes("attic stock"),
        isMorgantown,
        structuralTonnage: (details as any).structuralTonnage || (details as any).metadata?.structuralTonnage,
        signalSupport: (details as any).signalSupport || (details as any).metadata?.signalSupport,
        rossCarbonite: (details as any).rossCarbonite || (details as any).metadata?.rossCarbonite,
        vdcpSupport: (details as any).vdcpSupport || (details as any).metadata?.vdcpSupport,
        projectSpecificNotes: details?.additionalNotes,
        clientName: receiver?.name,
        projectLocation: details?.location
    };

    const sowSections = generateSOWContent(sowOptions);

    // Group sections by category for WVU compliance
    const designSections = sowSections.filter(s => s.category === "DESIGN");
    const constructionSections = sowSections.filter(s => s.category === "CONSTRUCTION");
    const constraintSections = sowSections.filter(s => s.category === "CONSTRAINTS");
    const otherSections = sowSections.filter(s => !s.category || s.category === "OTHER");

    return (
        <div className="pt-8">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-[#0A52EF] uppercase tracking-wider">Exhibit A</h2>
                <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest">Statement of Work & Technical Specifications</h3>
            </div>

            {/* 1. Technical Specifications Table */}
            <div className="mb-12">
                <h4 className="text-sm font-bold bg-black text-white py-1 px-3 mb-4 uppercase tracking-widest">1. Technical Specifications</h4>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full text-[10px] border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 text-left">
                                <th className="px-3 py-2 font-bold text-gray-700 w-[40%]">Display Name</th>
                                <th className="px-3 py-2 font-bold text-gray-700">Dimensions (HxW)</th>
                                <th className="px-3 py-2 font-bold text-gray-700">Pitch</th>
                                <th className="px-3 py-2 font-bold text-gray-700">Resolution</th>
                                <th className="px-3 py-2 font-bold text-gray-700">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {screens.map((screen: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-gray-50/50">
                                    <td className="px-3 py-2 font-bold text-[#0A52EF] w-[40%]">{screen.name}</td>
                                    <td className="px-3 py-2 text-gray-600">
                                        {Number(screen.heightFt ?? 0).toFixed(2)}' x {Number(screen.widthFt ?? 0).toFixed(2)}'
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">{screen.pitchMm || screen.pixelPitch || 10}mm</td>
                                    <td className="px-3 py-2 text-gray-600">{screen.pixelsH || 0}H x {screen.pixelsW || 0}W</td>
                                    <td className="px-3 py-2 font-bold text-gray-900">{screen.quantity || 1}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. DESIGN SERVICES */}
            {designSections.length > 0 && (
                <div className="mb-12">
                    <h4 className="text-sm font-bold bg-[#0A52EF] text-white py-1 px-3 mb-6 uppercase tracking-widest">2. Design & Engineering Services</h4>
                    <div className="space-y-6 px-2">
                        {designSections.map((section, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <h5 className="text-[11px] font-bold text-[#0A52EF] border-b border-gray-100 pb-1 mb-2 uppercase tracking-wider">{section.title}</h5>
                                <p className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-wrap text-justify">{section.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. CONSTRUCTION SERVICES */}
            {constructionSections.length > 0 && (
                <div className="mb-12">
                    <h4 className="text-sm font-bold bg-[#0A52EF] text-white py-1 px-3 mb-6 uppercase tracking-widest">3. Construction & Technical Logistics</h4>
                    <div className="space-y-6 px-2">
                        {constructionSections.map((section, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <h5 className="text-[11px] font-bold text-[#0A52EF] border-b border-gray-100 pb-1 mb-2 uppercase tracking-wider">{section.title}</h5>
                                <p className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-wrap text-justify">{section.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. PROJECT CONSTRAINTS & COMPLIANCE */}
            {(constraintSections.length > 0 || details?.venue) && (
                <div className="mb-12">
                    <h4 className="text-sm font-bold bg-[#0A52EF] text-white py-1 px-3 mb-6 uppercase tracking-widest">4. Project Constraints & Compliance</h4>

                    {/* Venue Specific Dates (REQ-47) - Integrated into Constraints */}
                    {(details?.venue === "Milan Puskar Stadium" || details?.venue === "WVU Coliseum") && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl break-inside-avoid">
                            <h5 className="text-[10px] font-bold text-gray-900 uppercase mb-3 border-b border-gray-300 pb-1">Site Logistics & Liquidated Damages</h5>
                            <div className="grid grid-cols-2 gap-4 text-[10px]">
                                <div>
                                    <span className="font-bold text-gray-500 uppercase">Substantial Completion:</span>
                                    <p className="text-brand-blue font-bold">
                                        {details?.venue === 'Milan Puskar Stadium' ? 'July 30, 2020' : 'August 28, 2020'}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-bold text-gray-500 uppercase">Liquidated Damages:</span>
                                    <p className="text-red-600 font-bold">
                                        {details?.venue === 'Milan Puskar Stadium' ? '$2,500 per day' : '$5,000 per day'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 px-2">
                        {constraintSections.map((section, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <h5 className="text-[11px] font-bold text-[#0A52EF] border-b border-gray-100 pb-1 mb-2 uppercase tracking-wider">{section.title}</h5>
                                <p className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-wrap text-justify">{section.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* OTHER / GENERAL */}
            {otherSections.length > 0 && (
                <div className="mb-12">
                    <div className="space-y-6 px-2">
                        {otherSections.map((section, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <h5 className="text-[11px] font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2 uppercase tracking-wider">{section.title}</h5>
                                <p className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-wrap text-justify">{section.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExhibitA_SOW;
