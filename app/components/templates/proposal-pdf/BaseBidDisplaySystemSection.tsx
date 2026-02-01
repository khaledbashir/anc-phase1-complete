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

    const hasRows =
        screens.some((screen: any) => {
            const audit = internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
            const price = audit?.breakdown?.sellPrice || (screen.lineItems || []).reduce((acc: number, li: any) => acc + (li.price || 0), 0);
            return Number(price) > 0;
        }) || softCostItems.some((item: any) => Number(item?.sell || 0) > 0);

    if (!hasRows) return null;

    return (
        <div className="mb-8 p-6 border border-gray-200 rounded-2xl bg-gray-50/30">
            <h4 className="text-sm font-bold border-b border-black pb-2 mb-6 uppercase tracking-widest">1. Base Bid Display System(s)</h4>
            <table className="w-full text-[11px]">
                <tbody>
                    {screens.map((screen: any, idx: number) => {
                        const audit = internalAudit?.perScreen?.find((s: any) => s.id === screen.id || s.name === screen.name);
                        const price = audit?.breakdown?.sellPrice || (screen.lineItems || []).reduce((acc: number, li: any) => acc + (li.price || 0), 0);
                        if (Number(price) <= 0) return null;

                        return (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="py-3 pr-4 font-bold text-[#0A52EF]">{screen.name}</td>
                                <td className="py-3 text-right font-bold text-gray-900 min-w-[120px]">{formatCurrency(price)}</td>
                            </tr>
                        );
                    })}
                    {softCostItems.map((item: any, idx: number) => {
                        const sell = Number(item?.sell || 0);
                        if (sell <= 0) return null;

                        return (
                            <tr key={`soft-${idx}`} className="border-b border-gray-200 bg-gray-50/50">
                                <td className="py-3 pr-4 font-bold text-gray-700">{item.name}</td>
                                <td className="py-3 text-right font-bold text-gray-900 min-w-[120px]">{formatCurrency(sell)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
