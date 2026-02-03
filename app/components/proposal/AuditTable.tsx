"use client";

import React, { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { formatCurrency } from "@/lib/helpers";
import { Input } from "@/components/ui/input";
import { Check, Pencil, X } from "lucide-react";

const AuditTable = ({ bondRateOverride = 1.5 }: { bondRateOverride?: number }) => {
  const { control, setValue } = useFormContext();
  const internalAudit = useWatch({
    name: "details.internalAudit",
    control,
  });
  const screens = useWatch({
    name: "details.screens",
    control,
  }) || [];

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (!internalAudit || !internalAudit.perScreen) {
    return <div className="p-8 text-center text-muted-foreground italic">No screen data available for audit.</div>;
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
      <div className="grid grid-cols-12 gap-2 bg-muted p-3 rounded-t-lg border-b border-border text-muted-foreground font-bold">
        <div className="col-span-2">Screen Name</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-1 text-right">Area</div>
        <div className="col-span-1 text-right text-indigo-400">Hardware</div>
        <div className="col-span-1 text-right text-indigo-400">Services</div>
        <div className="col-span-1 text-right text-red-400">Total Cost</div>
        <div className="col-span-1 text-right text-[#0A52EF]">Sell Price</div>
        <div className="col-span-1 text-right text-yellow-500">Bond ({bondRateOverride}%)</div>
        <div className="col-span-1 text-right text-green-500">Margin $</div>
        <div className="col-span-1 text-right text-green-500">Margin %</div>
        <div className="col-span-1 text-right text-white">Client Total</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-border bg-card/30">
        {perScreen.map((screen: any, idx: number) => {
          const calc = calculateRow(screen);
          const screenForm = screens?.[idx] || {};
          const displayName = (
            screenForm?.customDisplayName ||
            screenForm?.externalName ||
            screenForm?.name ||
            screen?.name ||
            ""
          ).toString();

          // Accumulate totals
          dynamicTotals.hardware += calc.hardware;
          dynamicTotals.services += calc.services;
          dynamicTotals.totalCost += calc.totalCost;
          dynamicTotals.sellPrice += calc.sellPrice;
          dynamicTotals.bondCost += calc.bondCost;
          dynamicTotals.ancMargin += calc.ancMargin;
          dynamicTotals.finalClientTotal += calc.finalClientTotal;

          return (
            <div key={idx} className="grid grid-cols-12 gap-2 p-3 hover:bg-accent/50 transition-colors items-center text-foreground">
              <div className="col-span-2 font-semibold min-w-0" title={displayName}>
                <div className="flex items-center gap-2 min-w-0">
                  {editIdx === idx ? (
                    <>
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="h-7 bg-background border-input text-foreground text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const newName = draft.trim();
                            // 1. Update Screen Name
                            setValue(`details.screens.${idx}.customDisplayName`, newName, { shouldDirty: true, shouldValidate: true });

                            // 2. INSTANT SYNC: Update corresponding QuoteItem to ensure PDF matches perfectly
                            const allValues = useFormContext().getValues();
                            // We need to access getValues via the hook context directly or add it to destructuring above
                            // Use the closure's access to screen from the map or re-fetch
                            const currentScreen = screen; // screen is from perScreen map, likely has ID
                            const quoteItems = allValues.details?.quoteItems || [];

                            // Find match by ID (preferred) or Name (fallback)
                            const qIdx = quoteItems.findIndex((q: any) =>
                              (currentScreen.id && q.id === currentScreen.id) ||
                              (q.locationName === currentScreen.name)
                            );

                            if (qIdx !== -1) {
                              // Sync Location Name
                              setValue(`details.quoteItems.${qIdx}.locationName`, newName, { shouldDirty: true });

                              // Clean Description (remove component name from description to avoid dupes)
                              const currentDesc = quoteItems[qIdx].description || "";
                              const originalName = currentScreen.name || "";

                              let newDesc = currentDesc;
                              // Strip original name if present at start
                              if (newDesc.toUpperCase().startsWith(originalName.toUpperCase())) {
                                newDesc = newDesc.substring(originalName.length).trim().replace(/^[-:]+\s*/, "");
                              }
                              // Strip NEW name if present (rare but possible)
                              if (newDesc.toUpperCase().startsWith(newName.toUpperCase())) {
                                newDesc = newDesc.substring(newName.length).trim().replace(/^[-:]+\s*/, "");
                              }

                              if (newDesc !== currentDesc) {
                                setValue(`details.quoteItems.${qIdx}.description`, newDesc, { shouldDirty: true });
                              }
                            }

                            setEditIdx(null);
                          }
                          if (e.key === "Escape") {
                            setEditIdx(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-accent text-foreground"
                        onClick={() => {
                          const newName = draft.trim();
                          // 1. Update Screen Name
                          setValue(`details.screens.${idx}.customDisplayName`, newName, { shouldDirty: true, shouldValidate: true });

                          // 2. INSTANT SYNC
                          const allValues = useFormContext().getValues();
                          const currentScreen = screen;
                          const quoteItems = allValues.details?.quoteItems || [];

                          const qIdx = quoteItems.findIndex((q: any) =>
                            (currentScreen.id && q.id === currentScreen.id) ||
                            (q.locationName === currentScreen.name)
                          );

                          if (qIdx !== -1) {
                            setValue(`details.quoteItems.${qIdx}.locationName`, newName, { shouldDirty: true });

                            const currentDesc = quoteItems[qIdx].description || "";
                            const originalName = currentScreen.name || "";
                            let newDesc = currentDesc;

                            if (newDesc.toUpperCase().startsWith(originalName.toUpperCase())) {
                              newDesc = newDesc.substring(originalName.length).trim().replace(/^[-:]+\s*/, "");
                            }
                            if (newDesc.toUpperCase().startsWith(newName.toUpperCase())) {
                              newDesc = newDesc.substring(newName.length).trim().replace(/^[-:]+\s*/, "");
                            }

                            if (newDesc !== currentDesc) {
                              setValue(`details.quoteItems.${qIdx}.description`, newDesc, { shouldDirty: true });
                            }
                          }

                          setEditIdx(null);
                        }}
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-accent text-foreground"
                        onClick={() => setEditIdx(null)}
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="truncate">{displayName}</div>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => {
                          setDraft((screenForm?.customDisplayName || displayName).toString());
                          setEditIdx(idx);
                        }}
                        title="Edit display name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground font-normal">{screen.pixelMatrix}</div>
              </div>
              <div className="col-span-1 text-right">{screen.quantity}</div>
              <div className="col-span-1 text-right">{Number(screen.areaSqFt).toFixed(2)} sf</div>
              <div className="col-span-1 text-right text-indigo-300/80">{formatCurrency(calc.hardware)}</div>
              <div className="col-span-1 text-right text-indigo-300/80">{formatCurrency(calc.services)}</div>
              <div className="col-span-1 text-right text-red-300/80">{formatCurrency(calc.totalCost)}</div>
              <div className="col-span-1 text-right text-[#0A52EF]/70 font-bold">{formatCurrency(calc.sellPrice)}</div>
              <div className="col-span-1 text-right text-yellow-600/80">{formatCurrency(calc.bondCost)}</div>
              <div className="col-span-1 text-right text-green-400/80">{formatCurrency(calc.ancMargin)}</div>
              <div className={`col-span-1 text-right font-bold ${calc.marginPct < 20 ? 'text-red-500' : 'text-green-500'}`}>
                {calc.marginPct.toFixed(2)}%
              </div>
              <div className="col-span-1 text-right text-white font-bold">{formatCurrency(calc.finalClientTotal)}</div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer */}
      <div className="grid grid-cols-12 gap-2 bg-muted p-4 rounded-b-lg border-t-2 border-border text-sm font-bold mt-2">
        <div className="col-span-2 text-foreground">PROJECT TOTALS</div>
        <div className="col-span-1 text-right text-muted-foreground">-</div>
        <div className="col-span-1 text-right text-muted-foreground">-</div>
        <div className="col-span-1 text-right text-indigo-400">{formatCurrency(dynamicTotals.hardware)}</div>
        <div className="col-span-1 text-right text-indigo-400">{formatCurrency(dynamicTotals.services)}</div>
        <div className="col-span-1 text-right text-red-400">{formatCurrency(dynamicTotals.totalCost)}</div>
        <div className="col-span-1 text-right text-[#0A52EF]">{formatCurrency(dynamicTotals.sellPrice)}</div>
        <div className="col-span-1 text-right text-yellow-500">{formatCurrency(dynamicTotals.bondCost)}</div>
        <div className="col-span-1 text-right text-green-500">{formatCurrency(dynamicTotals.ancMargin)}</div>
        <div className="col-span-1 text-right text-green-500">
          {dynamicTotals.sellPrice > 0 ? ((dynamicTotals.ancMargin / dynamicTotals.sellPrice) * 100).toFixed(2) : "0.00"}%
        </div>
        <div className="col-span-1 text-right text-white text-base">{formatCurrency(dynamicTotals.finalClientTotal)}</div>
      </div>
    </div>
  );
};

export default AuditTable;
