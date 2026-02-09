"use client";

import React, { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { formatCurrency } from "@/lib/helpers";
import { Input } from "@/components/ui/input";
import { Check, Pencil, X, Download } from "lucide-react";

const AuditTable = ({ bondRateOverride = 1.5 }: { bondRateOverride?: number }) => {
  const { control, setValue, getValues } = useFormContext();
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

  // P59: Export Audit CSV
  const exportAuditCSV = () => {
    if (!internalAudit?.perScreen) return;
    const headers = ["Screen Name","Qty","Area (sqft)","Hardware","Structure","Install","Labor","Power","Shipping","PM","Gen Conditions","Travel","Submittals","Engineering","Permits","CMS","Demolition","Total Cost","Sell Price","Bond","Margin $","Margin %","B&O Tax","Sales Tax","Final Client Total"];
    const rows = internalAudit.perScreen.map((s: any, idx: number) => {
      const b = s.breakdown;
      const screenForm = screens?.[idx] || {};
      const name = (screenForm?.customDisplayName || screenForm?.externalName || screenForm?.name || s?.name || "").toString().replace(/,/g, " ");
      const marginPct = b.sellPrice > 0 ? ((b.ancMargin / b.sellPrice) * 100).toFixed(2) : "0";
      return [name, s.quantity, s.areaSqFt?.toFixed(2), b.hardware, b.structure, b.install, b.labor, b.power, b.shipping, b.pm, b.generalConditions, b.travel, b.submittals, b.engineering, b.permits, b.cms, b.demolition, b.totalCost, b.sellPrice, b.bondCost, b.ancMargin, marginPct, b.boTaxCost, b.salesTaxCost, b.finalClientTotal].join(",");
    });
    // Totals row
    const t = internalAudit.totals;
    const totalMarginPct = t.sellPrice > 0 ? ((t.ancMargin / t.sellPrice) * 100).toFixed(2) : "0";
    rows.push(["TOTALS","","",t.hardware,t.structure,t.install,t.labor,t.power,t.shipping,t.pm,t.generalConditions,t.travel,t.submittals,t.engineering,t.permits,t.cms,t.demolition,t.totalCost,t.sellPrice,t.bondCost,t.ancMargin || t.margin,totalMarginPct,t.boTaxCost,"",t.finalClientTotal].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ANC_Audit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!internalAudit || !internalAudit.perScreen) {
    return (
      <div className="min-h-[280px] flex items-center justify-center rounded-lg border border-border bg-muted/30 p-8">
        <p className="text-sm text-foreground/80 text-center max-w-md">
          No screen data available for audit. Add screens in Setup and run the Math step to populate the margin analysis.
        </p>
      </div>
    );
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
    <div className="min-w-[1000px] min-h-[200px] text-xs font-mono rounded-lg overflow-hidden border border-border bg-card/50">
      {/* P59: Export CSV Button */}
      <div className="flex justify-end p-2 border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={exportAuditCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted hover:bg-accent border border-border rounded-md transition-colors"
        >
          <Download className="w-3 h-3" />
          Export Audit CSV
        </button>
      </div>
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

          const saveEdit = () => {
            const newName = draft.trim();
            if (!newName) { setEditIdx(null); return; }
            setValue(`details.screens.${idx}.customDisplayName`, newName, { shouldDirty: true, shouldValidate: true });

            const allValues = getValues();
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
          };

          return editIdx === idx ? (
            /* Edit mode: full-width row for the input */
            <div key={idx} className="flex items-center gap-2 p-3 bg-brand-blue/10 border-b border-border">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-8 flex-1 bg-background border-brand-blue/40 text-foreground text-xs"
                autoFocus
                placeholder="Enter display name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditIdx(null);
                }}
              />
              <button
                type="button"
                className="p-1.5 rounded bg-brand-blue text-white hover:bg-brand-blue/80"
                onClick={saveEdit}
                title="Save (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded bg-muted text-foreground hover:bg-accent"
                onClick={() => setEditIdx(null)}
                title="Cancel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div key={idx} className="grid grid-cols-12 gap-2 p-3 hover:bg-accent/50 transition-colors items-center text-foreground">
              <div className="col-span-2 font-semibold min-w-0" title={displayName}>
                <div className="flex items-center gap-1 min-w-0">
                  <div className="truncate">{displayName}</div>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-brand-blue/20 text-muted-foreground hover:text-brand-blue shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraft((screenForm?.customDisplayName || displayName).toString());
                      setEditIdx(idx);
                    }}
                    title="Edit display name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
