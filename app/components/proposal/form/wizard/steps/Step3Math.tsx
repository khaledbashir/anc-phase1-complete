"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
    Calculator,
    DollarSign,
    Settings2,
    Percent,
    TrendingUp,
    AlertCircle,
    Info,
    Shield,
    Hammer,
    Truck,
    Sparkles,
    ArrowRight,
    Receipt,
    Plus,
    Trash2,
    Wand2
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AuditTable from "@/app/components/proposal/AuditTable";
import { formatCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { calculateProposalAudit } from "@/lib/estimator";
import { Textarea } from "@/components/ui/textarea";
import { BaseButton } from "@/app/components";

const Step3Math = () => {
    const { control, setValue, watch, getValues } = useFormContext();
    const internalAudit = useWatch({
        name: "details.internalAudit",
        control,
    });

    const screens = watch("details.screens") || [];
    const quoteItems = watch("details.quoteItems") || [];
    const bondRate = useWatch({ name: "details.bondRate", control }) || 1.5;
    const mirrorMode = useWatch({ name: "details.mirrorMode", control });

    // Global pricing controls
    const globalMargin = useWatch({ name: "details.globalMargin", control });
    const globalBondRate = useWatch({ name: "details.globalBondRate", control }) || 1.5;

    const totals = internalAudit?.totals;
    const sellPricePerSqFt = totals?.sellingPricePerSqFt || 0;
    const totalProjectValue = totals?.finalClientTotal || 0;
    const structuralLabor = totals?.labor || 0;
    const shippingLogistics = totals?.shipping || 0;

    const newId = () => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
            return (crypto as any).randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const setQuoteItems = (items: any[]) => {
        setValue("details.quoteItems", items, { shouldDirty: true, shouldValidate: true });
    };

    const addQuoteItem = () => {
        setQuoteItems([
            ...quoteItems,
            { id: newId(), locationName: "NEW ITEM", description: "", price: 0 },
        ]);
    };

    const removeQuoteItem = (index: number) => {
        const next = [...quoteItems];
        next.splice(index, 1);
        setQuoteItems(next);
    };

    const updateQuoteItem = (index: number, patch: any) => {
        const next = [...quoteItems];
        next[index] = { ...next[index], ...patch };
        setQuoteItems(next);
    };

    const toWholeFeet = (value: any) => {
        const n = Number(value);
        if (!isFinite(n)) return "";
        return `${Math.round(n)}'`;
    };

    const toExactFeet = (value: any) => {
        const n = Number(value);
        if (!isFinite(n)) return "";
        return `${(Math.round(n * 100) / 100).toFixed(2)}'`;
    };

    const buildDescriptionFromScreen = (screen: any) => {
        const serviceType = (screen?.serviceType || "").toString().toLowerCase();
        const serviceLabel = serviceType.includes("top") ? "Ribbon Display" : serviceType ? "Video Display" : "Display";
        const heightFt = screen?.heightFt ?? screen?.height;
        const widthFt = screen?.widthFt ?? screen?.width;
        const pitchMm = screen?.pitchMm ?? screen?.pixelPitch;
        const qty = screen?.quantity || 1;
        const brightness = screen?.brightnessNits ?? screen?.brightness ?? screen?.nits;
        const label = (screen?.externalName || screen?.name || "Display").toString().trim() || "Display";

        const parts: string[] = [];
        parts.push(`${label} - ${serviceLabel}`);
        if (heightFt != null && widthFt != null && Number(heightFt) > 0 && Number(widthFt) > 0) {
            parts.push(`${toWholeFeet(heightFt)} H x ${toWholeFeet(widthFt)} W`);
            parts.push(`${toExactFeet(heightFt)} H x ${toExactFeet(widthFt)} W`);
        }
        if (pitchMm != null && Number(pitchMm) > 0) {
            let np = Number(pitchMm);
            if (np > 100) np /= 100;
            if (np > 50) np /= 10;
            parts.push(`${np < 2 ? np.toFixed(2) : (np % 1 === 0 ? Math.round(np) : np.toFixed(2))}mm`);
        }
        if (brightness != null && brightness !== "" && Number(brightness) > 0) {
            parts.push(`${Number(brightness).toLocaleString()} Brightness`);
        }
        parts.push(`QTY ${qty}`);
        return parts.filter(Boolean).join(" - ");
    };

    const autofillQuoteFromScreens = () => {
        const perScreen = internalAudit?.perScreen || [];
        const items = (screens || []).map((s: any, idx: number) => {
            const auditRow = perScreen.find((r: any) => r.id === s.id || r.name === s.name);
            const price = auditRow?.breakdown?.finalClientTotal || auditRow?.breakdown?.sellPrice || 0;
            return {
                id: s.id || newId(),
                locationName: (s.externalName || s.name || `ITEM ${idx + 1}`).toString().toUpperCase(),
                description: buildDescriptionFromScreen(s),
                price: Number(price) || 0,
            };
        });
        setQuoteItems(items);
    };

    // Apply global margin to all screens
    const applyGlobalMargin = (margin: number) => {
        const currentScreens = getValues("details.screens") || [];

        // Update all screens with new margin - FORCE DEEP CLONE
        const updatedScreens = currentScreens.map((s: any) => ({
            ...s,
            desiredMargin: margin,
            // If we wanted to be extra safe, we could wipe derived values to force recalc
            // but calculateProposalAudit should handle it based on inputs
        }));

        console.log("Applying Global Margin:", margin, "to", updatedScreens.length, "screens");

        // Update screens in form - Use object with timestamp to force change detection if needed
        setValue("details.screens", updatedScreens, { shouldValidate: true, shouldDirty: true });
        setValue("details.globalMargin", margin, { shouldValidate: true, shouldDirty: true });

        // Recalculate audit IMMEDIATELY to update UI
        try {
            const audit = calculateProposalAudit(updatedScreens, {
                taxRate: getValues("details.taxRateOverride"),
                bondPct: getValues("details.bondRateOverride"),
                structuralTonnage: getValues("details.metadata.structuralTonnage"),
                reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
                projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
                venue: getValues("details.venue"),
            });
            setValue("details.internalAudit", audit.internalAudit);
            setValue("details.clientSummary", audit.clientSummary);
        } catch (e) {
            console.error("Audit recalc failed", e);
        }
    };

    // Apply global bond rate
    const applyGlobalBondRate = (rate: number) => {
        setValue("details.bondRate", rate);
        setValue("details.globalBondRate", rate);
        setValue("details.bondRateOverride", rate);

        // Recalculate audit with new bond rate
        try {
            const currentScreens = getValues("details.screens") || [];
            const audit = calculateProposalAudit(currentScreens, {
                taxRate: getValues("details.taxRateOverride"),
                bondPct: rate,
                structuralTonnage: getValues("details.metadata.structuralTonnage"),
                reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
                projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
                venue: getValues("details.venue"),
            });
            setValue("details.internalAudit", audit.internalAudit);
            setValue("details.clientSummary", audit.clientSummary);
        } catch (e) {
            console.error("Audit recalc failed", e);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
                {/* Natalia Math Engine Status */}
                <div className="bg-muted/50 border border-border rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12">
                        <Sparkles className="w-24 h-24 text-brand-blue" />
                    </div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-blue/20 text-brand-blue">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground italic tracking-tight">Natalia Math Engine</h2>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">Phase 3: Automated Engineering & Math</p>
                            </div>
                        </div>

                        {mirrorMode ? (
                            <Badge className="bg-brand-blue/10 text-brand-blue border-brand-blue/20 px-3 py-1 flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                Excel Pass-Through Active
                            </Badge>
                        ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" />
                                Optimizing Strategic Margins
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                        {/* KPI 1: Selling Price / SqFt */}
                        <div className="bg-card p-4 rounded-xl border border-border group hover:border-brand-blue/30 transition-all shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <DollarSign className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Selling Price / SQFT</span>
                            </div>
                            <div className="text-xl font-bold text-foreground tracking-tight">
                                {formatCurrency(sellPricePerSqFt)}
                            </div>
                        </div>

                        {/* KPI 2: Structural Labor */}
                        <div className="bg-card p-4 rounded-xl border border-border group hover:border-brand-blue/30 transition-all shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Hammer className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Structural Labor (15%)</span>
                            </div>
                            <div className="text-xl font-bold text-foreground tracking-tight">
                                {formatCurrency(structuralLabor)}
                            </div>
                        </div>

                        {/* KPI 3: Shipping */}
                        <div className="bg-card p-4 rounded-xl border border-border group hover:border-brand-blue/30 transition-all shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Truck className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Shipping & Logistics</span>
                            </div>
                            <div className="text-xl font-bold text-foreground tracking-tight">
                                {formatCurrency(shippingLogistics)}
                            </div>
                        </div>

                        {/* KPI 4: Overall Value */}
                        <div className="bg-brand-blue/10 p-4 rounded-xl border border-brand-blue/20 group hover:border-brand-blue/40 transition-all">
                            <div className="flex items-center gap-2 text-brand-blue mb-1">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Final Client Total</span>
                            </div>
                            <div className="text-xl font-bold text-white tracking-tight">
                                {formatCurrency(totalProjectValue)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calculation Mode Toggle Card */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                    Calculation Mode
                                </p>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-brand-blue transition-colors cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs bg-popover border-border text-popover-foreground p-3">
                                        <p className="text-xs leading-relaxed">
                                            <strong className="text-brand-blue">Pass-Through Mode:</strong> Enable this to ignore internal calculations and mirror the exact rows and prices from an uploaded Estimator Excel for 1:1 PDF skinning.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <h3 className="text-base font-bold text-foreground">
                                {mirrorMode ? "Excel Pass-Through Active" : "Strategic Estimator Active"}
                            </h3>
                            <p className="text-muted-foreground text-[10px] mt-1 italic font-medium">
                                {mirrorMode
                                    ? "Locking values to imported Master Excel for verification accuracy."
                                    : "Using proprietary margin logic and formulaic overrides."
                                }
                            </p>
                        </div>
                        <Switch
                            checked={mirrorMode}
                            onCheckedChange={(checked) => setValue("details.mirrorMode", checked)}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </CardContent>
                </Card>

                {/* Sales Quotation Items - Intelligence Mode only */}
                {!mirrorMode && (<Card className="bg-muted/50 border-border">
                    <CardHeader className="pb-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-blue/20">
                                <Receipt className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-foreground text-sm font-bold uppercase tracking-tight">Sales Quotation Items</CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">
                                    These lines drive the Project Total / Pricing blocks in the PDF.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <BaseButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={autofillQuoteFromScreens}
                                >
                                    <Wand2 className="w-4 h-4" />
                                    Auto-fill
                                </BaseButton>
                                <BaseButton
                                    type="button"
                                    size="sm"
                                    onClick={addQuoteItem}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </BaseButton>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {quoteItems.length === 0 ? (
                            <div className="text-xs text-muted-foreground">
                                No quotation items yet. Click Add or Auto-fill from screens.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {quoteItems.map((it: any, idx: number) => (
                                    <div key={it.id || idx} className="rounded-2xl border border-border bg-card/30 p-4 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Location</Label>
                                                <Input
                                                    value={it.locationName || ""}
                                                    onChange={(e) => updateQuoteItem(idx, { locationName: e.target.value })}
                                                    className="mt-2 bg-background border-input text-foreground"
                                                />
                                            </div>
                                            <div className="w-[180px]">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price</Label>
                                                <Input
                                                    value={String(it.price ?? "")}
                                                    onChange={(e) => updateQuoteItem(idx, { price: Number(e.target.value || 0) })}
                                                    className="mt-2 bg-background border-input text-foreground"
                                                    inputMode="decimal"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeQuoteItem(idx)}
                                                className="mt-6 p-2 rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground hover:border-brand-blue/30 transition-colors"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                                            <Textarea
                                                value={it.description || ""}
                                                onChange={(e) => updateQuoteItem(idx, { description: e.target.value })}
                                                className="mt-2 bg-background border-input text-foreground min-h-[84px]"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>)}

                {/* Excel Values Summary - Mirror Mode only */}
                {mirrorMode && (
                    <Card className="bg-muted/50 border-border">
                        <CardHeader className="pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-blue/20">
                                    <Shield className="w-5 h-5 text-brand-blue" />
                                </div>
                                <div>
                                    <CardTitle className="text-foreground text-sm font-bold uppercase tracking-tight">
                                        Excel Values Summary
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground text-xs">
                                        Read-only pass-through from imported Estimator Excel
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {internalAudit?.perScreen && internalAudit.perScreen.length > 0 ? (
                                <div className="space-y-3">
                                    {internalAudit.perScreen.map((screen: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/30">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-foreground truncate">
                                                    {screens[idx]?.externalName || screens[idx]?.name || screen.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Qty {screen.quantity} | {Number(screen.areaSqFt).toFixed(1)} sqft
                                                    {screen.pixelMatrix && ` | ${screen.pixelMatrix}`}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-sm font-bold text-foreground">
                                                    {formatCurrency(screen.breakdown?.finalClientTotal || 0)}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">Client Total</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between p-3 rounded-xl border-2 border-brand-blue/20 bg-brand-blue/5">
                                        <div className="text-sm font-bold text-foreground uppercase tracking-tight">
                                            Project Total
                                        </div>
                                        <div className="text-lg font-bold text-brand-blue">
                                            {formatCurrency(internalAudit.totals?.finalClientTotal || 0)}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground text-center py-6">
                                    No Excel data imported yet. Upload an Estimator Excel in the Setup step.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Global Pricing Controls */}
                {!mirrorMode && (
                    <Card className="bg-muted/50 border-border">
                        <CardHeader className="pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-blue/20">
                                    <Settings2 className="w-5 h-5 text-brand-blue" />
                                </div>
                                <div>
                                    <CardTitle className="text-foreground text-sm font-bold uppercase tracking-tight">Global Strategic Controls</CardTitle>
                                    <CardDescription className="text-muted-foreground text-xs">
                                        Apply settings to all {screens.length} screen{screens.length !== 1 ? 's' : ''} in the project.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {/* Global Margin Slider */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Percent className="w-4 h-4 text-brand-blue" />
                                        Global Margin Target
                                    </Label>
                                    <span className="text-lg font-bold text-brand-blue tabular-nums">
                                        {((globalMargin || 0.25) * 100).toFixed(2)}%
                                    </span>
                                </div>

                                <input
                                    type="range"
                                    min="0"
                                    max="0.8"
                                    step="0.01"
                                    value={globalMargin || 0.25}
                                    onChange={(e) => applyGlobalMargin(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                                />

                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                                    <span>0% Base</span>
                                    <span className="text-amber-500/70">⚠️ Competitiveness Alert</span>
                                    <span>80% Max</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Global Bond Rate */}
                                <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-brand-blue" />
                                            Bond Rate (%)
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-brand-blue transition-colors cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs bg-popover border-border text-popover-foreground p-3">
                                                <p className="text-xs leading-relaxed">
                                                    Performance Bond insurance fee applied to the Sell Price after margin calculation. Default: 1.5%
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="bg-background border-input text-foreground font-bold h-9 focus-visible:ring-brand-blue/30"
                                        value={globalBondRate}
                                        onChange={(e) => applyGlobalBondRate(parseFloat(e.target.value))}
                                    />
                                </div>

                                {/* Global Tax Rate - REQ-125 */}
                                <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Receipt className="w-3.5 h-3.5 text-brand-blue" />
                                            Sales Tax Rate (%)
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-brand-blue transition-colors cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs bg-popover border-border text-popover-foreground p-3">
                                                <p className="text-xs leading-relaxed">
                                                    Sales tax applied to (Sell Price + Bond + B&O Tax). Default: 9.5%. Morgantown/WVU projects auto-add 2% B&O Tax.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="20"
                                        className="bg-zinc-950 border-zinc-800 text-white font-bold h-9 focus-visible:ring-brand-blue/30"
                                        value={((watch("details.taxRateOverride") || 0.095) * 100).toFixed(1)}
                                        onChange={(e) => {
                                            const rate = parseFloat(e.target.value) / 100;
                                            setValue("details.taxRateOverride", rate);
                                        }}
                                    />
                                </div>

                                {/* Quick Presets */}
                                <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Strategic Presets</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: "Std", value: 0.25 },
                                            { label: "Agg", value: 0.35 },
                                            { label: "Prem", value: 0.50 },
                                        ].map((preset) => (
                                            <button
                                                key={preset.value}
                                                onClick={() => applyGlobalMargin(preset.value)}
                                                className={cn(
                                                    "px-3 py-1 text-[10px] font-bold uppercase rounded border transition-all",
                                                    globalMargin === preset.value
                                                        ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20"
                                                        : "bg-muted border-border text-muted-foreground hover:border-border"
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Audit Table Section - Intelligence Mode only */}
                {!mirrorMode && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-blue" />
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Strategic P&L Audit</h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-border text-muted-foreground uppercase tracking-widest">
                            Real-time Verification
                        </Badge>
                    </div>

                    <Card className="bg-muted/50 border border-border overflow-hidden">
                        <CardContent className="p-0">
                            <AuditTable bondRateOverride={bondRate} />
                        </CardContent>
                    </Card>
                </div>
                )}
            </div>
        </TooltipProvider>
    );
};

export default Step3Math;
