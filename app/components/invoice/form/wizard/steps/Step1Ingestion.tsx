"use client";

import { useFormContext } from "react-hook-form";
import { Building2, Upload } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillFromSection, BillToSection, ImportJsonButton } from "@/app/components";
import { ProposalType } from "@/types";

const Step1Ingestion = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Context */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-zinc-100 font-montserrat">Step 1: Ingestion & Parties</h2>
                <p className="text-zinc-400 text-sm">Upload existing data or define the client and sender details.</p>
            </div>

            {/* Actions: Import */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#003366]/20">
                            <Upload className="w-5 h-5 text-[#003366]" />
                        </div>
                        <div>
                            <CardTitle className="text-zinc-100 text-base">Data Ingestion</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">Import from Excel, JSON, or RFP</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <ImportJsonButton />
                        {/* We can add the Excel Import button here if it's separate */}
                    </div>
                </CardContent>
            </Card>

            {/* Parties */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#003366]/20">
                            <Building2 className="w-5 h-5 text-[#003366]" />
                        </div>
                        <div>
                            <CardTitle className="text-zinc-100 text-base">Project Parties</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">Who is this proposal for?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <BillFromSection />
                        <BillToSection />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Step1Ingestion;
