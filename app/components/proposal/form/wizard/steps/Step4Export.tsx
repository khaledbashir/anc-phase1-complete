"use client";

import { useState } from "react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useFormContext } from "react-hook-form";
import {
    FileDown,
    Printer,
    Eye,
    CheckCircle2,
    Share2,
    Mail,
    Clock,
    ArrowLeft,
    Copy,
    Check,
    FileSpreadsheet,
    Shield,
    AlertTriangle
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BaseButton } from "@/app/components";
import { formatCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const Step4Export = () => {
    const {
        downloadPdf,
        printPdf,
        previewPdfInTab,
        saveProposalData,
        sendPdfToMail,
        exportAudit
    } = useProposalContext();
    const { watch } = useFormContext();
    const [copied, setCopied] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // Get proposal data
    const screens = watch("details.screens") || [];
    const internalAudit = watch("details.internalAudit");
    const proposalName = watch("details.proposalName") || "Untitled Proposal";
    const proposalId = watch("details.proposalId");
    const totalValue = internalAudit?.totals?.finalClientTotal || 0;
    const lastSaved = watch("lastSavedAt");

    const screenCount = screens.length;
    const hasErrors = screens.some((s: any) => !s.widthFt || !s.heightFt || !s.name);
    const allScreensValid = screenCount > 0 && !hasErrors;

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = async () => {
        // This would typically open a modal or use the existing email modal
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 max-w-4xl mx-auto">
            {/* Success Header */}
            <div className="text-center space-y-3">
                <div className={cn(
                    "inline-flex items-center justify-center w-12 h-12 rounded-full mb-2",
                    allScreensValid ? "bg-emerald-500/10" : "bg-yellow-500/10"
                )}>
                    {allScreensValid ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    )}
                </div>

                <h1 className="text-xl font-semibold text-zinc-100">
                    {allScreensValid ? "Proposal Validated" : "Proposal Incomplete"}
                </h1>

                <p className="text-zinc-500 text-base">
                    {proposalName}
                </p>

                <div className="flex items-center justify-center gap-3 text-[11px]">
                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                        {screenCount} screen{screenCount !== 1 ? 's' : ''}
                    </span>
                    <span className="px-2 py-0.5 border border-blue-500/20 text-blue-500 rounded font-medium">
                        {formatCurrency(totalValue)}
                    </span>
                    {allScreensValid && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Ready for Export
                        </span>
                    )}
                </div>

                {hasErrors && (
                    <div className="inline-flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mt-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-500">
                            Some screens have missing information. Complete all fields before exporting.
                        </span>
                    </div>
                )}
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Download PDF */}
                <Card
                    className={cn(
                        "border transition-all cursor-pointer group",
                        allScreensValid
                            ? "bg-zinc-900/50 border-zinc-800 hover:border-[#0A52EF]/50 hover:shadow-[0_0_20px_rgba(10,82,239,0.2)]"
                            : "bg-zinc-900/30 border-zinc-800/50 opacity-50 cursor-not-allowed"
                    )}
                    onClick={allScreensValid ? downloadPdf : undefined}
                >
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-[#0A52EF]/10 group-hover:bg-[#0A52EF]/20 transition-colors">
                                <FileDown className="w-6 h-6 text-[#0A52EF]" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-zinc-100">Download PDF</h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Client-ready proposal
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Internal Excel Audit - With Security Blanket Tooltip */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card
                                className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer group"
                                onClick={exportAudit}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                                            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-zinc-100">Internal Excel Audit</h3>
                                            <p className="text-sm text-zinc-500 mt-1">
                                                Formulaic breakdown with divisor math
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                        >
                            <p className="text-xs leading-relaxed">
                                <strong className="text-emerald-400">The Security Blanket:</strong> This generates an Excel file with Live Formulas. Senior estimators can audit every cell to see exactly how the AI arrived at the numbers.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Email to Client */}
                <Card
                    className={cn(
                        "border transition-all cursor-pointer group",
                        allScreensValid
                            ? "bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50"
                            : "bg-zinc-900/30 border-zinc-800/50 opacity-50 cursor-not-allowed"
                    )}
                    onClick={allScreensValid ? handleSendEmail : undefined}
                >
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                <Mail className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-zinc-100">Email to Client</h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Send proposal directly
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Actions */}
            <Card className="bg-zinc-900/30 border-zinc-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-zinc-400">Additional Options</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <BaseButton
                            variant="outline"
                            size="sm"
                            onClick={previewPdfInTab}
                            className="justify-center"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                        </BaseButton>

                        <BaseButton
                            variant="outline"
                            size="sm"
                            onClick={printPdf}
                            className="justify-center"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </BaseButton>

                        <BaseButton
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="justify-center"
                        >
                            {copied ? (
                                <><Check className="w-4 h-4 mr-2" /> Copied</>
                            ) : (
                                <><Share2 className="w-4 h-4 mr-2" /> Share</>
                            )}
                        </BaseButton>

                        <BaseButton
                            variant="outline"
                            size="sm"
                            onClick={saveProposalData}
                            className="justify-center"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Save Now
                        </BaseButton>
                    </div>
                </CardContent>
            </Card>

            {/* Project Status Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Clock className="w-4 h-4" />
                        <span>
                            {lastSaved
                                ? `Last saved to vault: ${new Date(lastSaved).toLocaleString()}`
                                : "Auto-saving enabled"
                            }
                        </span>
                    </div>

                    {proposalId && (
                        <span className="text-xs text-zinc-600 font-mono">
                            ID: {proposalId}
                        </span>
                    )}
                </div>

                <BaseButton
                    variant="ghost"
                    size="sm"
                    onClick={() => window.history.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Pricing
                </BaseButton>
            </div>

        </div>
    );
};

export default Step4Export;
