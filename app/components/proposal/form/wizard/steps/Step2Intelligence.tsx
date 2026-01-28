"use client";

import { useFormContext } from "react-hook-form";
import { Calculator, FileText, Wand2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Screens } from "@/app/components";
import RfpSidebar from "@/app/components/proposal/RfpSidebar";

const Step2Intelligence = () => {
    return (
        <div className="h-[700px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-zinc-900/50 border-zinc-800/50 h-full flex flex-col">
                <CardHeader className="pb-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#0A52EF]/20">
                            <Calculator className="w-5 h-5 text-[#0A52EF]" />
                        </div>
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <CardTitle className="text-zinc-100 text-base">Screen Configurations</CardTitle>
                                <CardDescription className="text-zinc-500 text-xs">Define technical specifications for the display system. Use the Intelligence Engine below to add screens via AI.</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <Screens />
                </CardContent>
            </Card>
        </div>
    );
};

export default Step2Intelligence;
