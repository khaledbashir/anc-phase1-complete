"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Calculator, DollarSign, Settings2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuditTable from "@/app/components/invoice/AuditTable";
import { formatCurrency } from "@/lib/helpers";

const Step3Math = () => {
    const { control, setValue } = useFormContext();
    const internalAudit = useWatch({
        name: "details.internalAudit",
        control,
    });

    // Watch or set a bond rate (default to 1.5 if not set)
    // We might need to initialize this in the form if it doesn't exist.
    const bondRate = useWatch({
        name: "details.bondRate",
        control
    }) || 1.5;

    const totals = internalAudit?.totals;
    const sellPricePerSqFt = totals?.sellingPricePerSqFt || 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
            {/* KPI Cards: The Natalia Gut Check */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-[#0A52EF] border-none text-white shadow-[0_10px_30px_rgba(10,82,239,0.3)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1" style={{ fontFamily: "Work Sans, sans-serif" }}>Selling Price / SqFt</p>
                                <h3 className="text-3xl font-bold" style={{ fontFamily: "Work Sans, sans-serif" }}>
                                    {formatCurrency(sellPricePerSqFt)} <span className="text-sm font-normal">/ SqFt</span>
                                </h3>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Mirror Mode</p>
                            <h3 className="text-xl font-bold text-zinc-200">
                                {useWatch({ name: "details.mirrorMode", control }) ? "Excel Pass-Through" : "Active Natalia Math"}
                            </h3>
                            <p className="text-zinc-500 text-[10px] mt-1 italic">
                                {useWatch({ name: "details.mirrorMode", control })
                                    ? "Bypassing internal formulas with Excel values."
                                    : "Using ANC Strategic Estimator logic."}
                            </p>
                        </div>
                        <div className="flex items-center h-full">
                            <input
                                type="checkbox"
                                className="toggle toggle-primary toggle-lg scale-125 cursor-pointer"
                                checked={useWatch({ name: "details.mirrorMode", control })}
                                onChange={(e) => setValue("details.mirrorMode", e.target.checked)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex justify-end mb-2">
                <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-md border border-zinc-800">
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                    <Label className="text-xs text-zinc-400 font-medium">Bond Rate (%)</Label>
                    <Input
                        type="number"
                        step="0.1"
                        className="w-20 h-8 text-right bg-zinc-950 border-zinc-700 text-xs"
                        value={bondRate}
                        onChange={(e) => setValue("details.bondRate", parseFloat(e.target.value))}
                    />
                </div>
            </div>

            <Card className="bg-zinc-950/50 border border-zinc-800/40 backdrop-blur-lg">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#003366]/20">
                            <DollarSign className="w-5 h-5 text-[#003366]" />
                        </div>
                        <div>
                            <CardTitle className="text-zinc-100 text-base">Internal Audit & P&L</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">Detailed per-screen profitability analysis</CardDescription>
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
    );
};

export default Step3Math;
