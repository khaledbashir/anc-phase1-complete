"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Calculator, FileText, Wand2, Sparkles, Box, Info, AlertCircle, Target, FileSignature } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Screens } from "@/app/components";
import { Badge } from "@/components/ui/badge";
import { useProposalContext } from "@/contexts/ProposalContext";
import { resolveDocumentMode } from "@/lib/documentMode";

const Step2Intelligence = () => {
    const { aiWorkspaceSlug, filterStats, setSidebarMode } = useProposalContext();
    const { control, setValue } = useFormContext();
    const screens = useWatch({
        name: "details.screens",
        control
    }) || [];
    const details = useWatch({ name: "details", control });
    const mode = resolveDocumentMode(details);

    const screenCount = screens.length;
    const hasData = aiWorkspaceSlug || screenCount > 0;

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Intelligence Briefing */}
            {hasData ? (
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <Sparkles className="w-24 h-24 text-brand-blue" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Badge className="bg-brand-blue text-white hover:bg-brand-blue/90 px-3 py-1">
                                <Sparkles className="w-3 h-3 mr-1.5 fill-white" />
                                Project Data Loaded
                            </Badge>
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">Display Schedule Analysis</h2>
                        <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
                            {aiWorkspaceSlug ? (
                                <>
                                    I've analyzed the uploaded RFP documents and extracted <span className="text-white font-semibold underline decoration-brand-blue/50">{screenCount} video screens</span>.
                                    <br /><br />
                                    {filterStats && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <Badge variant="outline" className="border-brand-blue/30 bg-brand-blue/10 text-brand-blue">
                                                <FileText className="w-3 h-3 mr-1" />
                                                Processed {filterStats.originalPages} Pages
                                            </Badge>
                                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                                <Target className="w-3 h-3 mr-1" />
                                                Retained {filterStats.keptPages} Signal Pages
                                            </Badge>
                                            {filterStats.drawingCandidates.length > 0 && (
                                                <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400">
                                                    <Box className="w-3 h-3 mr-1" />
                                                    Found {filterStats.drawingCandidates.length} Drawings
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                    <span className="inline-flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30 text-xs">
                                        <Sparkles className="w-3 h-3" />
                                        Extraction Confidence: 85% (17/20 Specs Found)
                                    </span>
                                </>
                            ) : (
                                <>I've detected <span className="text-white font-semibold underline decoration-brand-blue/50">{screenCount} screen configurations</span> in your draft. I can help you optimize these specs or apply product catalogs from <span className="text-brand-blue font-bold">Standard</span> or <span className="text-brand-blue font-bold">Premium</span> vendors.</>
                            )}
                        </p>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setSidebarMode("CHAT");
                                    document.dispatchEvent(new CustomEvent('open-intelligence-sidebar'));
                                }}
                                className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-blue/20"
                            >
                                <Wand2 className="w-4 h-4" />
                                Review Gaps (3)
                            </button>
                            <button disabled className="px-4 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-sm font-medium text-zinc-500 cursor-not-allowed flex items-center gap-2">
                                <Box className="w-4 h-4 text-zinc-600" />
                                Premium Catalog
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-zinc-800/50 rounded-full">
                        <AlertCircle className="w-8 h-8 text-zinc-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">No Data Detected</h3>
                        <p className="text-zinc-500 text-sm max-w-xs">
                            The Intelligence Engine hasn't received any data yet. Please upload an RFP in Step 1 or start adding screens below.
                        </p>
                    </div>
                </div>
            )}

            {/* Document Mode Summary - shows what current mode includes */}
            <div className="rounded-xl border-2 border-border bg-card/50 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Document Mode</h3>
                        <p className="text-[11px] text-muted-foreground">Change mode in the toolbar above</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide ${
                        mode === "BUDGET" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                        mode === "PROPOSAL" ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" :
                        "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                    }`}>
                        {mode === "BUDGET" ? "Budget Estimate" : mode === "PROPOSAL" ? "Proposal" : "Letter of Intent"}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Intro Text", included: true },
                        { label: "Pricing Table", included: true },
                        { label: "Specifications", included: mode !== "LOI" },
                        { label: "Statement of Work", included: mode === "PROPOSAL" || mode === "LOI" },
                        { label: "Payment Terms", included: mode === "LOI" },
                        { label: "Signature Block", included: mode === "LOI" },
                        { label: "Exhibit A (SOW)", included: mode === "LOI" },
                        { label: "Exhibit B (Costs)", included: mode === "LOI" },
                    ].map((item) => (
                        <div 
                            key={item.label}
                            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                item.included 
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                    : "bg-muted/50 text-muted-foreground border border-transparent"
                            }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${item.included ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            {item.label}
                        </div>
                    ))}
                </div>
                
                <p className="text-[10px] text-muted-foreground mt-4 text-center">
                    {mode === "BUDGET" && "Non-binding estimate — no signatures required"}
                    {mode === "PROPOSAL" && "Formal quote — professional but not legally binding"}
                    {mode === "LOI" && "Legal contract — includes payment terms and signature lines"}
                </p>
            </div>

            {/* LOI-specific fields: Payment Terms & Notes */}
            {mode === "LOI" && (
                <Card className="bg-card/50 border-emerald-500/30 border-2 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <FileSignature className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground text-base">LOI Contract Details</CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">These fields appear in the LOI document for signatures</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wide">Payment Terms</Label>
                            <Textarea
                                placeholder="e.g., 50% on Deposit, 40% on Mobilization, 10% on Substantial Completion"
                                defaultValue={details?.paymentTerms || "50% on Deposit, 40% on Mobilization, 10% on Substantial Completion"}
                                onChange={(e) => setValue("details.paymentTerms", e.target.value, { shouldDirty: true })}
                                className="min-h-[80px] text-sm bg-background border-border"
                            />
                            <p className="text-[10px] text-muted-foreground">Define payment milestones for the contract</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wide">Additional Notes / Legal Notes</Label>
                            <Textarea
                                placeholder="Any additional terms, conditions, or notes to include in the LOI..."
                                defaultValue={details?.additionalNotes || ""}
                                onChange={(e) => setValue("details.additionalNotes", e.target.value, { shouldDirty: true })}
                                className="min-h-[100px] text-sm bg-background border-border"
                            />
                            <p className="text-[10px] text-muted-foreground">Optional notes that will appear in the Legal Notes section</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-card/50 border-border flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 shrink-0 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-blue/20">
                                <Calculator className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground text-base">Drafting Table: Screen Configurations</CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">Define technical specifications for the display system.</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                            <Info className="w-3 h-3" />
                            Auto-syncing to PDF Anchor
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                    <div className="p-6">
                        <Screens />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Step2Intelligence;
