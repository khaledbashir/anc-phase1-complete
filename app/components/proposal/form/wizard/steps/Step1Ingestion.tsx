"use client";

import { Upload, FileSpreadsheet, Sparkles, Shield, ArrowRight, Zap, Search, CheckCircle2, AlertTriangle, FileText, ExternalLink, Trash2 } from "lucide-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { SlashBox } from "@/app/components/reusables/BrandGraphics";
import ExcelViewer from "@/app/components/ExcelViewer";
import { AiWand, FormInput } from "@/app/components";
import { Button } from "@/components/ui/button";
import { useFormContext, useWatch } from "react-hook-form";

const Step1Ingestion = () => {
    const { importANCExcel, excelImportLoading, excelPreview, excelPreviewLoading, excelValidationOk, uploadRfpDocument, rfpDocuments, deleteRfpDocument, aiWorkspaceSlug } = useProposalContext();
    const { control, setValue } = useFormContext();
    const mirrorMode = useWatch({ name: "details.mirrorMode", control });
    const [selectedPath, setSelectedPath] = useState<"MIRROR" | "INTELLIGENCE" | null>(null);
    const [rfpUploading, setRfpUploading] = useState(false);

    useEffect(() => {
        if (selectedPath) return;
        setSelectedPath(mirrorMode ? "MIRROR" : "INTELLIGENCE");
    }, [mirrorMode, selectedPath]);

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
                    Begin the project journey by feeding the system your data. 
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
                        onClick={() => {
                            setSelectedPath("MIRROR");
                            setValue("details.mirrorMode", true, { shouldDirty: true, shouldValidate: true });
                        }}
                        className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 h-full flex flex-col ${selectedPath === "MIRROR"
                            ? "bg-brand-blue/10 border-brand-blue shadow-2xl shadow-brand-blue/10"
                            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={`p-3 rounded-xl ${selectedPath === "MIRROR" ? "bg-brand-blue text-white" : "bg-zinc-800 text-zinc-500"}`}>
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] border-zinc-800 text-emerald-400 font-bold uppercase tracking-widest">
                                    Live
                                </Badge>
                                {selectedPath === "MIRROR" && <Badge className="bg-brand-blue text-white border-none">Selected</Badge>}
                            </div>
                        </div>
                        
                        <h3 className={`text-lg font-bold mb-2 ${selectedPath === "MIRROR" ? "text-white" : "text-zinc-300"}`}>Mirror Mode</h3>
                        <p className="text-zinc-500 text-xs leading-relaxed mb-6 flex-1">
                            Direct pass-through for estimation. Converts Estimator Excel sheets into branded PDF proposals with 1:1 numerical accuracy.
                        </p>

                        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${selectedPath === "MIRROR" ? "text-brand-blue" : "text-zinc-600"}`}>
                            Excel Pass-Through <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </SlashBox>

                {/* Path 2: Intelligence Mode (RAG/AI) */}
                <div
                    onClick={() => {
                        setSelectedPath("INTELLIGENCE");
                        setValue("details.mirrorMode", false, { shouldDirty: true, shouldValidate: true });
                    }}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 h-full flex flex-col ${selectedPath === "INTELLIGENCE"
                        ? "bg-brand-blue/10 border-brand-blue shadow-2xl shadow-brand-blue/10"
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                        }`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-xl ${selectedPath === "INTELLIGENCE" ? "bg-brand-blue text-white" : "bg-zinc-800 text-zinc-500"}`}>
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] border-zinc-800 text-emerald-400 font-bold uppercase tracking-widest">
                                Live
                            </Badge>
                            {selectedPath === "INTELLIGENCE" && <Badge className="bg-brand-blue text-white border-none">Active</Badge>}
                        </div>
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
                                    {excelPreview ? "Excel File Uploaded" : "Upload Estimator Excel"}
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

            {/* Upload Area for Intelligence Mode */}
            {selectedPath === "INTELLIGENCE" && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="p-6 bg-zinc-900/80 border border-brand-blue/30 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Sparkles className="w-32 h-32 text-brand-blue" />
                        </div>

                        <div className="text-center space-y-4 relative z-10">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${aiWorkspaceSlug ? "bg-emerald-500/10 text-emerald-400" : "bg-brand-blue/10 text-brand-blue"}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-semibold">Upload RFP PDFs</h4>
                            </div>

                            <div className="mx-auto w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-2">
                                <Upload className="w-6 h-6 text-brand-blue" />
                            </div>

                            <p className="text-zinc-500 text-xs">
                                Upload the display schedule / Division 11 PDFs. The system will index them per project workspace.
                            </p>

                            <div className="flex items-center justify-center gap-4 pt-2">
                                <input
                                    type="file"
                                    id="rfp-upload"
                                    className="hidden"
                                    accept=".pdf"
                                    multiple
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        setRfpUploading(true);
                                        try {
                                            for (const f of files) {
                                                await uploadRfpDocument(f);
                                            }
                                        } finally {
                                            setRfpUploading(false);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="rfp-upload"
                                    className={`px-6 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-sm cursor-pointer hover:bg-brand-blue/90 transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/20 ${(rfpUploading) ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    {rfpUploading ? (
                                        <><Zap className="w-4 h-4 animate-pulse" /> Indexing…</>
                                    ) : (
                                        <><FileText className="w-4 h-4" /> Select PDF(s)</>
                                    )}
                                </label>
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-2">
                                <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-400 font-bold uppercase tracking-widest">
                                    {aiWorkspaceSlug ? "Workspace Ready" : "Workspace Pending"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500">Division 11</Badge>
                                <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500">Display Schedule</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-800/70 flex items-center justify-between">
                            <div className="text-white font-semibold text-sm">RFP Vault</div>
                            <div className="text-[11px] text-zinc-500 font-semibold">{(rfpDocuments || []).length} docs</div>
                        </div>
                        <div className="max-h-[280px] overflow-auto custom-scrollbar">
                            {(rfpDocuments || []).length === 0 ? (
                                <div className="px-5 py-6 text-sm text-zinc-600">No RFP documents uploaded yet.</div>
                            ) : (
                                <div className="divide-y divide-zinc-800/60">
                                    {(rfpDocuments || []).map((doc) => (
                                        <div key={doc.id} className="px-5 py-3 flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-sm text-white font-semibold truncate">{doc.name}</div>
                                                    <div className="text-[11px] text-zinc-500 truncate">{new Date(doc.createdAt).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(doc.url, "_blank")}
                                                    className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:text-white hover:border-brand-blue/40 transition-colors text-xs font-bold flex items-center gap-2"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Open
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await deleteRfpDocument(doc.id);
                                                    }}
                                                    className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-red-300 hover:border-red-500/30 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step1Ingestion;
