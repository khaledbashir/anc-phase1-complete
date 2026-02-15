"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { useProposalContext } from "@/contexts/ProposalContext";
import { BaseButton } from "@/app/components";
import { Send, Sparkles, MessageSquare, Info, History, X, AlertCircle, Upload, FileText, Loader2, Trash2, Eye, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";
import { analyzeGaps, calculateCompletionRate } from "@/lib/gap-analysis";
import GapFillSidebar from "./GapFillSidebar";
import { generateGapFillQuestions } from "@/lib/gap-fill-questions";

type Message = {
    role: "user" | "ai";
    content: string;
};

const QUICK_PROMPTS = [
    { label: "Find Delivery Date", prompt: "What is the requested delivery or installation date in the RFP?" },
    { label: "Check Labor Rates", prompt: "Does the RFP specify prevailing wage or union labor rates? If so, what are they?" },
    { label: "Verify Warranties", prompt: "Extract all warranty requirements (years, coverage) from the document." },
];

const citationLabel = (path: string): string => {
    if (path === "receiver.name") return "Client name";
    if (path === "details.proposalName") return "Proposal name";
    if (path === "details.venue") return "Venue";
    if (path === "details.metadata.structuralTonnage") return "Structural tonnage";
    if (path === "details.metadata.reinforcingTonnage") return "Reinforcing tonnage";
    const screenMatch = path.match(/^details\.screens\[(\d+)\]\.(.+)$/);
    if (screenMatch) return `Screen ${Number(screenMatch[1]) + 1}: ${screenMatch[2].replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()}`;
    return path;
};

type SidebarTab = "chat" | "gap-fill";

const RfpSidebar = () => {
    const { confirm: confirmDialog } = useConfirm();
    const { aiWorkspaceSlug, aiMessages, aiLoading, executeAiCommand, uploadRfpDocument, reExtractRfp, rfpDocumentUrl, rfpDocuments, deleteRfpDocument, aiCitations, aiFields, verifiedFields } = useProposalContext();
    const { watch } = useFormContext();
    const proposalId = watch("details.proposalId");
    const [input, setInput] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);
    const [visionWarning, setVisionWarning] = useState<string | null>(null);
    const [isReExtracting, setIsReExtracting] = useState(false);
    const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
    const scrollRef = useRef<HTMLDivElement>(null);

    const formValues = watch();
    const gaps = analyzeGaps(formValues);
    const gapCount = gaps.length;
    const completionRate = calculateCompletionRate(gapCount, gaps);
    
    // Generate gap fill questions
    const gapFillQuestions = useMemo(() => {
        const proposal = {
            ...formValues,
            aiFilledFields: aiFields,
            verifiedFields,
            details: {
                ...formValues.details,
                proposalId: proposalId || formValues.details?.proposalId,
            },
        };
        return generateGapFillQuestions(proposal);
    }, [formValues, aiFields, verifiedFields, proposalId]);
    
    // Auto-switch to gap fill tab if questions exist and we're on chat
    useEffect(() => {
        if (gapFillQuestions.length > 0 && activeTab === "chat") {
            // Don't auto-switch, let user control it
            // But we could add a notification badge
        }
    }, [gapFillQuestions.length, activeTab]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiMessages]);

    const handleSendMessage = async (msg?: string) => {
        const messageText = msg || input;
        if (!messageText.trim() || !aiWorkspaceSlug) return;

        setInput("");
        await executeAiCommand(messageText);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result: any = await uploadRfpDocument(file);

            // Handle Smart Ingest Feedback and vision-off warning
            if (result?.visionWarning) setVisionWarning(result.visionWarning);
            if (result?.filterStats) {
                const { originalPages, keptPages, drawingCandidates } = result.filterStats;
                const savings = Math.round((1 - keptPages / (originalPages || 1)) * 100);
                const prompt = `I have uploaded ${file.name}. The Smart Filter reduced it from ${originalPages} to ${keptPages} pages (${savings}% noise reduction). ${drawingCandidates?.length ? `It also detected potential drawings on pages ${drawingCandidates.join(", ")}.` : ""} Please analyze the filtered content and extract the key technical requirements.`;
                await executeAiCommand(prompt);
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleVisionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsVisionAnalyzing(true);
        try {
            // 1. Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Image = reader.result as string;

                // 2. Add user message
                const userMsg = { role: "user" as const, content: "Analyzing attached drawing for display tags..." };
                // We'll just update local state for UI feedback, the context handles the actual list
                // Note: Ideally expose setAiMessages from context or just rely on executeAiCommand response

                // 3. Call Vision API (via our new route to keep keys server-side)
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/vision/analyze", {
                    method: "POST",
                    body: formData
                });

                const data = await res.json();

                if (data.success && data.results.length > 0) {
                    const extractedText = data.results.map((r: any) =>
                        `Found ${r.field}: ${r.value} (${Math.round(r.confidence * 100)}% confidence)`
                    ).join("\n");

                    // 4. Inject result into Chat
                    await executeAiCommand(`I analyzed the drawing. Here is what I found:\n${extractedText}\n\nPlease update the proposal details accordingly.`);
                } else {
                    await executeAiCommand("I analyzed the drawing but couldn't find any standard display tags (A, AV, etc).");
                }
            };
        } catch (error) {
            console.error("Vision analysis failed", error);
            await executeAiCommand("Error analyzing the drawing.");
        } finally {
            setIsVisionAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background border-l border-border">
            {/* Header */}
            <div className="p-4 border-b border-border bg-primary text-primary-foreground flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 fill-white animate-pulse" />
                    <div className="flex flex-col">
                        <h3 className="font-bold tracking-tight text-sm">ANC Intelligence Engine</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-500"
                                    style={{ width: `${completionRate}%` }}
                                />
                            </div>
                            <span className="text-[9px] font-bold opacity-80 uppercase tracking-wider">{completionRate}% Match</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold border border-white/30">
                        RAG-ACTIVE
                    </div>
                    {gapCount > 0 && (
                        <div className="flex items-center gap-1 text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded border border-white/30 text-white">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {gapCount} GAPS
                        </div>
                    )}
                </div>
            </div>

            {visionWarning && (
                <div className="px-4 py-2 border-b border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 flex items-center justify-between gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-800 dark:text-amber-200">{visionWarning}</span>
                    <button type="button" onClick={() => setVisionWarning(null)} className="shrink-0 p-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/50" aria-label="Dismiss">
                        <X className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                    </button>
                </div>
            )}

            {/* RFP Document Status */}
            <div className="px-4 py-2 border-b border-border bg-secondary/50 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className={cn("w-3.5 h-3.5 shrink-0", rfpDocumentUrl ? "text-emerald-500" : "text-muted-foreground")} />
                    <span className="text-[10px] font-medium text-muted-foreground truncate">
                        {rfpDocumentUrl ? "RFP Document Loaded" : "No RFP Uploaded"}
                    </span>
                </div>
                <label className="cursor-pointer group">
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={isUploading} />
                    {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#0A52EF] animate-spin" />
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#0A52EF] hover:text-[#0A52EF] transition-colors">
                            <Upload className="w-3 h-3" />
                            {rfpDocumentUrl ? "REPLACE" : "UPLOAD"}
                        </div>
                    )}
                </label>

                {aiWorkspaceSlug && rfpDocumentUrl && (
                    <button
                        type="button"
                        onClick={async () => {
                            setIsReExtracting(true);
                            try { await reExtractRfp(); } finally { setIsReExtracting(false); }
                        }}
                        disabled={isReExtracting}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#0A52EF] hover:text-[#0A52EF] transition-colors disabled:opacity-50"
                    >
                        {isReExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                        RE-EXTRACT
                    </button>
                )}

                {/* Vision Upload Button */}
                <label className="cursor-pointer group ml-4 pl-4 border-l border-border">
                    <input type="file" className="hidden" accept="image/*" onChange={handleVisionUpload} disabled={isVisionAnalyzing} />
                    {isVisionAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-500 hover:text-purple-400 transition-colors" title="Analyze Drawing">
                            <Eye className="w-3 h-3" />
                            SCAN DRAWING
                        </div>
                    )}
                </label>
            </div>

            {/* Tab Switcher: Chat vs Gap Fill */}
            <div className="flex border-b border-border bg-muted/10">
                <button
                    onClick={() => setActiveTab("chat")}
                    className={cn(
                        "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
                        activeTab === "chat"
                            ? "bg-brand-blue/10 text-brand-blue border-b-2 border-brand-blue"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <MessageSquare className="w-3 h-3" />
                    Chat
                </button>
                <button
                    onClick={() => setActiveTab("gap-fill")}
                    className={cn(
                        "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 relative",
                        activeTab === "gap-fill"
                            ? "bg-brand-blue/10 text-brand-blue border-b-2 border-brand-blue"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <HelpCircle className="w-3 h-3" />
                    Gap Fill
                    {gapFillQuestions.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                            {gapFillQuestions.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Gap Fill Sidebar Content */}
            {activeTab === "gap-fill" ? (
                <div className="flex-1 overflow-hidden">
                    <GapFillSidebar />
                </div>
            ) : (
                <>
                    {/* Chat Sidebar Content */}
                    {/* Extraction sources (citations for Trust but Verify) */}
                    {aiCitations && Object.keys(aiCitations).length > 0 && (
                        <div className="px-4 py-2 border-b border-border bg-muted/20">
                            <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                                <Info className="w-3 h-3" /> Sources
                            </p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                                {Object.entries(aiCitations).map(([path, citation]) => (
                                    <div key={path} className="text-[10px]">
                                        <span className="font-medium text-foreground">{citationLabel(path)}</span>
                                        <p className="font-mono text-muted-foreground mt-0.5 break-all">{citation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

            {/* RFP Vault List */}
            {rfpDocuments && rfpDocuments.length > 0 && (
                <div className="px-4 py-2 border-b border-border bg-muted/30">
                    <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3 h-3" /> Vault ({rfpDocuments.length})
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {rfpDocuments.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/20 transition-colors group relative">
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 flex-1 min-w-0"
                                >
                                    <FileText className="w-3 h-3 text-muted-foreground group-hover:text-[#0A52EF] shrink-0" />
                                    <span className="text-xs text-foreground truncate" title={doc.name}>{doc.name}</span>
                                </a>
                                <span className="text-[9px] text-muted-foreground shrink-0 group-hover:hidden">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                <button
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        const ok = await confirmDialog({ title: "Delete Document", description: "Delete this RFP document? This cannot be undone.", confirmLabel: "Delete", variant: "destructive" });
                                        if (ok) await deleteRfpDocument(doc.id);
                                    }}
                                    className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded hover:bg-accent text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                                    title="Delete from Vault"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

                    {/* Chat Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                    >
                {aiMessages.length === 0 && (
                    <div className="text-center py-10 space-y-4">
                        <div className="bg-[#0A52EF]/10 dark:bg-[#0A52EF]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquare className="w-6 h-6 text-[#0A52EF]" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">ANC Document Brain</p>
                            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                                {rfpDocumentUrl
                                    ? "Ask anything about the uploaded RFP or add screens directly via chat."
                                    : "Upload an RFP document to begin context-aware analysis."}
                            </p>
                        </div>
                        {!rfpDocumentUrl && (
                            <BaseButton
                                variant="outline"
                                size="sm"
                                className="mx-auto"
                                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                            >
                                <Upload className="w-3 h-3 mr-2" />
                                Upload RFP
                            </BaseButton>
                        )}
                    </div>
                )}

                {aiMessages.map((m, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex flex-col max-w-[90%] space-y-1",
                            m.role === "user" ? "ml-auto items-end" : "items-start"
                        )}
                    >
                        <div className={cn(
                            "px-3 py-2 rounded-2xl text-xs leading-relaxed",
                            m.role === "user"
                                ? "bg-[#0A52EF] text-white rounded-tr-none"
                                : "bg-background text-foreground border border-border rounded-tl-none"
                        )}>
                            {m.content}
                        </div>
                    </div>
                ))}

                {aiLoading && (
                    <div className="flex items-start gap-2 max-w-[90%]">
                        <div className="bg-card px-3 py-2 rounded-2xl rounded-tl-none text-xs text-muted-foreground italic animate-pulse\">
                            Processing document context...
                        </div>
                    </div>
                )}
            </div>

                    {/* Bottom Panel */}
                    <div className="p-4 border-t border-border space-y-4 bg-background">
                {/* Quick Prompts */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" /> Quick Gaps
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map((qp, i) => (
                            <button
                                key={i}
                                onClick={() => handleSendMessage(qp.prompt)}
                                disabled={aiLoading || !aiWorkspaceSlug}
                                className="text-[10px] bg-background border border-border px-2 py-1.5 rounded-lg hover:border-[#0A52EF] hover:text-[#0A52EF] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-foreground shadow-sm\"
                            >
                                {qp.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input Area */}
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Ask ANC Intelligence..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#0A52EF] focus:outline-none pr-10 shadow-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={aiLoading || !input.trim() || !aiWorkspaceSlug}
                        className="absolute right-2 top-2 p-1.5 text-[#0A52EF] hover:bg-accent rounded-lg transition-all disabled:opacity-30"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RfpSidebar;
