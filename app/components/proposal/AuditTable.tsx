"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { formatCurrency } from "@/lib/helpers";

const AuditTable = ({ bondRateOverride = 1.5 }: { bondRateOverride?: number }) => {
  const { control } = useFormContext();
  const internalAudit = useWatch({
    name: "details.internalAudit",
    control,
  });

  if (!internalAudit || !internalAudit.perScreen) {
    return <div className="p-8 text-center text-zinc-500 italic">No screen data available for audit.</div>;
  }

  const { perScreen, totals } = internalAudit;

  // DYNAMIC RE-CALCULATION FUNCTION
  // We re-calculate the displayed values based on the bond override.
  // Note: We are NOT saving these back to the global state in this view, 
  // but for a true "Ferrari" experience, they should probably sync. 
  // For now, visual override for the "Math" check.

  const calculateRow = (screen: any) => {
    const b = screen.breakdown;
    const services = b.structure + b.install + b.labor + b.power + b.shipping + b.pm + b.engineering;

    // Bond is typically on the SELL PRICE or the TOTAL COST?
    // "1.5% Bond on Top of everything" implies calculating it on the summation of other costs+margin?
    // Or is it 1.5% of the Final Sell Price? Usually Bond is a % of the total contract value.
    // Let's assume % of (Cost + Margin).
    // Let's reverse engineer: existing bond = b.bondCost.
    // If we assume existing was 1.5%, new bond = (b.bondCost / 1.5) * bondRateOverride.
    // Fallback: Bond = 1.5% of (Total Cost + Margin).

    const subTotal = b.sellPrice; // Assuming sellPrice includes margin but not bond? Or is sellPrice the final?
    // Looking at import service: finalClientTotal = sellPrice + bondCost? No.
    // import service: finalClientTotal = row[25]
    // bondCost = row[24]
    // sellPrice = row[22]
    // It seems finalClientTotal ~ sellPrice + bondCost.

    // We will perform a live calculation:
    // Base = b.sellPrice (which includes margin).
    const newBond = (b.sellPrice * (bondRateOverride / 100));
    const newTotal = b.sellPrice + newBond;
    const marginPct = b.sellPrice > 0 ? (b.ancMargin / b.sellPrice) * 100 : 0; // Margin % is based on Sell Price usually

    return {
      ...b,
      services,
      bondCost: newBond,
      finalClientTotal: newTotal,
      marginPct
    };
  };

  // Re-calc totals dynamically
  let dynamicTotals = {
    hardware: 0, services: 0, totalCost: 0, sellPrice: 0, bondCost: 0, ancMargin: 0, finalClientTotal: 0
  };

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
        <div className="col-span-1 text-right text-yellow-500">Bond ({bondRateOverride}%)</div>
        <div className="col-span-1 text-right text-green-500">Margin $</div>
        <div className="col-span-1 text-right text-green-500">Margin %</div>
        <div className="col-span-1 text-right text-white">Client Total</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-zinc-800/50 bg-zinc-900/30">
        {perScreen.map((screen: any, idx: number) => {
          const calc = calculateRow(screen);

          // Accumulate totals
          dynamicTotals.hardware += calc.hardware;
          dynamicTotals.services += calc.services;
          dynamicTotals.totalCost += calc.totalCost;
          dynamicTotals.sellPrice += calc.sellPrice;
          dynamicTotals.bondCost += calc.bondCost;
          dynamicTotals.ancMargin += calc.ancMargin;
          dynamicTotals.finalClientTotal += calc.finalClientTotal;

          return (
            <div key={idx} className="grid grid-cols-12 gap-2 p-3 hover:bg-zinc-800/50 transition-colors items-center text-zinc-300">
              <div className="col-span-2 font-semibold truncate" title={screen.name}>
                {screen.name}
                <div className="text-[10px] text-zinc-500 font-normal">{screen.pixelMatrix}</div>
              </div>
              <div className="col-span-1 text-right">{screen.quantity}</div>
              <div className="col-span-1 text-right">{screen.areaSqFt.toFixed(0)} sf</div>
              <div className="col-span-1 text-right text-indigo-300/80">{formatCurrency(calc.hardware)}</div>
              <div className="col-span-1 text-right text-indigo-300/80">{formatCurrency(calc.services)}</div>
              <div className="col-span-1 text-right text-red-300/80">{formatCurrency(calc.totalCost)}</div>
              <div className="col-span-1 text-right text-blue-300 font-bold">{formatCurrency(calc.sellPrice)}</div>
              <div className="col-span-1 text-right text-yellow-600/80">{formatCurrency(calc.bondCost)}</div>
              <div className="col-span-1 text-right text-green-400/80">{formatCurrency(calc.ancMargin)}</div>
              <div className={`col-span-1 text-right font-bold ${calc.marginPct < 20 ? 'text-red-500' : 'text-green-500'}`}>
                {calc.marginPct.toFixed(1)}%
              </div>
              <div className="col-span-1 text-right text-white font-bold">{formatCurrency(calc.finalClientTotal)}</div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer */}
      <div className="grid grid-cols-12 gap-2 bg-zinc-950 p-4 rounded-b-lg border-t-2 border-zinc-700 text-sm font-bold mt-2">
        <div className="col-span-2 text-white">PROJECT TOTALS</div>
        <div className="col-span-1 text-right text-zinc-500">-</div>
        <div className="col-span-1 text-right text-zinc-500">-</div>
        <div className="col-span-1 text-right text-indigo-400">{formatCurrency(dynamicTotals.hardware)}</div>
        <div className="col-span-1 text-right text-indigo-400">{formatCurrency(dynamicTotals.services)}</div>
        <div className="col-span-1 text-right text-red-400">{formatCurrency(dynamicTotals.totalCost)}</div>
        <div className="col-span-1 text-right text-blue-400">{formatCurrency(dynamicTotals.sellPrice)}</div>
        <div className="col-span-1 text-right text-yellow-500">{formatCurrency(dynamicTotals.bondCost)}</div>
        <div className="col-span-1 text-right text-green-500">{formatCurrency(dynamicTotals.ancMargin)}</div>
        <div className="col-span-1 text-right text-green-500">
          {dynamicTotals.sellPrice > 0 ? ((dynamicTotals.ancMargin / dynamicTotals.sellPrice) * 100).toFixed(1) : "0.0"}%
        </div>
        <div className="col-span-1 text-right text-white text-base">{formatCurrency(dynamicTotals.finalClientTotal)}</div>
      </div>
    </div>
  );
};

export default AuditTable;
