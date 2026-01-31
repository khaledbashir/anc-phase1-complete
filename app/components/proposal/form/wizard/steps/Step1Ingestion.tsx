"use client";

import { Upload, FileSpreadsheet, Sparkles, Shield, Zap, CheckCircle2, AlertTriangle, FileText, ExternalLink, Trash2, ChevronDown, ChevronUp, Settings2, RefreshCw } from "lucide-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useState, useEffect } from "react";
import ExcelViewer from "@/app/components/ExcelViewer";
import { AiWand, FormInput } from "@/app/components";
import { cn } from "@/lib/utils";

const Step1Ingestion = () => {
    const { 
        importANCExcel, 
        excelImportLoading, 
        excelPreview, 
        excelPreviewLoading, 
        excelValidationOk, 
        uploadRfpDocument, 
        rfpDocuments, 
        deleteRfpDocument, 
        aiWorkspaceSlug 
    } = useProposalContext();
    
    const [rfpUploading, setRfpUploading] = useState(false);
    const [showDetails, setShowDetails] = useState(!excelPreview);

    // Auto-collapse details when Excel is loaded to focus on content
    useEffect(() => {
        if (excelPreview) {
            setShowDetails(false);
        }
    }, [excelPreview]);

    return (
        <div className="h-full flex flex-col bg-zinc-950/50">
            {/* Minimalist Header / Toolbar */}
            <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        Ingestion Studio
                    </h1>
                    <p className="text-zinc-500 text-xs mt-0.5">
                        {excelPreview ? "Reviewing Excel Data" : "Initialize Project & Upload Data"}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setShowDetails(!showDetails)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            showDetails 
                                ? "bg-zinc-800 text-zinc-200 border-zinc-700" 
                                : "bg-transparent text-zinc-400 border-transparent hover:bg-zinc-800/50"
                        )}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        {showDetails ? "Hide Details" : "Project Details"}
                    </button>

                    {excelPreview && (
                        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20 text-xs font-medium cursor-pointer hover:bg-brand-blue/20 transition-all">
                            <RefreshCw className={cn("w-3.5 h-3.5", excelImportLoading && "animate-spin")} />
                            <span>Replace Excel</span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) await importANCExcel(file);
                                }}
                            />
                        </label>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Collapsible Project Details */}
                    {showDetails && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <div className="p-5 rounded-xl border border-zinc-800/70 bg-zinc-900/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormInput
                                        vertical
                                        name="details.proposalName"
                                        label="Project Name"
                                        placeholder="e.g., WVU Athletics LED Upgrade"
                                        className="bg-zinc-950/50 border-zinc-800 focus:border-brand-blue/50 transition-colors"
                                    />
                                    <FormInput
                                        vertical
                                        name="receiver.name"
                                        label="Client Name"
                                        placeholder="e.g., WVU Athletics"
                                        className="bg-zinc-950/50 border-zinc-800 focus:border-brand-blue/50 transition-colors"
                                        rightElement={
                                            <AiWand
                                                fieldName="receiver.name"
                                                targetFields={["receiver.address", "receiver.city", "receiver.zipCode", "details.venue"]}
                                            />
                                        }
                                    />
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <FormInput
                                                vertical
                                                name="receiver.address"
                                                label="Address"
                                                placeholder="Street address"
                                                className="bg-zinc-950/50 border-zinc-800"
                                            />
                                        </div>
                                        <FormInput
                                            vertical
                                            name="receiver.city"
                                            label="City"
                                            placeholder="City"
                                            className="bg-zinc-950/50 border-zinc-800"
                                        />
                                        <FormInput
                                            vertical
                                            name="receiver.zipCode"
                                            label="Zip"
                                            placeholder="Zip code"
                                            className="bg-zinc-950/50 border-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    {!excelPreview ? (
                        /* Empty State / Upload Mode */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
                            {/* Excel Upload Card */}
                            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-brand-blue/30 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 cursor-pointer border-dashed">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept=".xlsx, .xls"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) await importANCExcel(file);
                                    }}
                                />
                                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                                    <FileSpreadsheet className="w-8 h-8 text-brand-blue" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Upload Excel Estimate</h3>
                                <p className="text-zinc-500 text-sm max-w-xs">
                                    Drag and drop your standard .xlsx file here to initialize the mirror mode.
                                </p>
                                {excelImportLoading && (
                                    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <Zap className="w-6 h-6 text-brand-blue animate-pulse" />
                                            <span className="text-brand-blue font-medium text-sm">Processing Excel...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RFP Upload Card */}
                            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-emerald-500/30 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 border-dashed">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept=".pdf"
                                    multiple
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        setRfpUploading(true);
                                        try {
                                            for (const f of files) await uploadRfpDocument(f);
                                        } finally {
                                            setRfpUploading(false);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                    <FileText className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Upload RFP PDFs</h3>
                                <p className="text-zinc-500 text-sm max-w-xs mb-4">
                                    Add Division 11 specs or display schedules for AI analysis.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono bg-zinc-900/50 px-3 py-1.5 rounded-full">
                                    <Shield className="w-3 h-3" />
                                    {rfpDocuments.length > 0 ? `${rfpDocuments.length} files in Vault` : "Vault Empty"}
                                </div>

                                {rfpUploading && (
                                    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <Zap className="w-6 h-6 text-emerald-500 animate-pulse" />
                                            <span className="text-emerald-500 font-medium text-sm">Indexing Documents...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Preview Mode - Focus on Excel */
                        <div className="flex flex-col h-full space-y-4">
                            {/* Toolbar / Status Bar */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${excelValidationOk ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                                        {excelValidationOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                        <span className="font-medium">{excelValidationOk ? "Excel Validated" : "Validation Issues"}</span>
                                    </div>
                                    
                                    {/* RFP Quick Upload in Preview Mode */}
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Add RFP</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf"
                                                multiple
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (files.length === 0) return;
                                                    setRfpUploading(true);
                                                    try {
                                                        for (const f of files) await uploadRfpDocument(f);
                                                    } finally {
                                                        setRfpUploading(false);
                                                        e.target.value = "";
                                                    }
                                                }}
                                            />
                                        </label>
                                        {rfpDocuments.length > 0 && (
                                            <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">
                                                {rfpDocuments.length}
                                            </span>
                                        )}
                                        {rfpUploading && <Zap className="w-3 h-3 text-emerald-500 animate-pulse" />}
                                    </div>
                                </div>

                                <div className="text-[10px] text-zinc-500 font-mono">
                                    {excelPreview.fileName}
                                </div>
                            </div>

                            {/* Maximized Viewer - Editable */}
                            <div className="flex-1 min-h-0 rounded-xl border border-zinc-800/50 bg-zinc-950 shadow-2xl overflow-hidden relative group">
                                <ExcelViewer editable />
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-zinc-950/80 backdrop-blur text-[10px] text-zinc-500 px-2 py-1 rounded border border-zinc-800">
                                        Double-click to edit • Changes sync to PDF
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Step1Ingestion;
