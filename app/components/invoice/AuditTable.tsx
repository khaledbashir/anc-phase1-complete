"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { formatCurrency } from "@/lib/helpers";

const AuditTable = () => {
  const { control } = useFormContext();
  const internalAudit = useWatch({
    name: "details.internalAudit",
    control,
  });

  if (!internalAudit || !internalAudit.perScreen) {
    return <div className="p-8 text-center text-zinc-500 italic">No screen data available for audit.</div>;
  }

  const { perScreen, totals } = internalAudit;

  return (
    <div className="min-w-[1000px] text-xs font-mono">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-2 bg-zinc-950 p-3 rounded-t-lg border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
        <div className="col-span-2">Screen Name</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-1 text-right">Area</div>
        <div className="col-span-1 text-right text-indigo-400">Hardware</div>
        <div className="col-span-1 text-right text-indigo-400">Services</div>
        <div className="col-span-1 text-right text-red-400">Total Cost</div>
        <div className="col-span-1 text-right text-blue-400">Sell Price</div>
        <div className="col-span-1 text-right text-yellow-500">Bond (1.5%)</div>
        <div className="col-span-1 text-right text-green-500">Margin $</div>
        <div className="col-span-1 text-right text-green-500">Margin %</div>
        <div className="col-span-1 text-right text-white">Client Total</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-zinc-800/50 bg-zinc-900/30">
        {perScreen.map((screen: any, idx: number) => {
          const b = screen.breakdown;
          const marginPct = b.sellPrice > 0 ? (b.ancMargin / b.sellPrice) * 100 : 0;
          const services = b.structure + b.install + b.labor + b.power + b.shipping + b.pm + b.engineering;

          return (
            <div key={idx} className="grid grid-cols-12 gap-2 p-3 hover:bg-zinc-800/50 transition-colors items-center text-zinc-300">
              <div className="col-span-2 font-semibold truncate" title={screen.name}>
                {screen.name}
                <div className="text-[10px] text-zinc-500 font-normal">{screen.pixelMatrix}</div>
              </div>
              <div className="col-span-1 text-right">{screen.quantity}</div>
              <div className="col-span-1 text-right">{screen.areaSqFt.toFixed(0)} sf</div>
              <div className="col-span-1 text-right text-indigo-300/80">{formatCurrency(b.hardware)}</div>
              <div className="col-span-1 text-right text-indigo-300/80">{formatCurrency(services)}</div>
              <div className="col-span-1 text-right text-red-300/80">{formatCurrency(b.totalCost)}</div>
              <div className="col-span-1 text-right text-blue-300 font-bold">{formatCurrency(b.sellPrice)}</div>
              <div className="col-span-1 text-right text-yellow-600/80">{formatCurrency(b.bondCost)}</div>
              <div className="col-span-1 text-right text-green-400/80">{formatCurrency(b.ancMargin)}</div>
              <div className={`col-span-1 text-right font-bold ${marginPct < 20 ? 'text-red-500' : 'text-green-500'}`}>
                {marginPct.toFixed(1)}%
              </div>
              <div className="col-span-1 text-right text-white font-bold">{formatCurrency(b.finalClientTotal)}</div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer */}
      <div className="grid grid-cols-12 gap-2 bg-zinc-950 p-4 rounded-b-lg border-t-2 border-zinc-700 text-sm font-bold mt-2">
        <div className="col-span-2 text-white">PROJECT TOTALS</div>
        <div className="col-span-1 text-right text-zinc-500">-</div>
        <div className="col-span-1 text-right text-zinc-500">-</div>
        <div className="col-span-1 text-right text-indigo-400">{formatCurrency(totals.hardware)}</div>
        <div className="col-span-1 text-right text-indigo-400">
          {formatCurrency(totals.structure + totals.install + totals.labor + totals.power + totals.shipping + totals.pm + totals.engineering)}
        </div>
        <div className="col-span-1 text-right text-red-400">{formatCurrency(totals.totalCost)}</div>
        <div className="col-span-1 text-right text-blue-400">{formatCurrency(totals.sellPrice)}</div>
        <div className="col-span-1 text-right text-yellow-500">{formatCurrency(totals.bondCost)}</div>
        <div className="col-span-1 text-right text-green-500">{formatCurrency(totals.ancMargin)}</div>
        <div className="col-span-1 text-right text-green-500">
          {totals.sellPrice > 0 ? ((totals.ancMargin / totals.sellPrice) * 100).toFixed(1) : "0.0"}%
        </div>
        <div className="col-span-1 text-right text-white text-base">{formatCurrency(totals.finalClientTotal)}</div>
      </div>
    </div>
  );
};

export default AuditTable;
