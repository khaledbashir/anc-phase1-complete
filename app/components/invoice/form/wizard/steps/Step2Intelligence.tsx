"use client";

import { useFormContext } from "react-hook-form";
import { Calculator, FileText, Wand2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Screens } from "@/app/components";
import { RFPQuestionsPanel } from "@/app/components/RFPQuestionsPanel";

const Step2Intelligence = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-6">
                {/* Screen Specs (Main Work Area) - Now Full Width per pruning rules */}
                <div className="space-y-6">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Calculator className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-zinc-100 text-base">Screen Configurations</CardTitle>
                                        <CardDescription className="text-zinc-500 text-xs">Define technical specifications for the display system.</CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Screens />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Step2Intelligence;
