"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Building2, Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProposalContext } from "@/contexts/ProposalContext";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillFromSection, BillToSection, ImportJsonButton } from "@/app/components";
import { ProposalType } from "@/types";

const Step1Ingestion = () => {
    const { control, setValue } = useFormContext();
    const { importANCExcel, excelImportLoading } = useProposalContext();
    const [loading, setLoading] = useState(false);
    const [creationStep, setCreationStep] = useState(0);
    const router = useRouter();

    // Watch for proposal ID to determine mode
    const proposalId = useWatch({
        control,
        name: "details.proposalId"
    });

    const isNew = !proposalId || proposalId === 'new';
    const [clientNameInput, setClientNameInput] = useState("");

    const steps = ["Creating Workspace...", "Injecting Master Formulas...", "Training Strategic Agent..."];

    const handleCreateProject = async () => {
        if (!clientNameInput) return;
        setLoading(true);
        setCreationStep(0);

        try {
            // Animate through steps
            const resp = await fetch("/api/workspaces/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: clientNameInput,
                    userEmail: "noreply@anc.com", // Default for now
                    createInitialProposal: true,
                    clientName: clientNameInput
                }),
            });

            // show step transitions (Ferrari feel)
            for (let i = 0; i < steps.length; i++) {
                setCreationStep(i);
                await new Promise((r) => setTimeout(r, 400));
            }

            const json = await resp.json();
            if (resp.ok && json && json.proposal) {
                // store workspace/thread locally
                if (typeof window !== "undefined") {
                    if (json.ai?.slug) localStorage.setItem("aiWorkspaceSlug", json.ai.slug);
                    if (json.ai?.threadId) localStorage.setItem("aiThreadId", json.ai.threadId);
                }

                // Redirect!
                window.location.href = `/projects/${json.proposal.id}`;
            } else {
                console.error("Workspace creation failed", json);
                setLoading(false);
            }
        } catch (e) {
            console.error("Failed to create workspace:", e);
            setLoading(false);
        }
    };

    if (isNew) {
        return (
            <div className="max-w-xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                        <CardTitle className="text-xl text-zinc-100">Start New Project</CardTitle>
                        <CardDescription className="text-zinc-400">Initialize the AI War Room to begin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!loading ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Project / Client Name</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                                            placeholder="e.g. Lakers - Arena Renovation"
                                            value={clientNameInput}
                                            onChange={(e) => setClientNameInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                                        />
                                        <button
                                            onClick={handleCreateProject}
                                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
                                        >
                                            Initialize
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-4 py-8">
                                <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-b-2 border-blue-500"></div>
                                <div className="text-center">
                                    <div className="text-zinc-200 font-medium">{steps[creationStep]}</div>
                                    <div className="text-zinc-500 text-sm mt-2">Setting up database & AI context...</div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-6 py-8">
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
                    <div className="flex flex-wrap gap-4">
                        <ImportJsonButton setOpen={() => { }} />

                        <div className="relative">
                            <button
                                onClick={() => document.getElementById("excel-import-input-step1")?.click()}
                                disabled={excelImportLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold rounded-lg border border-zinc-700 transition-all disabled:opacity-50"
                            >
                                {excelImportLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                ) : (
                                    <Upload className="w-4 h-4 text-emerald-500" />
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
