"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Calculator, DollarSign, Settings2, Percent, TrendingUp, AlertCircle, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AuditTable from "@/app/components/proposal/AuditTable";
import { formatCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

// Educational Tooltip Component
const EduTooltip = ({ children, content }: { children: React.ReactNode; content: string }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-help">
                    {children}
                    <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-[#0A52EF] transition-colors" />
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
            >
                <p className="text-xs leading-relaxed">{content}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const Step3Math = () => {
    const { control, setValue, watch } = useFormContext();
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

    // Apply global margin to all screens
    const applyGlobalMargin = (margin: number) => {
        screens.forEach((_screen: any, index: number) => {
            setValue(`details.screens[${index}].desiredMargin`, margin);
        });
        setValue("details.globalMargin", margin);
    };

    // Apply global bond rate
    const applyGlobalBondRate = (rate: number) => {
        setValue("details.bondRate", rate);
        setValue("details.globalBondRate", rate);
    };

    return (
        <TooltipProvider>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Selling Price Card - With Gut Check Tooltip */}
                    <Card className="bg-blue-600 border-none text-white shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help">
                                                <p className="text-white/70 text-[11px] font-medium mb-1">
                                                    Selling Price / SqFt
                                                </p>
                                                <Info className="w-3.5 h-3.5 text-white/60 hover:text-white transition-colors" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                        >
                                            <p className="text-xs leading-relaxed">
                                                <strong className="text-[#0A52EF]">Market Benchmark:</strong> This value helps you compare this bid's competitiveness against historical stadium projects. Adjust your margin to hit your "Gut Check" number.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <h3 className="text-xl font-semibold">
                                        {formatCurrency(sellPricePerSqFt)} <span className="text-sm font-normal opacity-70">/ SqFt</span>
                                    </h3>
                                </div>
                                <div className="p-3 bg-white/10 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Project Value Card */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-zinc-500 text-[11px] font-medium mb-1">
                                        Total Project Value
                                    </p>
                                    <h3 className="text-lg font-semibold text-zinc-100">
                                        {formatCurrency(totalProjectValue)}
                                    </h3>
                                </div>
                                <div className="p-3 bg-emerald-500/10 rounded-xl">
                                    <TrendingUp className="w-8 h-8 text-emerald-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mirror Mode Card - With Mode Clarity Tooltip */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                            <p className="text-zinc-500 text-[11px] font-medium mb-1">
                                                Calculation Mode
                                            </p>
                                            <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 transition-colors" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                    >
                                        <p className="text-xs leading-relaxed">
                                            <strong className="text-[#0A52EF]">Pass-Through Mode:</strong> Enable this to ignore internal calculations and mirror the exact rows and prices from an uploaded Estimator Excel for 1:1 PDF skinning.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>

                                <h3 className="text-base font-semibold text-zinc-200">
                                    {mirrorMode ? "Excel Pass-Through" : "ANC Strategic Estimator"}
                                </h3>
                                <p className="text-zinc-500 text-[10px] mt-1 italic">
                                    {mirrorMode
                                        ? "Using values from imported Excel"
                                        : "Using internal formulas & logic"
                                    }
                                </p>
                            </div>
                            <Switch
                                checked={mirrorMode}
                                onCheckedChange={(checked) => setValue("details.mirrorMode", checked)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Global Pricing Controls */}
                {!mirrorMode && (
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#0A52EF]/20">
                                    <Settings2 className="w-5 h-5 text-[#0A52EF]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-sm font-bold">Global Pricing Controls</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">
                                        Apply settings to all {screens.length} screen{screens.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Global Margin Slider - With Natalia Math Tooltip */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Label className="text-xs font-semibold text-zinc-400 flex items-center gap-2 cursor-help">
                                                <Percent className="w-4 h-4 text-zinc-500" />
                                                Global Margin Target
                                                <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-[#0A52EF] transition-colors" />
                                            </Label>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                        >
                                            <p className="text-xs leading-relaxed">
                                                <strong className="text-[#0A52EF]">Using ANC Strategic Logic:</strong> We use the Divisor Model <code className="bg-zinc-700 px-1 rounded">[Cost / (1 - Margin)]</code> to ensure your P&L profit matches your target percentage exactly.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <span className="text-base font-semibold text-blue-500">
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
                                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />

                                <div className="flex justify-between text-xs text-zinc-500">
                                    <span>0%</span>
                                    <span className="text-yellow-500">⚠️ Low margin zone</span>
                                    <span>80%</span>
                                </div>
                            </div>

                            {/* Global Bond Rate - With Bond Explanation Tooltip */}
                            <div className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                <div className="flex-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Label className="text-xs font-semibold text-zinc-400 flex items-center gap-2 cursor-help">
                                                <AlertCircle className="w-4 h-4 text-zinc-500" />
                                                Bond Rate (%)
                                                <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-[#0A52EF] transition-colors" />
                                            </Label>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                        >
                                            <p className="text-xs leading-relaxed">
                                                <strong className="text-[#0A52EF]">Performance Bond:</strong> A flat 1.5% insurance fee applied to the Sell Price after the margin has been calculated.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <p className="text-xs text-zinc-500 mt-1">
                                        Applied to total project value
                                    </p>
                                </div>

                                <Input
                                    type="number"
                                    step="0.1"
                                    className="w-24 text-right bg-zinc-950 border-zinc-700"
                                    value={globalBondRate}
                                    onChange={(e) => applyGlobalBondRate(parseFloat(e.target.value))}
                                />
                            </div>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] text-zinc-500 font-medium w-full mb-1">Quick Margin Presets:</span>
                                {[
                                    { label: "Conservative", value: 0.15, color: "yellow" },
                                    { label: "Standard", value: 0.25, color: "blue" },
                                    { label: "Aggressive", value: 0.35, color: "emerald" },
                                    { label: "Premium", value: 0.50, color: "purple" },
                                ].map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => applyGlobalMargin(preset.value)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                                            globalMargin === preset.value
                                                ? `bg-${preset.color}-500/20 border-${preset.color}-500 text-${preset.color}-400`
                                                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                        )}
                                    >
                                        {preset.label} ({(preset.value * 100).toFixed(2)}%)
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Audit Table */}
                <Card className="bg-zinc-950/50 border border-zinc-800/40 backdrop-blur-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#0A52EF]/20">
                                <Calculator className="w-5 h-5 text-[#0A52EF]" />
                            </div>
                            <div>
                                <CardTitle className="text-zinc-100 text-sm font-bold">Internal Audit & P&L</CardTitle>
                                <CardDescription className="text-zinc-500 text-xs">
                                    Detailed per-screen profitability analysis
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <AuditTable bondRateOverride={bondRate} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
};

export default Step3Math;
