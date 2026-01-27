"use client";

import { useFormContext } from "react-hook-form";
import { Calculator, FileText, Wand2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Screens } from "@/app/components";
import { RFPQuestionsPanel } from "@/app/components/RFPQuestionsPanel";

const Step2Intelligence = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-zinc-100 font-montserrat">Step 2: Analysis & Specifications</h2>
                <p className="text-zinc-400 text-sm">Define technical specifications and extract requirements from RFPs.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left: Screen Specs (Main Work Area) */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Calculator className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Screen Configurations</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Define technical specifications</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Screens />
                        </CardContent>
                    </Card>
                </div>

                {/* Right: RAG / Intelligence Sidebar */}
                <div className="xl:col-span-1 space-y-6">
                    <Card className="bg-zinc-900/50 border-zinc-800/50 h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/10">
                                    <Wand2 className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Intelligence Engine</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">RAG extraction & Analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <RFPQuestionsPanel />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Step2Intelligence;
