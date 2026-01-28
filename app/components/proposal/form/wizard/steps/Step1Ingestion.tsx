"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Building2, Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProposalContext } from "@/contexts/ProposalContext";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillFromSection, BillToSection, ImportJsonButton } from "@/app/components";
import { ProposalType } from "@/types";
import CalculationModePathCards from "./CalculationModePathCards";

const Step1Ingestion = () => {
    const { control, setValue } = useFormContext();
    const { importANCExcel, excelImportLoading } = useProposalContext();
    const [loading, setLoading] = useState(false);
    const [creationStep, setCreationStep] = useState(0);
    const [clientNameInput, setClientNameInput] = useState("");
    const router = useRouter();

    const steps = [
        "Provisioning Project Vault...",
        "Establishing Strategic Context...",
        "Activating Intelligence Engine...",
        "Mirroring Success Protocols...",
        "Redirecting to Command Center..."
    ];

    // Watch for proposal ID to determine mode
    const proposalId = useWatch({
        control,
        name: "details.proposalId"
    });

    const isNew = !proposalId || proposalId === 'new';
    const [selectedPath, setSelectedPath] = useState<"MIRROR" | "STRATEGIC" | null>(null);
    const [excelFile, setExcelFile] = useState<File | null>(null);

    const handleCreateProject = async () => {
        if (!clientNameInput || !selectedPath) return;
        setLoading(true);
        setCreationStep(0);

        try {
            const resp = await fetch("/api/workspaces/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: clientNameInput,
                    userEmail: "noreply@anc.com",
                    createInitialProposal: true,
                    clientName: clientNameInput,
                    calculationMode: selectedPath
                }),
            });

            const json = await resp.json();

            if (resp.ok && json && json.proposal) {
                // Artificial delay for Ferrari feel
                for (let i = 0; i < steps.length; i++) {
                    setCreationStep(i);
                    await new Promise((r) => setTimeout(r, 600));
                }

                // Redirect!
                window.location.href = `/projects/${json.proposal.id}`;
            } else {
                throw new Error(json.error || "Workspace creation failed");
            }
        } catch (e) {
            console.error("Failed to create workspace:", e);
            alert(`PROJECT VAULT ERROR: ${e instanceof Error ? e.message : "Check database connection."}`);
            setLoading(false);
        }
    };

    if (isNew) {
        return (
            <div className="max-w-4xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-semibold text-white mb-2">Project Setup</h1>
                    <p className="text-zinc-500 text-sm">Configure your project settings to begin.</p>
                </div>

                {!loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-stretch">
                        {/* LEFT: Project Identity */}
                        <div className="flex flex-col gap-6 p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                            <div className="space-y-4">
                                <label className="text-xs font-medium text-zinc-400">Project Name</label>
                                <input
                                    autoFocus
                                    className="flex h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-base font-medium ring-offset-zinc-950 placeholder:text-zinc-700 focus:border-blue-600 focus:outline-none transition-all text-white shadow-sm"
                                    placeholder="e.g. Lakers Arena - 2026"
                                    value={clientNameInput}
                                    onChange={(e) => setClientNameInput(e.target.value)}
                                />
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    This name will identify your project in the dashboard and AI context.
                                </p>
                            </div>

                            <div className="mt-auto pt-6 border-t border-zinc-800/50">
                                <button
                                    onClick={handleCreateProject}
                                    disabled={!clientNameInput || !selectedPath}
                                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus:outline-none disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-500 h-11 active:scale-[0.98]"
                                >
                                    Create Project
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="text-xs font-medium text-zinc-400 ml-2">Select Mode</label>

                            <div
                                onClick={() => setSelectedPath("STRATEGIC")}
                                className={`group p-5 rounded-xl border cursor-pointer transition-all duration-300 ${selectedPath === "STRATEGIC"
                                    ? "bg-blue-600/10 border-blue-600 shadow-md shadow-blue-500/5"
                                    : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                                    }`}
                            >
                                <div className="flex items-center gap-4 mb-2">
                                    <div className={`p-2 rounded-lg ${selectedPath === "STRATEGIC" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <h3 className={`font-semibold ${selectedPath === "STRATEGIC" ? "text-white" : "text-zinc-300"}`}>Strategic Mode</h3>
                                </div>
                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                    Full commercial optimization with Natalia Math Engine. Automatic margin logic and AI assistance.
                                </p>
                            </div>

                            <div
                                onClick={() => setSelectedPath("MIRROR")}
                                className={`group p-5 rounded-xl border cursor-pointer transition-all duration-300 ${selectedPath === "MIRROR"
                                    ? "bg-emerald-600/10 border-emerald-600 shadow-md shadow-emerald-500/5"
                                    : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                                    }`}
                            >
                                <div className="flex items-center gap-4 mb-2">
                                    <div className={`p-2 rounded-lg ${selectedPath === "MIRROR" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <h3 className={`font-semibold ${selectedPath === "MIRROR" ? "text-white" : "text-zinc-300"}`}>Mirror Mode</h3>
                                </div>
                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                    Excel Pass-Through. Lock pricing to your uploaded ANC spreadsheet for 1:1 precision.
                                </p>
                            </div>

                            {/* Excel Upload - Shows when Mirror Mode is selected */}
                            {selectedPath === "MIRROR" && (
                                <div className="p-4 bg-emerald-900/20 border border-emerald-800/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-xs text-emerald-400 font-medium mb-2 block">Upload ANC Excel</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="excel-file-new-project"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setExcelFile(file);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                document.getElementById("excel-file-new-project")?.click();
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-all"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {excelFile ? excelFile.name : "Choose Excel File"}
                                        </button>
                                    </div>
                                    {excelFile && (
                                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                            ✓ File will be imported after project creation
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-6 py-20 bg-zinc-900/30 border border-zinc-800 rounded-3xl backdrop-blur-xl">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-blue-600/10 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-xl font-semibold text-white italic">{steps[creationStep]}</div>
                            <div className="text-zinc-500 text-sm">Setting up your secure project environment...</div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-6 py-8">
            {/* PRIMARY BRANCH: Calculation Mode */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader>
                    <CardTitle className="text-zinc-100 text-base">Calculation Mode</CardTitle>
                    <CardDescription className="text-zinc-500 text-xs">Select your calculation engine</CardDescription>
                </CardHeader>
                <CardContent>
                    <CalculationModePathCards />
                </CardContent>
            </Card>

            {/* Actions: Import */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#0A52EF]/20">
                            <Upload className="w-5 h-5 text-[#0A52EF]" />
                        </div>
                        <div>
                            <CardTitle className="text-zinc-100 text-base">Data Ingestion</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">Import from Excel, JSON, or RFP</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <ImportJsonButton setOpen={() => { }} />

                        <div className="relative">
                            <button
                                onClick={() => document.getElementById("excel-import-input-step1")?.click()}
                                disabled={excelImportLoading}
                                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                            >
                                {excelImportLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                <span>Import ANC Excel</span>
                            </button>
                            <input
                                id="excel-import-input-step1"
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) importANCExcel(file);
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Parties */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#0A52EF]/20">
                            <Building2 className="w-5 h-5 text-[#0A52EF]" />
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
