"use client";

import { Upload, FileSpreadsheet, Sparkles, Shield, Zap, CheckCircle2, AlertTriangle, FileText, ExternalLink, Trash2 } from "lucide-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useState } from "react";
import ExcelViewer from "@/app/components/ExcelViewer";
import { AiWand, FormInput } from "@/app/components";

const Step1Ingestion = () => {
    const { importANCExcel, excelImportLoading, excelPreview, excelPreviewLoading, excelValidationOk, uploadRfpDocument, rfpDocuments, deleteRfpDocument, aiWorkspaceSlug } = useProposalContext();
    const [rfpUploading, setRfpUploading] = useState(false);

    return (
        <div className="h-full flex flex-col p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="space-y-1">
                <span className="text-[10px] font-semibold text-brand-blue uppercase tracking-widest">Phase 1: Ingest</span>
                <h1 className="text-2xl font-bold text-white tracking-tight">Project Initialization</h1>
                <p className="text-zinc-500 text-sm">
                    Add Excel and/or RFP PDFs. Calculation mode is set in Phase 3.
                </p>
            </div>

            {/* Project & Client */}
            <div className="p-5 rounded-xl border border-zinc-800/70 bg-zinc-900/30">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Project & Client</span>
                    <span className="text-[10px] text-zinc-500 hidden sm:inline">Syncs to PDF</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Excel — default workflow */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800/70 rounded-xl">
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className={`p-2.5 rounded-lg ${excelPreview ? "bg-emerald-500/10 text-emerald-400" : "bg-brand-blue/10 text-brand-blue"}`}>
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h4 className="text-white font-semibold">
                                    {excelPreview ? "Excel File Uploaded" : "Upload Estimator Excel"}
                                </h4>
                            </div>
                            <p className="text-zinc-500 text-xs">.xlsx from Estimating Team</p>

                            <div className="flex justify-center">
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
                                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium cursor-pointer hover:bg-brand-blue/90 transition-colors ${excelImportLoading ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    {excelImportLoading ? (
                                        <><Zap className="w-4 h-4 animate-pulse" /> Processing...</>
                                    ) : (
                                        <><FileSpreadsheet className="w-4 h-4" /> {excelPreview ? "Change File" : "Select File"}</>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RFP PDFs */}
                <div className="space-y-4">
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800/70 rounded-xl">
                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-2">
                                <div className={`p-2 rounded-lg ${aiWorkspaceSlug ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700/50 text-zinc-400"}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-semibold text-sm">Upload RFP PDFs</h4>
                            </div>
                            <p className="text-zinc-500 text-xs">Display schedule / Division 11</p>

                            <div className="flex justify-center gap-2">
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
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 text-sm font-medium cursor-pointer hover:bg-zinc-600 transition-colors ${rfpUploading ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    {rfpUploading ? <><Zap className="w-4 h-4 animate-pulse" /> Indexing…</> : <><FileText className="w-4 h-4" /> Select PDF(s)</>}
                                </label>
                                <span className="text-[10px] text-zinc-500 self-center">{aiWorkspaceSlug ? "Ready" : "Pending"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-300">RFP Vault</span>
                            <span className="text-xs text-zinc-500">{(rfpDocuments || []).length} docs</span>
                        </div>
                        <div className="max-h-[240px] overflow-auto custom-scrollbar">
                            {(rfpDocuments || []).length === 0 ? (
                                <div className="px-4 py-5 text-sm text-zinc-500">No RFP documents yet.</div>
                            ) : (
                                <div className="divide-y divide-zinc-800/50">
                                    {(rfpDocuments || []).map((doc) => (
                                        <div key={doc.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-xs text-white font-medium truncate">{doc.name}</div>
                                                    <div className="text-[10px] text-zinc-500 truncate">{new Date(doc.createdAt).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button type="button" onClick={() => window.open(doc.url, "_blank")} className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title="Open"><ExternalLink className="w-3.5 h-3.5" /></button>
                                                <button type="button" onClick={async () => await deleteRfpDocument(doc.id)} className="p-1.5 rounded text-zinc-500 hover:text-red-300 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {(excelPreviewLoading || excelPreview) && (
                <div className="space-y-4">
                    <div className="h-[78vh] min-h-[720px] overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/50 shadow-inner">
                        <ExcelViewer />
                    </div>

                    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="text-sm font-medium text-zinc-200">What happens next</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Excel is synced to your proposal. Verify LED sheet, then go to Next Step.</div>
                            </div>
                            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${excelValidationOk ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>
                                {excelValidationOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                {excelValidationOk ? "LED Sheet Valid" : "Review LED Sheet"}
                            </div>
                        </div>
                        {!excelValidationOk && (
                            <p className="mt-3 text-xs text-zinc-500">Tip: LED sheet should have numeric width/height for active rows.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step1Ingestion;
