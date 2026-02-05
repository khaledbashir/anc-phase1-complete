"use client";

import { useFormContext } from "react-hook-form";
import {
    Upload,
    FileSpreadsheet,
    Sparkles,
    Shield,
    Zap,
    CheckCircle2,
    AlertTriangle,
    FileText,
    ExternalLink,
    Trash2,
    ChevronDown,
    ChevronUp,
    Settings2,
    RefreshCw,
} from "lucide-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useState, useEffect } from "react";
import ExcelGridViewer from "@/app/components/ExcelGridViewer";
import ScreensGridEditor from "@/app/components/proposal/form/ScreensGridEditor";
import { AiWand, FormInput } from "@/app/components";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Step1Ingestion = () => {
    const {
        importANCExcel,
        excelImportLoading,
        excelPreview,
        excelPreviewLoading,
        excelValidationOk,
        excelDiagnostics,
        uploadRfpDocument,
        rfpDocuments,
        deleteRfpDocument,
        aiWorkspaceSlug,
    } = useProposalContext();

    const { getValues, watch } = useFormContext();
    const proposalId = watch("details.proposalId");
    const [rfpUploading, setRfpUploading] = useState(false);
    const [showDetails, setShowDetails] = useState(!excelPreview);

    // Auto-collapse details when Excel is loaded ONLY if required fields are filled
    useEffect(() => {
        if (excelPreview) {
            const { details, receiver } = getValues();
            const hasRequiredFields = details?.proposalName && receiver?.name;
            if (hasRequiredFields) {
                setShowDetails(false);
            } else {
                setShowDetails(true);
            }
        }
    }, [excelPreview, getValues]);

    return (
        <div className="h-full flex flex-col bg-background/20">
            {/* Minimalist Header / Toolbar */}
            <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        Ingestion Studio
                    </h1>
                    <p className="text-muted-foreground text-xs mt-0.5">
                        {excelPreview
                            ? "Reviewing Excel Data"
                            : "Initialize Project & Upload Data"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            showDetails
                                ? "bg-muted text-foreground border-border"
                                : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/50",
                        )}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        {showDetails ? "Hide Details" : "Project Details"}
                    </button>

                    {excelPreview && (
                        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20 text-xs font-medium cursor-pointer hover:bg-brand-blue/20 transition-all">
                            <RefreshCw
                                className={cn(
                                    "w-3.5 h-3.5",
                                    excelImportLoading && "animate-spin",
                                )}
                            />
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
                            <div className="p-5 rounded-xl border border-border bg-muted/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormInput
                                        vertical
                                        name="details.proposalName"
                                        label="Project Name"
                                        placeholder="e.g., WVU Athletics LED Upgrade"
                                        className="bg-background border-input focus:border-brand-blue/50 transition-colors"
                                    />
                                    <FormInput
                                        vertical
                                        name="receiver.name"
                                        label="Client Name"
                                        placeholder="e.g., WVU Athletics"
                                        className="bg-background border-input focus:border-brand-blue/50 transition-colors"
                                        rightElement={
                                            <AiWand
                                                fieldName="receiver.name"
                                                targetFields={[
                                                    "receiver.address",
                                                    "receiver.city",
                                                    "receiver.zipCode",
                                                    "details.venue",
                                                ]}
                                                proposalId={proposalId}
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
                                                className="bg-background border-input"
                                            />
                                        </div>
                                        <FormInput
                                            vertical
                                            name="receiver.city"
                                            label="City"
                                            placeholder="City"
                                            className="bg-background border-input"
                                        />
                                        <FormInput
                                            vertical
                                            name="receiver.zipCode"
                                            label="Zip"
                                            placeholder="Zip code"
                                            className="bg-background border-input"
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
                            <div className="group relative rounded-2xl border border-border bg-card hover:bg-muted/50 hover:border-brand-blue/30 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 cursor-pointer border-dashed">
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
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    Upload Excel Estimate
                                </h3>
                                <p className="text-muted-foreground text-sm max-w-xs">
                                    Drag and drop your standard .xlsx file here
                                    to initialize the mirror mode.
                                </p>
                                {excelImportLoading && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <Zap className="w-6 h-6 text-brand-blue animate-pulse" />
                                            <span className="text-brand-blue font-medium text-sm">
                                                Processing Excel...
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RFP Upload Card */}
                            <div className="group relative rounded-2xl border border-border bg-card/20 hover:bg-card/40 hover:border-emerald-500/30 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 border-dashed">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept=".pdf"
                                    multiple
                                    onChange={async (e) => {
                                        const files = Array.from(
                                            e.target.files || [],
                                        );
                                        if (files.length === 0) return;
                                        setRfpUploading(true);
                                        try {
                                            for (const f of files)
                                                await uploadRfpDocument(f);
                                        } finally {
                                            setRfpUploading(false);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                    <FileText className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    Upload RFP PDFs
                                </h3>
                                <p className="text-muted-foreground text-sm max-w-xs mb-4">
                                    Add Division 11 specs or display schedules
                                    for AI analysis.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-1.5 rounded-full">
                                    <Shield className="w-3 h-3" />
                                    {rfpDocuments.length > 0
                                        ? `${rfpDocuments.length} files in Vault`
                                        : "Vault Empty"}
                                </div>

                                {rfpUploading && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <Zap className="w-6 h-6 text-emerald-500 animate-pulse" />
                                            <span className="text-emerald-500 font-medium text-sm">
                                                Indexing Documents...
                                            </span>
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
                                {/* Status Bar: Validation + Diagnostics */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${excelDiagnostics?.totalOk ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : excelDiagnostics?.errors?.length ? "bg-red-500/10 border-red-500/20 text-red-400" : excelValidationOk ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}
                                        >
                                            {excelDiagnostics?.totalOk ||
                                            (!excelDiagnostics &&
                                                excelValidationOk) ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            )}
                                            <span className="font-medium">
                                                {excelDiagnostics?.errors
                                                    ?.length
                                                    ? "Parse Errors"
                                                    : excelDiagnostics?.warnings
                                                            ?.length
                                                      ? "Parsed with Warnings"
                                                      : excelDiagnostics?.totalOk
                                                        ? "Excel Validated"
                                                        : excelValidationOk
                                                          ? "Excel Validated"
                                                          : "Validation Issues"}
                                            </span>
                                        </div>

                                        {/* RFP Quick Upload in Preview Mode */}
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>Add RFP</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf"
                                                    multiple
                                                    onChange={async (e) => {
                                                        const files =
                                                            Array.from(
                                                                e.target
                                                                    .files ||
                                                                    [],
                                                            );
                                                        if (files.length === 0)
                                                            return;
                                                        setRfpUploading(true);
                                                        try {
                                                            for (const f of files)
                                                                await uploadRfpDocument(
                                                                    f,
                                                                );
                                                        } finally {
                                                            setRfpUploading(
                                                                false,
                                                            );
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {rfpDocuments.length > 0 && (
                                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {rfpDocuments.length}
                                                </span>
                                            )}
                                            {rfpUploading && (
                                                <Zap className="w-3 h-3 text-emerald-500 animate-pulse" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-muted-foreground font-mono">
                                        {excelPreview.fileName}
                                    </div>

                                    {/* Check Engine Light: Diagnostic Messages */}
                                    {excelDiagnostics &&
                                        (excelDiagnostics.errors.length > 0 ||
                                            excelDiagnostics.warnings.length >
                                                0) && (
                                            <div className="space-y-1">
                                                {excelDiagnostics.errors.map(
                                                    (err, i) => (
                                                        <div
                                                            key={`err-${i}`}
                                                            className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
                                                        >
                                                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                            <span>{err}</span>
                                                        </div>
                                                    ),
                                                )}
                                                {excelDiagnostics.warnings.map(
                                                    (warn, i) => (
                                                        <div
                                                            key={`warn-${i}`}
                                                            className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                                        >
                                                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                            <span>{warn}</span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
                                <Tabs defaultValue="excel">
                                    <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                                    Workbook
                                                </span>
                                                <span className="text-xs font-semibold text-foreground truncate max-w-[420px]">
                                                    {excelPreview.fileName}
                                                </span>
                                            </div>
                                        </div>
                                        <TabsList className="bg-muted/40">
                                            <TabsTrigger value="excel">
                                                Excel
                                            </TabsTrigger>
                                            <TabsTrigger value="screens">
                                                Screen Editor
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent
                                        value="excel"
                                        className="m-0 h-full data-[state=inactive]:hidden"
                                    >
                                        <div className="h-[620px] max-h-[72vh] min-h-[400px] overflow-hidden flex flex-col">
                                            <ExcelGridViewer />
                                        </div>
                                    </TabsContent>

                                    <TabsContent
                                        value="screens"
                                        className="m-0 h-full data-[state=inactive]:hidden"
                                    >
                                        <div className="h-[620px] max-h-[72vh] min-h-[400px] overflow-hidden flex flex-col">
                                            <ScreensGridEditor />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Step1Ingestion;
