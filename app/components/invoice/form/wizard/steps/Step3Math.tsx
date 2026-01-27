"use client";

import { useFormContext } from "react-hook-form";
import { Calculator, DollarSign } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuditTable from "@/app/components/invoice/AuditTable";

const Step3Math = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-zinc-100 font-montserrat">Step 3: The Natalia Math</h2>
                <p className="text-zinc-400 text-sm">Finalize margins and review the P&L breakdown.</p>
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
                        <AuditTable />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Step3Math;
