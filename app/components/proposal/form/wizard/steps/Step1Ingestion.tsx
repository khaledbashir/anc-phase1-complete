"use client";

import { Upload, FileSpreadsheet, Sparkles, Shield, ArrowRight, Zap, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { SlashBox } from "@/app/components/reusables/BrandGraphics";
import ExcelViewer from "@/app/components/ExcelViewer";
import { AiWand, FormInput } from "@/app/components";
import { Button } from "@/components/ui/button";

const Step1Ingestion = () => {
    const { importANCExcel, excelImportLoading, excelPreview, excelPreviewLoading, excelValidationOk } = useProposalContext();
    const [selectedPath, setSelectedPath] = useState<"MIRROR" | "INTELLIGENCE" | null>(null);

    return (
        <div className="h-full flex flex-col p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="h-1 w-8 bg-brand-blue rounded-full" />
                    <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.2em]">Phase 1: Ingest</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Project Initialization</h1>
                <p className="text-zinc-500 text-sm max-w-lg">
                    Begin the ANC Studio journey by feeding the system your project data. 
                    Choose your workflow below to activate the Intelligence Engine.
                </p>
            </div>

            {/* Project + Client (always first) */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Project & Client</div>
                        <div className="text-white font-semibold mt-2">Fill this first (it fixes the PDF placeholders)</div>
                        <div className="text-zinc-500 text-xs mt-1 max-w-xl">
                            These fields drive the opening sentence, purchaser block, and the proposal header in the client PDF.
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Live-sync to PDF
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormInput
                        vertical
                        name="details.proposalName"
                        label="Project Name"
                        placeholder="e.g., WVU Athletics LED Upgrade"
                    />
                    <FormInput
                        vertical
                        name="receiver.name"
                        label="Client Name"
                        placeholder="e.g., WVU Athletics"
                        rightElement={
                            <AiWand
                                fieldName="receiver.name"
                                targetFields={["receiver.address", "receiver.city", "receiver.zipCode", "details.venue"]}
                            />
                        }
                    />
                    <FormInput
                        vertical
                        name="receiver.address"
                        label="Client Address"
                        placeholder="Street address"
                    />
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FormInput
                            vertical
                            name="receiver.city"
                            label="City"
                            placeholder="City"
                        />
                        <FormInput
                            vertical
                            name="receiver.zipCode"
                            label="Zip"
                            placeholder="Zip code"
                        />
                        <FormInput
                            vertical
                            name="details.venue"
                            label="Venue"
                            placeholder="e.g., Milan Puskar Stadium"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Path 1: Mirror Mode (Excel-to-PDF) */}
                <SlashBox className="group">
                    <div
                        onClick={() => setSelectedPath("MIRROR")}
                        className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 h-full flex flex-col ${selectedPath === "MIRROR"
                            ? "bg-brand-blue/10 border-brand-blue shadow-2xl shadow-brand-blue/10"
                            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={`p-3 rounded-xl ${selectedPath === "MIRROR" ? "bg-brand-blue text-white" : "bg-zinc-800 text-zinc-500"}`}>
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            {selectedPath === "MIRROR" && <Badge className="bg-brand-blue text-white border-none">Selected</Badge>}
                        </div>
                        
                        <h3 className={`text-lg font-bold mb-2 ${selectedPath === "MIRROR" ? "text-white" : "text-zinc-300"}`}>Mirror Mode</h3>
                        <p className="text-zinc-500 text-xs leading-relaxed mb-6 flex-1">
                            Direct pass-through for "Valid Victory" estimation. Converts ANC Estimator Excel sheets into branded PDF proposals with 1:1 numerical accuracy.
                        </p>

                        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${selectedPath === "MIRROR" ? "text-brand-blue" : "text-zinc-600"}`}>
                            Excel Pass-Through <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </SlashBox>

                {/* Path 2: Intelligence Mode (RAG/AI) */}
                <div
                    onClick={() => setSelectedPath("INTELLIGENCE")}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 h-full flex flex-col ${selectedPath === "INTELLIGENCE"
                        ? "bg-brand-blue/10 border-brand-blue shadow-2xl shadow-brand-blue/10"
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                        }`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-xl ${selectedPath === "INTELLIGENCE" ? "bg-brand-blue text-white" : "bg-zinc-800 text-zinc-500"}`}>
                            <Sparkles className="w-6 h-6" />
                        </div>
                        {selectedPath === "INTELLIGENCE" && <Badge className="bg-brand-blue text-white border-none">Active</Badge>}
                    </div>
                    
                    <h3 className={`text-lg font-bold mb-2 ${selectedPath === "INTELLIGENCE" ? "text-white" : "text-zinc-300"}`}>Intelligence Engine</h3>
                    <p className="text-zinc-500 text-xs leading-relaxed mb-6 flex-1">
                        Utilize RAG to scan 2,500+ page construction manuals. Extract "Division 11" specs and display schedules automatically via AI.
                    </p>

                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${selectedPath === "INTELLIGENCE" ? "text-brand-blue" : "text-zinc-600"}`}>
                        RAG Spec Extraction <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            </div>

            {/* Upload Area for Mirror Mode */}
            {selectedPath === "MIRROR" && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="p-6 bg-zinc-900/80 border border-brand-blue/30 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Shield className="w-32 h-32 text-brand-blue" />
                        </div>

                        <div className="text-center space-y-4 relative z-10">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${excelPreview ? "bg-emerald-500/10 text-emerald-400" : "bg-brand-blue/10 text-brand-blue"}`}>
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-semibold">
                                    {excelPreview ? "Excel File Uploaded" : "Upload ANC Estimator Excel"}
                                </h4>
                            </div>

                            <div className="mx-auto w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-2">
                                <Upload className="w-6 h-6 text-brand-blue" />
                            </div>

                            <p className="text-zinc-500 text-xs">Supports standard .xlsx formats from the Estimating Team</p>

                            <div className="flex items-center justify-center gap-4 pt-2">
                                <input
                                    type="file"
                                    id="excel-upload"
                                    className="hidden"
                                    accept=".xlsx, .xls"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            await importANCExcel(file);
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="excel-upload"
                                    className={`px-6 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-sm cursor-pointer hover:bg-brand-blue/90 transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/20 ${excelImportLoading ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    {excelImportLoading ? (
                                        <><Zap className="w-4 h-4 animate-pulse" /> Processing...</>
                                    ) : (
                                        <><FileSpreadsheet className="w-4 h-4" /> {excelPreview ? "Change File" : "Select Master File"}</>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>

                    {(excelPreviewLoading || excelPreview) && (
                        <div className="space-y-3">
                            <div className="h-[520px] max-h-[60vh] overflow-hidden">
                                <ExcelViewer />
                            </div>

                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="text-white font-semibold text-sm">What happens next</div>
                                        <div className="text-zinc-500 text-xs mt-1">
                                            The Excel has been ingested into the draft and synced into your proposal data.
                                        </div>
                                    </div>
                                    <div
                                        className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${excelValidationOk
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                            }`}
                                    >
                                        {excelValidationOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                        {excelValidationOk ? "LED Sheet Valid" : "Review LED Sheet"}
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                                        <div className="text-zinc-300 font-semibold">1) Verify</div>
                                        <div className="text-zinc-500 mt-1">
                                            Confirm the LED sheet rows have real width/height values (no TBD).
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                                        <div className="text-zinc-300 font-semibold">2) Next Step</div>
                                        <div className="text-zinc-500 mt-1">
                                            Click <span className="text-zinc-300 font-semibold">Next Step</span> to review the extracted screens and specs.
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                                        <div className="text-zinc-300 font-semibold">3) Export</div>
                                        <div className="text-zinc-500 mt-1">
                                            Generate the branded PDF once the screens look right.
                                        </div>
                                    </div>
                                </div>

                                {!excelValidationOk && (
                                    <div className="mt-4 text-[11px] text-zinc-500">
                                        Tip: If this is a real ANC master file, the LED sheet should include numeric dimensions for active rows.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* RAG Placeholder for Intelligence Mode */}
            {selectedPath === "INTELLIGENCE" && (
                <div className="p-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl animate-in zoom-in-95 duration-300 flex items-center justify-center gap-6 group hover:border-brand-blue/20 transition-all">
                    <div className="p-4 rounded-2xl bg-zinc-800 text-zinc-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-all">
                        <Search className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="text-white font-semibold">Drop RFP Documents or Links</h4>
                        <p className="text-zinc-500 text-xs mt-1">RAG Engine will automatically index and extract Display Schedules.</p>
                        <div className="mt-4 flex gap-2">
                            <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500">Division 11</Badge>
                            <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500">Section 11 63 10</Badge>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step1Ingestion;
