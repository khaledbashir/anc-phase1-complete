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
    Receipt
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

const Step3Math = () => {
    const { control, setValue, watch, getValues } = useFormContext();
    const internalAudit = useWatch({
        name: "details.internalAudit",
        control,
    });

    const screens = watch("details.screens") || [];
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
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12">
                        <Sparkles className="w-24 h-24 text-brand-blue" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-blue/20 text-brand-blue">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white italic tracking-tight">Natalia Math Engine</h2>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Phase 3: Automated Engineering & Math</p>
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
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 group hover:border-brand-blue/30 transition-all">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <DollarSign className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Selling Price / SQFT</span>
                            </div>
                            <div className="text-xl font-bold text-white tracking-tight">
                                {formatCurrency(sellPricePerSqFt)}
                            </div>
                        </div>
                        
                        {/* KPI 2: Structural Labor */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 group hover:border-brand-blue/30 transition-all">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <Hammer className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Structural Labor (15%)</span>
                            </div>
                            <div className="text-xl font-bold text-white tracking-tight">
                                {formatCurrency(structuralLabor)}
                            </div>
                        </div>

                        {/* KPI 3: Shipping */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 group hover:border-brand-blue/30 transition-all">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <Truck className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Shipping & Logistics</span>
                            </div>
                            <div className="text-xl font-bold text-white tracking-tight">
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
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                                    Calculation Mode
                                </p>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-brand-blue transition-colors cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3">
                                        <p className="text-xs leading-relaxed">
                                            <strong className="text-brand-blue">Pass-Through Mode:</strong> Enable this to ignore internal calculations and mirror the exact rows and prices from an uploaded Estimator Excel for 1:1 PDF skinning.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <h3 className="text-base font-bold text-zinc-200">
                                {mirrorMode ? "Excel Pass-Through Active" : "Strategic Estimator Active"}
                            </h3>
                            <p className="text-zinc-500 text-[10px] mt-1 italic font-medium">
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

                {/* Global Pricing Controls */}
                {!mirrorMode && (
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-blue/20">
                                    <Settings2 className="w-5 h-5 text-brand-blue" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-sm font-bold uppercase tracking-tight">Global Strategic Controls</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">
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
                                <div className="flex flex-col gap-3 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-brand-blue" />
                                            Bond Rate (%)
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="w-3.5 h-3.5 text-zinc-700 hover:text-brand-blue transition-colors cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3">
                                                <p className="text-xs leading-relaxed">
                                                    Performance Bond insurance fee applied to the Sell Price after margin calculation. Default: 1.5%
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="bg-zinc-950 border-zinc-800 text-white font-bold h-9 focus-visible:ring-brand-blue/30"
                                        value={globalBondRate}
                                        onChange={(e) => applyGlobalBondRate(parseFloat(e.target.value))}
                                    />
                                </div>

                                {/* Global Tax Rate - REQ-125 */}
                                <div className="flex flex-col gap-3 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Receipt className="w-3.5 h-3.5 text-brand-blue" />
                                            Sales Tax Rate (%)
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="w-3.5 h-3.5 text-zinc-700 hover:text-brand-blue transition-colors cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3">
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
                                <div className="flex flex-col gap-3 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Strategic Presets</Label>
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
                                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
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

                {/* Audit Table Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-blue" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-tight">Strategic P&L Audit</h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-zinc-800 text-zinc-500 uppercase tracking-widest">
                            Real-time Verification
                        </Badge>
                    </div>
                    
                    <Card className="bg-zinc-950/50 border border-zinc-800/40 overflow-hidden">
                        <CardContent className="p-0">
                            <AuditTable bondRateOverride={bondRate} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default Step3Math;