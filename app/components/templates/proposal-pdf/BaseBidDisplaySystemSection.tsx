import React from "react";
import { formatCurrency } from "@/lib/helpers";
import { ProposalType } from "@/types";

type BaseBidDisplaySystemSectionProps = {
    data: ProposalType;
};

export default function BaseBidDisplaySystemSection({ data }: BaseBidDisplaySystemSectionProps) {
    const { details } = data;
    const screens = details?.screens || [];
    const internalAudit = (details as any).internalAudit;
    const softCostItems = internalAudit?.softCostItems || [];

    const getScreenLabel = (screen: any) => {
        const label = (screen?.externalName || screen?.name || "Display").toString().trim();
        return label.length > 0 ? label : "Display";
    };

    const screenRows = screens
        .map((screen: any) => {
            const audit = internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
            const price = Number(
                audit?.breakdown?.sellPrice ||
                (screen.lineItems || []).reduce((acc: number, li: any) => acc + (li.price || 0), 0) ||
                0
            );
            if (price <= 0) return null;
            return { label: getScreenLabel(screen), price, kind: "screen" as const };
        })
        .filter(Boolean) as Array<{ label: string; price: number; kind: "screen" }>;

    const softRows = softCostItems
        .map((item: any) => {
            const price = Number(item?.sell || 0);
            if (price <= 0) return null;
            return { label: item?.name || "Soft Cost", price, kind: "soft" as const };
        })
        .filter(Boolean) as Array<{ label: string; price: number; kind: "soft" }>;

    const rows = [...screenRows, ...softRows];
    const subtotal = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

    if (rows.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center border-b border-black pb-2 mb-3">
                <h4 className="text-[13px] font-bold text-black">Project Total</h4>
                <h4 className="text-[13px] font-bold text-black">Pricing</h4>
            </div>
            <table className="w-full text-[11px] border-collapse break-inside-avoid">
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={`${row.kind}-${idx}`} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} break-inside-avoid`}>
                            <td className={row.kind === "screen" ? "py-2 pr-4 font-medium text-gray-900" : "py-2 pr-4 text-gray-700"}>
                                {row.label}
                            </td>
                            <td className="py-2 text-right text-gray-900 font-medium min-w-[140px]">{formatCurrency(row.price)}</td>
                        </tr>
                    ))}
                    <tr className="border-t-2 border-black">
                        <td className="py-3 pr-4 text-right font-bold text-gray-700 uppercase">Subtotal:</td>
                        <td className="py-3 text-right font-bold text-gray-900 min-w-[140px]">{formatCurrency(subtotal)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
