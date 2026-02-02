"use client";

import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Calculator, FileText, Wand2, Sparkles, Box, Info, AlertCircle, Target } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    const isLOI = mode === "LOI";
    const showExhibitA = useWatch({ name: "details.showExhibitA", control });
    const showExhibitB = useWatch({ name: "details.showExhibitB", control });
    const includePricingBreakdown = useWatch({ name: "details.includePricingBreakdown", control });
    const showPaymentTerms = useWatch({ name: "details.showPaymentTerms", control });
    const showSignatureBlock = useWatch({ name: "details.showSignatureBlock", control });
    const lastIsLOIRef = useRef<boolean>(isLOI);

    const screenCount = screens.length;
    const hasData = aiWorkspaceSlug || screenCount > 0;

    useEffect(() => {
        if (isLOI) return;
        if (showPaymentTerms) setValue("details.showPaymentTerms", false, { shouldDirty: true });
        if (showSignatureBlock) setValue("details.showSignatureBlock", false, { shouldDirty: true });
    }, [isLOI, setValue, showPaymentTerms, showSignatureBlock]);

    useEffect(() => {
        const wasLOI = lastIsLOIRef.current;
        if (!wasLOI && isLOI) {
            if (!showPaymentTerms) setValue("details.showPaymentTerms", true, { shouldDirty: true });
            if (!showSignatureBlock) setValue("details.showSignatureBlock", true, { shouldDirty: true });
            if (!showExhibitB) setValue("details.showExhibitB", true, { shouldDirty: true });
        }
        lastIsLOIRef.current = isLOI;
    }, [isLOI, setValue, showExhibitB, showPaymentTerms, showSignatureBlock]);

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

            <Card className="bg-zinc-900/50 border-zinc-800/50 overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-800/50">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <CardTitle className="text-zinc-100 text-base">Document Toggles</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">
                                Controls which sections render in the PDF template.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="border-zinc-700/60 bg-zinc-950 text-zinc-300 text-[10px] font-bold uppercase tracking-widest">
                            {mode}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Show Exhibit A</Label>
                            <div className="text-[11px] text-zinc-500 mt-1">Statement of Work + Technical Specs (LOI exhibits)</div>
                        </div>
                        <Switch
                            checked={!!showExhibitA}
                            onCheckedChange={(checked) => setValue("details.showExhibitA", checked, { shouldDirty: true })}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Show Exhibit B</Label>
                            <div className="text-[11px] text-zinc-500 mt-1">Cost Schedule appendix</div>
                        </div>
                        <Switch
                            checked={!!showExhibitB}
                            onCheckedChange={(checked) => setValue("details.showExhibitB", checked, { shouldDirty: true })}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Show Pricing Breakdown</Label>
                            <div className="text-[11px] text-zinc-500 mt-1">Per-screen category detail vs simplified rows</div>
                        </div>
                        <Switch
                            checked={!!includePricingBreakdown}
                            onCheckedChange={(checked) => setValue("details.includePricingBreakdown", checked, { shouldDirty: true })}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Show Payment Terms</Label>
                            <div className="text-[11px] text-zinc-500 mt-1">{isLOI ? "LOI only" : "Disabled (not LOI)"}</div>
                        </div>
                        <Switch
                            disabled={!isLOI}
                            checked={!!showPaymentTerms}
                            onCheckedChange={(checked) => setValue("details.showPaymentTerms", checked, { shouldDirty: true })}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Show Signature Block</Label>
                            <div className="text-[11px] text-zinc-500 mt-1">{isLOI ? "LOI only" : "Disabled (not LOI)"}</div>
                        </div>
                        <Switch
                            disabled={!isLOI}
                            checked={!!showSignatureBlock}
                            onCheckedChange={(checked) => setValue("details.showSignatureBlock", checked, { shouldDirty: true })}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800/50 flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 shrink-0 border-b border-zinc-800/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-blue/20">
                                <Calculator className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div>
                                <CardTitle className="text-zinc-100 text-base">Drafting Table: Screen Configurations</CardTitle>
                                <CardDescription className="text-zinc-500 text-xs">Define technical specifications for the display system.</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
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
