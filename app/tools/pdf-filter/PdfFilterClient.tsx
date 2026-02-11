"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Upload, X, Download, AlertTriangle, ChevronLeft, Eye, ArrowRight,
  ArrowLeft, FileText, Loader2, ChevronDown, Zap, Pencil, Image as ImageIcon,
  Package, GripVertical, FolderOpen, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PageScore, ClassificationResult } from "./lib/scoring";
import { classifyAndScorePages, splitByThreshold } from "./lib/scoring";
import {
  extractPageTexts, renderPageThumbnail, renderPageFull,
  buildFilteredPdf, downloadPdf, type ExtractionProgress,
} from "./lib/pdf-utils";
import { KEYWORD_PRESETS, getActiveKeywords } from "./lib/keyword-presets";
import {
  DRAWING_CATEGORIES, getDefaultEnabledDrawingCategories,
  VISION_CATEGORY_LABELS,
} from "./lib/drawing-categories";
import {
  analyzeAllDrawings, estimateCost, splitDrawingsByConfidence,
  type DrawingAnalysisResult, type VisionProgress,
} from "./lib/pdf-vision";

type Phase = "upload" | "triage";
type TriageTab = "text" | "drawings" | "export";

interface TriageState {
  keep: PageScore[];
  discard: PageScore[];
}

interface DrawingTriageState {
  keep: DrawingAnalysisResult[];
  discard: DrawingAnalysisResult[];
}

export default function PdfFilterClient() {
  // ─── Phase 0 state ───
  const [phase, setPhase] = useState<Phase>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    () => new Set(KEYWORD_PRESETS.map((c) => c.id))
  );
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ─── Classification result ───
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState<TriageTab>("text");

  // ─── Text triage state ───
  const [textTriage, setTextTriage] = useState<TriageState>({ keep: [], discard: [] });
  const [textThreshold, setTextThreshold] = useState(0.01);
  const [textSelected, setTextSelected] = useState<Set<number>>(new Set());
  const [textLastClicked, setTextLastClicked] = useState<number | null>(null);

  // ─── Drawing triage state ───
  const [drawingCategories, setDrawingCategories] = useState<Set<string>>(
    getDefaultEnabledDrawingCategories
  );
  const [drawingCustomInstructions, setDrawingCustomInstructions] = useState("");
  const [isAnalyzingDrawings, setIsAnalyzingDrawings] = useState(false);
  const [drawingProgress, setDrawingProgress] = useState<VisionProgress | null>(null);
  const [drawingResults, setDrawingResults] = useState<DrawingAnalysisResult[]>([]);
  const [drawingTriage, setDrawingTriage] = useState<DrawingTriageState>({ keep: [], discard: [] });
  const [drawingSelected, setDrawingSelected] = useState<Set<number>>(new Set());
  const [drawingsAnalyzed, setDrawingsAnalyzed] = useState(false);

  // ─── Shared state ───
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [thumbnailCache, setThumbnailCache] = useState<Map<number, string>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingAbortRef = useRef<AbortController | null>(null);

  // ─── Derived ───
  const allKeywords = useMemo(
    () => getActiveKeywords(enabledCategories, customKeywords),
    [enabledCategories, customKeywords]
  );
  const allPresetsEnabled = enabledCategories.size === KEYWORD_PRESETS.length;
  const drawingPageCount = classification?.drawingPages.length ?? 0;
  const costEstimate = estimateCost(drawingPageCount);

  // ═══════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleFileSelect = useCallback((f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    f.arrayBuffer().then(setFileBuffer);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const togglePresetCategory = useCallback((id: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllPresets = useCallback(() => {
    if (allPresetsEnabled) setEnabledCategories(new Set());
    else setEnabledCategories(new Set(KEYWORD_PRESETS.map((c) => c.id)));
  }, [allPresetsEnabled]);

  const addCustomKw = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const newKws = trimmed.split(",").map((k) => k.trim()).filter((k) => k && !customKeywords.includes(k));
    if (newKws.length > 0) setCustomKeywords((prev) => [...prev, ...newKws]);
    setCustomInput("");
  }, [customInput, customKeywords]);

  const removeCustomKw = useCallback((kw: string) => {
    setCustomKeywords((prev) => prev.filter((k) => k !== kw));
  }, []);

  // ─── Analyze (classification + text scoring) ───
  const handleAnalyze = useCallback(async () => {
    if (!fileBuffer || allKeywords.length === 0) return;
    setIsAnalyzing(true);
    setProgress({ current: 0, total: 0, phase: "loading" });

    try {
      const { pageTexts, pdfDoc: doc } = await extractPageTexts(fileBuffer, setProgress);
      setPdfDoc(doc);

      const result = classifyAndScorePages(pageTexts, allKeywords);
      setClassification(result);

      const { keep, discard } = splitByThreshold(result.textPages, textThreshold);
      setTextTriage({ keep, discard });
      setPhase("triage");
      setActiveTab("text");
    } catch (err) {
      console.error("PDF analysis failed:", err);
      alert(`PDF analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  }, [fileBuffer, allKeywords, textThreshold]);

  // ─── Text threshold change ───
  const handleTextThresholdChange = useCallback((newThreshold: number) => {
    setTextThreshold(newThreshold);
    if (!classification) return;

    const manualKeep = new Set(textTriage.keep.filter((p) => p.score < textThreshold).map((p) => p.pageIndex));
    const manualDiscard = new Set(textTriage.discard.filter((p) => p.score >= textThreshold).map((p) => p.pageIndex));

    const newKeep: PageScore[] = [];
    const newDiscard: PageScore[] = [];

    for (const page of classification.textPages) {
      if (manualKeep.has(page.pageIndex)) newKeep.push(page);
      else if (manualDiscard.has(page.pageIndex)) newDiscard.push(page);
      else if (page.score >= newThreshold) newKeep.push(page);
      else newDiscard.push(page);
    }

    newKeep.sort((a, b) => b.score - a.score);
    newDiscard.sort((a, b) => a.score - b.score);
    setTextTriage({ keep: newKeep, discard: newDiscard });
    setTextSelected(new Set());
  }, [classification, textTriage, textThreshold]);

  // ─── Text selection ───
  const handleTextPageClick = useCallback((pageIndex: number, column: "keep" | "discard", e: React.MouseEvent) => {
    const list = column === "keep" ? textTriage.keep : textTriage.discard;
    const clickedIdx = list.findIndex((p) => p.pageIndex === pageIndex);

    if (e.shiftKey && textLastClicked !== null) {
      const lastIdx = list.findIndex((p) => p.pageIndex === textLastClicked);
      if (lastIdx !== -1 && clickedIdx !== -1) {
        const [start, end] = [Math.min(lastIdx, clickedIdx), Math.max(lastIdx, clickedIdx)];
        const range = list.slice(start, end + 1).map((p) => p.pageIndex);
        setTextSelected((prev) => { const n = new Set(prev); range.forEach((i) => n.add(i)); return n; });
        setTextLastClicked(pageIndex);
        return;
      }
    }

    setTextSelected((prev) => {
      const n = new Set(prev);
      if (n.has(pageIndex)) n.delete(pageIndex); else n.add(pageIndex);
      return n;
    });
    setTextLastClicked(pageIndex);
  }, [textTriage, textLastClicked]);

  const moveTextToKeep = useCallback(() => {
    if (textSelected.size === 0) return;
    setTextTriage((prev) => {
      const toMove = prev.discard.filter((p) => textSelected.has(p.pageIndex));
      const remaining = prev.discard.filter((p) => !textSelected.has(p.pageIndex));
      return { keep: [...prev.keep, ...toMove].sort((a, b) => b.score - a.score), discard: remaining };
    });
    setTextSelected(new Set());
  }, [textSelected]);

  const moveTextToDiscard = useCallback(() => {
    if (textSelected.size === 0) return;
    setTextTriage((prev) => {
      const toMove = prev.keep.filter((p) => textSelected.has(p.pageIndex));
      const remaining = prev.keep.filter((p) => !textSelected.has(p.pageIndex));
      return { keep: remaining, discard: [...prev.discard, ...toMove].sort((a, b) => a.score - b.score) };
    });
    setTextSelected(new Set());
  }, [textSelected]);

  const handleTextDragMove = useCallback((pageIndex: number, from: "keep" | "discard", to: "keep" | "discard") => {
    setTextTriage((prev) => {
      const sourceList = from === "keep" ? prev.keep : prev.discard;
      const targetList = to === "keep" ? prev.keep : prev.discard;
      const page = sourceList.find((p) => p.pageIndex === pageIndex);
      if (!page) return prev;
      const newSource = sourceList.filter((p) => p.pageIndex !== pageIndex);
      const newTarget = [...targetList, page];
      if (to === "keep") newTarget.sort((a, b) => b.score - a.score);
      else newTarget.sort((a, b) => a.score - b.score);
      return {
        keep: from === "keep" ? newSource : newTarget,
        discard: from === "discard" ? newSource : newTarget,
      };
    });
  }, []);

  // ─── Drawing analysis ───
  const handleAnalyzeDrawings = useCallback(async () => {
    if (!pdfDoc || !classification || classification.drawingPages.length === 0) return;

    drawingAbortRef.current?.abort();
    const controller = new AbortController();
    drawingAbortRef.current = controller;

    const totalDrawings = classification.drawingPages.length;
    setIsAnalyzingDrawings(true);
    setDrawingProgress({ completed: 0, total: totalDrawings, results: [] });

    try {
      // Render thumbnails in batches of 20 with progress
      const drawingImages: { pageIndex: number; pageNumber: number; base64: string }[] = [];
      const THUMB_BATCH = 20;
      for (let i = 0; i < classification.drawingPages.length; i += THUMB_BATCH) {
        if (controller.signal.aborted) return;
        const batch = classification.drawingPages.slice(i, i + THUMB_BATCH);
        const thumbs = await Promise.all(
          batch.map(async (page) => {
            const thumb = await renderPageThumbnail(pdfDoc, page.pageNumber, 300);
            // Cache for reuse in UI
            setThumbnailCache((prev) => new Map(prev).set(page.pageNumber, thumb));
            return { pageIndex: page.pageIndex, pageNumber: page.pageNumber, base64: thumb };
          })
        );
        drawingImages.push(...thumbs);
      }

      if (controller.signal.aborted) return;

      const results = await analyzeAllDrawings(
        drawingImages,
        Array.from(drawingCategories),
        drawingCustomInstructions,
        (prog) => {
          setDrawingProgress(prog);
          const { keep, discard } = splitDrawingsByConfidence(prog.results, drawingCategories);
          setDrawingTriage({ keep, discard });
        },
        controller.signal
      );

      if (controller.signal.aborted) return;

      setDrawingResults(results);
      const { keep, discard } = splitDrawingsByConfidence(results, drawingCategories);
      setDrawingTriage({ keep, discard });
      setDrawingsAnalyzed(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Drawing analysis failed:", err);
      alert(`Drawing analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (!controller.signal.aborted) {
        setIsAnalyzingDrawings(false);
      }
    }
  }, [pdfDoc, classification, drawingCategories, drawingCustomInstructions]);

  // ─── Drawing selection ───
  const handleDrawingClick = useCallback((pageIndex: number, e: React.MouseEvent) => {
    setDrawingSelected((prev) => {
      const n = new Set(prev);
      if (n.has(pageIndex)) n.delete(pageIndex); else n.add(pageIndex);
      return n;
    });
  }, []);

  const moveDrawingsToKeep = useCallback(() => {
    if (drawingSelected.size === 0) return;
    setDrawingTriage((prev) => {
      const toMove = prev.discard.filter((r) => drawingSelected.has(r.pageIndex));
      const remaining = prev.discard.filter((r) => !drawingSelected.has(r.pageIndex));
      return { keep: [...prev.keep, ...toMove].sort((a, b) => b.confidence - a.confidence), discard: remaining };
    });
    setDrawingSelected(new Set());
  }, [drawingSelected]);

  const moveDrawingsToDiscard = useCallback(() => {
    if (drawingSelected.size === 0) return;
    setDrawingTriage((prev) => {
      const toMove = prev.keep.filter((r) => drawingSelected.has(r.pageIndex));
      const remaining = prev.keep.filter((r) => !drawingSelected.has(r.pageIndex));
      return { keep: remaining, discard: [...prev.discard, ...toMove].sort((a, b) => a.confidence - b.confidence) };
    });
    setDrawingSelected(new Set());
  }, [drawingSelected]);

  const handleDrawingDragMove = useCallback((pageIndex: number, from: "keep" | "discard", to: "keep" | "discard") => {
    setDrawingTriage((prev) => {
      const sourceList = from === "keep" ? prev.keep : prev.discard;
      const targetList = to === "keep" ? prev.keep : prev.discard;
      const item = sourceList.find((r) => r.pageIndex === pageIndex);
      if (!item) return prev;
      const newSource = sourceList.filter((r) => r.pageIndex !== pageIndex);
      const newTarget = [...targetList, item];
      if (to === "keep") newTarget.sort((a, b) => b.confidence - a.confidence);
      else newTarget.sort((a, b) => a.confidence - b.confidence);
      return {
        keep: from === "keep" ? newSource : newTarget,
        discard: from === "discard" ? newSource : newTarget,
      };
    });
  }, []);

  // ─── Preview ───
  const openPreview = useCallback(async (pageNumber: number) => {
    if (!pdfDoc) return;
    setPreviewPage(pageNumber);
    setIsLoadingPreview(true);
    setPreviewImage(null);
    try {
      const img = await renderPageFull(pdfDoc, pageNumber);
      setPreviewImage(img);
    } catch (err) {
      console.error("Failed to render preview:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [pdfDoc]);

  // ─── Export ───
  const handleExport = useCallback(async (mode: "combined" | "text" | "drawings") => {
    if (!fileBuffer) return;
    setIsExporting(true);
    try {
      let keepIndices: number[] = [];
      if (mode === "combined" || mode === "text") {
        keepIndices.push(...textTriage.keep.map((p) => p.pageIndex));
      }
      if (mode === "combined" || mode === "drawings") {
        keepIndices.push(...drawingTriage.keep.map((r) => r.pageIndex));
      }
      keepIndices = [...new Set(keepIndices)].sort((a, b) => a - b);

      if (keepIndices.length === 0) {
        alert("No pages selected for export.");
        return;
      }

      const pdfBytes = await buildFilteredPdf(fileBuffer, keepIndices);
      const suffix = mode === "combined" ? "filtered" : mode === "text" ? "text_only" : "drawings_only";
      const originalName = file?.name?.replace(/\.pdf$/i, "") || "document";
      downloadPdf(pdfBytes, `${originalName}_${suffix}.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  }, [fileBuffer, textTriage.keep, drawingTriage.keep, file]);

  // ─── Lazy thumbnails ───
  const loadThumbnail = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || thumbnailCache.has(pageNumber)) return;
    try {
      const thumb = await renderPageThumbnail(pdfDoc, pageNumber);
      setThumbnailCache((prev) => new Map(prev).set(pageNumber, thumb));
    } catch { /* non-critical */ }
  }, [pdfDoc, thumbnailCache]);

  // ─── Reset ───
  const handleReset = useCallback(() => {
    drawingAbortRef.current?.abort();
    drawingAbortRef.current = null;
    setPhase("upload");
    setFile(null);
    setFileBuffer(null);
    setPdfDoc(null);
    setProgress(null);
    setClassification(null);
    setTextTriage({ keep: [], discard: [] });
    setTextSelected(new Set());
    setDrawingResults([]);
    setDrawingTriage({ keep: [], discard: [] });
    setDrawingSelected(new Set());
    setDrawingsAnalyzed(false);
    setDrawingProgress(null);
    setIsAnalyzingDrawings(false);
    setThumbnailCache(new Map());
    setPreviewPage(null);
    setPreviewImage(null);
  }, []);

  // ─── Derived counts ───
  const textKeepSelected = textTriage.keep.filter((p) => textSelected.has(p.pageIndex)).length;
  const textDiscardSelected = textTriage.discard.filter((p) => textSelected.has(p.pageIndex)).length;
  const drawKeepSelected = drawingTriage.keep.filter((r) => drawingSelected.has(r.pageIndex)).length;
  const drawDiscardSelected = drawingTriage.discard.filter((r) => drawingSelected.has(r.pageIndex)).length;
  const totalKeep = textTriage.keep.length + drawingTriage.keep.length;
  const totalPages = classification?.totalPages ?? 0;

  // ═══════════════════════════════════════════════════════
  // PHASE 0: UPLOAD + CONFIGURE
  // ═══════════════════════════════════════════════════════
  if (phase === "upload") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">PDF Page Triage</h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Drop your RFP PDF here. We&apos;ll filter out the noise and keep only the pages relevant to your scope — ready to use in a new proposal.
            </p>
          </div>

          {/* File Upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
              file ? "border-brand-blue bg-brand-blue/5" : "border-border hover:border-muted-foreground"
            )}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            {file ? (
              <div className="space-y-2">
                <FileText className="w-8 h-8 mx-auto text-brand-blue" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB — Click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop a PDF here or click to browse</p>
              </div>
            )}
          </div>

          {/* Preset Keyword Bank */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Preset Keywords</label>
              <button onClick={toggleAllPresets} className="text-xs text-brand-blue hover:underline">
                {allPresetsEnabled ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {KEYWORD_PRESETS.map((cat) => {
                const isOn = enabledCategories.has(cat.id);
                const isExpanded = expandedPreset === cat.id;
                return (
                  <div key={cat.id}
                    className={cn("rounded-lg border text-xs font-medium transition-all text-left",
                      isOn ? "border-brand-blue bg-brand-blue/5" : "border-border hover:border-muted-foreground",
                      isExpanded && "col-span-2 sm:col-span-4"
                    )}>
                    <div className="flex items-center gap-1.5 px-3 py-2">
                      <button onClick={(e) => { e.stopPropagation(); togglePresetCategory(cat.id); }}
                        className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                          isOn ? "bg-brand-blue border-brand-blue" : "border-muted-foreground hover:border-foreground")}>
                        {isOn && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </button>
                      <button onClick={() => setExpandedPreset(isExpanded ? null : cat.id)}
                        className="flex-1 flex items-center justify-between min-w-0">
                        <span className={cn("truncate", isOn ? "text-brand-blue" : "text-muted-foreground")}>{cat.label}</span>
                        <span className="flex items-center gap-1 shrink-0 ml-1">
                          <span className="text-[10px] text-muted-foreground">{cat.keywords.length}</span>
                          <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                        </span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-2.5 pt-0.5 border-t border-border/50">
                        <div className="flex flex-wrap gap-1">
                          {cat.keywords.map((kw) => (
                            <span key={kw} className={cn("inline-block px-1.5 py-0.5 rounded text-[10px]",
                              isOn ? "bg-brand-blue/10 text-brand-blue" : "bg-muted text-muted-foreground")}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Keywords */}
          <div className="space-y-2">
            <button onClick={() => setShowCustom(!showCustom)}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-blue transition-colors">
              <ChevronDown className={cn("w-4 h-4 transition-transform", showCustom && "rotate-180")} />
              Add Custom Keywords
              {customKeywords.length > 0 && <span className="text-xs text-muted-foreground ml-1">({customKeywords.length} added)</span>}
            </button>
            {showCustom && (
              <div className="space-y-2 pl-5">
                <div className="flex gap-2">
                  <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomKw(); } }}
                    placeholder="Venue name, product model, contractor... (comma-separated)"
                    className="flex-1 h-9 px-3 border-b border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-blue focus:outline-none transition-colors" />
                  <Button variant="outline" size="sm" onClick={addCustomKw} disabled={!customInput.trim()}>Add</Button>
                </div>
                {customKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-foreground text-background text-xs font-medium">
                        {kw}
                        <button onClick={() => removeCustomKw(kw)} className="hover:opacity-70 transition-opacity"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <Button className="w-full" disabled={!file || allKeywords.length === 0 || isAnalyzing} onClick={handleAnalyze}>
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress ? (progress.phase === "loading" ? "Loading PDF..." : `Extracting text... ${progress.current} / ${progress.total} pages`) : "Analyzing..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Analyze{file ? ` ${file.name}` : " PDF"} · {allKeywords.length} keywords
              </span>
            )}
          </Button>

          {isAnalyzing && progress && progress.total > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-brand-blue transition-all duration-200 rounded-full"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progress.phase === "extracting" ? `Extracting page ${progress.current} of ${progress.total}...` : "Loading PDF..."}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // TRIAGE VIEW (Tabbed)
  // ═══════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 shrink-0 border-b border-border bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{file?.name}</span>
            {" · "}{totalPages} pages · {classification?.textPages.length ?? 0} text · {drawingPageCount} drawings
          </div>
        </div>

        <div className="flex items-center gap-3">
          {classification?.isLikelyScanned && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Image-based PDF — results may be unreliable
            </div>
          )}
        </div>
      </header>

      {/* Tab Bar */}
      <div className="h-10 shrink-0 border-b border-border flex items-center px-4 gap-1 bg-background">
        <TabButton active={activeTab === "text"} onClick={() => setActiveTab("text")}
          icon={<Pencil className="w-3.5 h-3.5" />}
          label={`Text Pages (${classification?.textPages.length ?? 0})`}
          badge={textTriage.keep.length > 0 ? `${textTriage.keep.length} kept` : undefined} />
        <TabButton active={activeTab === "drawings"} onClick={() => setActiveTab("drawings")}
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          label={`Drawings (${drawingPageCount})`}
          badge={drawingsAnalyzed ? `${drawingTriage.keep.length} kept` : undefined}
          dot={drawingPageCount > 0 && !drawingsAnalyzed} />
        <TabButton active={activeTab === "export"} onClick={() => setActiveTab("export")}
          icon={<Package className="w-3.5 h-3.5" />}
          label="Export"
          badge={totalKeep > 0 ? `${totalKeep} pages` : undefined} />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "text" && (
          <TextTriageView
            triage={textTriage}
            threshold={textThreshold}
            onThresholdChange={handleTextThresholdChange}
            selected={textSelected}
            keepSelected={textKeepSelected}
            discardSelected={textDiscardSelected}
            onPageClick={handleTextPageClick}
            onMoveToKeep={moveTextToKeep}
            onMoveToDiscard={moveTextToDiscard}
            onPreview={openPreview}
            thumbnailCache={thumbnailCache}
            onLoadThumbnail={loadThumbnail}
            onDragMove={handleTextDragMove}
          />
        )}
        {activeTab === "drawings" && (
          <DrawingTriageView
            drawingPages={classification?.drawingPages ?? []}
            drawingCategories={drawingCategories}
            onToggleCategory={(id) => {
              setDrawingCategories((prev) => {
                const n = new Set(prev);
                if (n.has(id)) n.delete(id); else n.add(id);
                return n;
              });
            }}
            customInstructions={drawingCustomInstructions}
            onCustomInstructionsChange={setDrawingCustomInstructions}
            isAnalyzing={isAnalyzingDrawings}
            progress={drawingProgress}
            analyzed={drawingsAnalyzed}
            triage={drawingTriage}
            selected={drawingSelected}
            keepSelected={drawKeepSelected}
            discardSelected={drawDiscardSelected}
            costEstimate={costEstimate}
            onAnalyze={handleAnalyzeDrawings}
            onPageClick={handleDrawingClick}
            onMoveToKeep={moveDrawingsToKeep}
            onMoveToDiscard={moveDrawingsToDiscard}
            onPreview={openPreview}
            thumbnailCache={thumbnailCache}
            onLoadThumbnail={loadThumbnail}
            onDragMove={handleDrawingDragMove}
          />
        )}
        {activeTab === "export" && (
          <ExportView
            textKeepCount={textTriage.keep.length}
            textTotalCount={classification?.textPages.length ?? 0}
            drawingKeepCount={drawingTriage.keep.length}
            drawingTotalCount={drawingPageCount}
            totalPages={totalPages}
            drawingsAnalyzed={drawingsAnalyzed}
            isExporting={isExporting}
            onExport={handleExport}
            textKeepPages={textTriage.keep}
            drawingKeepResults={drawingTriage.keep}
          />
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={previewPage !== null} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Page {previewPage}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto flex items-start justify-center bg-muted/30 rounded p-4">
            {isLoadingPreview ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-20">
                <Loader2 className="w-4 h-4 animate-spin" /> Rendering page...
              </div>
            ) : previewImage ? (
              <img src={previewImage} alt={`Page ${previewPage}`} className="max-w-full h-auto border border-border" />
            ) : (
              <p className="text-sm text-muted-foreground py-20">Failed to render page.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════
function TabButton({ active, onClick, icon, label, badge, dot }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
  badge?: string; dot?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn("h-full px-3 flex items-center gap-1.5 text-xs font-medium border-b-2 transition-colors relative",
        active ? "border-brand-blue text-brand-blue" : "border-transparent text-muted-foreground hover:text-foreground"
      )}>
      {icon} {label}
      {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-1">{badge}</span>}
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-2 right-1" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════
// TEXT TRIAGE VIEW
// ═══════════════════════════════════════════════════════
function TextTriageView({ triage, threshold, onThresholdChange, selected, keepSelected, discardSelected,
  onPageClick, onMoveToKeep, onMoveToDiscard, onPreview, thumbnailCache, onLoadThumbnail,
  onDragMove }: {
  triage: TriageState; threshold: number; onThresholdChange: (v: number) => void;
  selected: Set<number>; keepSelected: number; discardSelected: number;
  onPageClick: (idx: number, col: "keep" | "discard", e: React.MouseEvent) => void;
  onMoveToKeep: () => void; onMoveToDiscard: () => void; onPreview: (pn: number) => void;
  thumbnailCache: Map<number, string>; onLoadThumbnail: (pn: number) => void;
  onDragMove: (pageIndex: number, from: "keep" | "discard", to: "keep" | "discard") => void;
}) {
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as number;
    setActiveDragId(id);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const pageIndex = active.id as number;
    const targetColumn = over.id as "keep" | "discard";
    const isInKeep = triage.keep.some((p) => p.pageIndex === pageIndex);
    const sourceColumn = isInKeep ? "keep" : "discard";
    if (sourceColumn !== targetColumn) {
      onDragMove(pageIndex, sourceColumn, targetColumn);
    }
  }, [triage, onDragMove]);

  const activePage = activeDragId !== null
    ? (triage.keep.find((p) => p.pageIndex === activeDragId) || triage.discard.find((p) => p.pageIndex === activeDragId))
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        {/* Threshold bar */}
        <div className="h-9 shrink-0 border-b border-border flex items-center justify-between px-4">
          <span className="text-xs text-muted-foreground">
            Keeping <span className="font-medium text-foreground">{triage.keep.length}</span> of {triage.keep.length + triage.discard.length} text pages
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Threshold</span>
            <input type="range" min={0} max={0.5} step={0.005} value={threshold}
              onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
              className="w-24 h-1 accent-brand-blue" />
            <span className="w-8 text-right font-mono">{threshold.toFixed(3)}</span>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* KEEP */}
          <DroppableColumn id="keep">
            <div className="flex-1 flex flex-col border-r border-border">
              <div className="h-10 shrink-0 border-b border-border flex items-center justify-between px-4 bg-emerald-50/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Keep · {triage.keep.length}</span>
                {keepSelected > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onMoveToDiscard}>
                    <ArrowRight className="w-3 h-3" /> Discard {keepSelected}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {triage.keep.map((page) => (
                    <DraggableKeepCard key={page.pageIndex} page={page} isSelected={selected.has(page.pageIndex)}
                      thumbnail={thumbnailCache.get(page.pageNumber)}
                      onSelect={(e) => onPageClick(page.pageIndex, "keep", e)}
                      onPreview={() => onPreview(page.pageNumber)}
                      onLoadThumbnail={() => onLoadThumbnail(page.pageNumber)} />
                  ))}
                </div>
                {triage.keep.length === 0 && (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No pages above threshold. Adjust the slider or move pages from Discard.
                  </div>
                )}
              </div>
            </div>
          </DroppableColumn>

          {/* DISCARD */}
          <DroppableColumn id="discard">
            <div className="w-[380px] xl:w-[440px] flex flex-col shrink-0">
              <div className="h-10 shrink-0 border-b border-border flex items-center justify-between px-4 bg-red-50/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Discard · {triage.discard.length}</span>
                {discardSelected > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onMoveToKeep}>
                    <ArrowLeft className="w-3 h-3" /> Keep {discardSelected}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {triage.discard.map((page) => (
                  <DraggableDiscardRow key={page.pageIndex} page={page} isSelected={selected.has(page.pageIndex)}
                    onSelect={(e) => onPageClick(page.pageIndex, "discard", e)}
                    onPreview={() => onPreview(page.pageNumber)} />
                ))}
                {triage.discard.length === 0 && (
                  <div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">All pages matched your keywords.</div>
                )}
              </div>
            </div>
          </DroppableColumn>
        </div>
      </div>

      <DragOverlay>
        {activePage && (
          <div className="bg-background border border-brand-blue rounded-lg shadow-lg px-3 py-2 text-xs font-medium text-foreground opacity-90">
            Page {activePage.pageNumber} — {activePage.score.toFixed(3)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ═══════════════════════════════════════════════════════
// DRAWING TRIAGE VIEW
// ═══════════════════════════════════════════════════════
function DrawingTriageView({ drawingPages, drawingCategories, onToggleCategory, customInstructions,
  onCustomInstructionsChange, isAnalyzing, progress, analyzed, triage, selected, keepSelected,
  discardSelected, costEstimate, onAnalyze, onPageClick, onMoveToKeep, onMoveToDiscard,
  onPreview, thumbnailCache, onLoadThumbnail, onDragMove }: {
  drawingPages: PageScore[]; drawingCategories: Set<string>;
  onToggleCategory: (id: string) => void; customInstructions: string;
  onCustomInstructionsChange: (v: string) => void; isAnalyzing: boolean;
  progress: VisionProgress | null; analyzed: boolean; triage: DrawingTriageState;
  selected: Set<number>; keepSelected: number; discardSelected: number;
  costEstimate: { perImage: number; total: number; modelName: string };
  onAnalyze: () => void; onPageClick: (idx: number, e: React.MouseEvent) => void;
  onMoveToKeep: () => void; onMoveToDiscard: () => void;
  onPreview: (pn: number) => void; thumbnailCache: Map<number, string>;
  onLoadThumbnail: (pn: number) => void;
  onDragMove: (pageIndex: number, from: "keep" | "discard", to: "keep" | "discard") => void;
}) {
  if (drawingPages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No drawing pages detected in this PDF.
      </div>
    );
  }

  // Pre-analysis or analyzing state
  if (!analyzed) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{drawingPages.length} drawing pages detected</h2>
            <p className="text-sm text-muted-foreground">
              Vision analysis will send page thumbnails to an AI model to identify relevant drawings
              (electrical plans, structural details, signage locations, etc.)
            </p>
            <p className="text-xs text-muted-foreground">
              Estimated cost: <span className="font-medium text-foreground">${costEstimate.total.toFixed(2)}</span>
              {" "}({drawingPages.length} images × ${costEstimate.perImage.toFixed(4)} per image · {costEstimate.modelName})
            </p>
          </div>

          {/* Drawing category toggles */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Drawing Categories to Find</label>
            <div className="space-y-1.5">
              {DRAWING_CATEGORIES.map((cat) => {
                const isOn = drawingCategories.has(cat.id);
                return (
                  <button key={cat.id} onClick={() => onToggleCategory(cat.id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm text-left transition-all",
                      isOn ? "border-brand-blue bg-brand-blue/10" : "border-border bg-muted/30 hover:border-muted-foreground"
                    )}>
                    <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      isOn ? "bg-brand-blue border-brand-blue" : "border-muted-foreground/50 bg-background")}>
                      {isOn && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    <span className={cn("font-medium", isOn ? "text-brand-blue" : "text-muted-foreground")}>{cat.label}</span>
                    {isOn && <span className="ml-auto text-[10px] font-medium text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded">ON</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Custom Instructions (optional)</label>
            <textarea value={customInstructions} onChange={(e) => onCustomInstructionsChange(e.target.value)}
              placeholder='e.g. "Also look for any reference to the north endzone"'
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-blue focus:outline-none resize-none" />
          </div>

          {/* Analyze button */}
          <Button className="w-full" disabled={isAnalyzing} onClick={onAnalyze}>
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing drawings... {progress ? `${progress.completed} / ${progress.total}` : ""}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Analyze Drawings — ~${costEstimate.total.toFixed(2)}
              </span>
            )}
          </Button>

          {/* Progress */}
          {isAnalyzing && progress && progress.total > 0 && (
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-brand-blue transition-all duration-200 rounded-full"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
              </div>
              {progress.results.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Found so far:</p>
                  {Object.entries(
                    progress.results.reduce((acc, r) => {
                      const label = r.categoryLabel || r.category;
                      acc[label] = (acc[label] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([label, count]) => (
                    <p key={label} className="text-xs text-muted-foreground">• {count} {label}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Post-analysis: KEEP / DISCARD columns with DnD
  return <DrawingTriageColumns triage={triage} drawingPages={drawingPages}
    selected={selected} keepSelected={keepSelected} discardSelected={discardSelected}
    onPageClick={onPageClick} onMoveToKeep={onMoveToKeep} onMoveToDiscard={onMoveToDiscard}
    onPreview={onPreview} thumbnailCache={thumbnailCache} onLoadThumbnail={onLoadThumbnail}
    onDragMove={onDragMove} />;
}

function DrawingTriageColumns({ triage, drawingPages, selected, keepSelected, discardSelected,
  onPageClick, onMoveToKeep, onMoveToDiscard, onPreview, thumbnailCache, onLoadThumbnail, onDragMove }: {
  triage: DrawingTriageState; drawingPages: PageScore[];
  selected: Set<number>; keepSelected: number; discardSelected: number;
  onPageClick: (idx: number, e: React.MouseEvent) => void;
  onMoveToKeep: () => void; onMoveToDiscard: () => void;
  onPreview: (pn: number) => void; thumbnailCache: Map<number, string>;
  onLoadThumbnail: (pn: number) => void;
  onDragMove: (pageIndex: number, from: "keep" | "discard", to: "keep" | "discard") => void;
}) {
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const pageIndex = active.id as number;
    const targetColumn = over.id as "keep" | "discard";
    const isInKeep = triage.keep.some((r) => r.pageIndex === pageIndex);
    const sourceColumn = isInKeep ? "keep" : "discard";
    if (sourceColumn !== targetColumn) {
      onDragMove(pageIndex, sourceColumn, targetColumn);
    }
  }, [triage, onDragMove]);

  const activeResult = activeDragId !== null
    ? (triage.keep.find((r) => r.pageIndex === activeDragId) || triage.discard.find((r) => r.pageIndex === activeDragId))
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        <div className="h-9 shrink-0 border-b border-border flex items-center justify-between px-4">
          <span className="text-xs text-muted-foreground">
            Keeping <span className="font-medium text-foreground">{triage.keep.length}</span> of {drawingPages.length} drawings
          </span>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* KEEP */}
          <DroppableColumn id="keep">
            <div className="flex-1 flex flex-col border-r border-border">
              <div className="h-10 shrink-0 border-b border-border flex items-center justify-between px-4 bg-emerald-50/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Keep · {triage.keep.length}</span>
                {keepSelected > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onMoveToDiscard}>
                    <ArrowRight className="w-3 h-3" /> Discard {keepSelected}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {triage.keep.map((result) => (
                    <DraggableDrawingKeepCard key={result.pageIndex} result={result}
                      isSelected={selected.has(result.pageIndex)}
                      thumbnail={thumbnailCache.get(result.pageNumber)}
                      onSelect={(e) => onPageClick(result.pageIndex, e)}
                      onPreview={() => onPreview(result.pageNumber)}
                      onLoadThumbnail={() => onLoadThumbnail(result.pageNumber)} />
                  ))}
                </div>
                {triage.keep.length === 0 && (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No relevant drawings found.</div>
                )}
              </div>
            </div>
          </DroppableColumn>

          {/* DISCARD */}
          <DroppableColumn id="discard">
            <div className="w-[380px] xl:w-[440px] flex flex-col shrink-0">
              <div className="h-10 shrink-0 border-b border-border flex items-center justify-between px-4 bg-red-50/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Discard · {triage.discard.length}</span>
                {discardSelected > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onMoveToKeep}>
                    <ArrowLeft className="w-3 h-3" /> Keep {discardSelected}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {triage.discard.map((result) => (
                  <DraggableDrawingDiscardRow key={result.pageIndex} result={result}
                    isSelected={selected.has(result.pageIndex)}
                    onSelect={(e) => onPageClick(result.pageIndex, e)}
                    onPreview={() => onPreview(result.pageNumber)} />
                ))}
                {triage.discard.length === 0 && (
                  <div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">All drawings matched.</div>
                )}
              </div>
            </div>
          </DroppableColumn>
        </div>
      </div>

      <DragOverlay>
        {activeResult && (
          <div className="bg-background border border-brand-blue rounded-lg shadow-lg px-3 py-2 text-xs font-medium text-foreground opacity-90">
            Page {activeResult.pageNumber} — {activeResult.confidence}% — {activeResult.categoryLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ═══════════════════════════════════════════════════════
// EXPORT VIEW
// ═══════════════════════════════════════════════════════
function ExportView({ textKeepCount, textTotalCount, drawingKeepCount, drawingTotalCount,
  totalPages, drawingsAnalyzed, isExporting, onExport, textKeepPages, drawingKeepResults }: {
  textKeepCount: number; textTotalCount: number; drawingKeepCount: number;
  drawingTotalCount: number; totalPages: number; drawingsAnalyzed: boolean;
  isExporting: boolean; onExport: (mode: "combined" | "text" | "drawings") => void;
  textKeepPages: PageScore[]; drawingKeepResults: DrawingAnalysisResult[];
}) {
  const totalKeep = textKeepCount + drawingKeepCount;
  const reduction = totalPages > 0 ? ((1 - totalKeep / totalPages) * 100).toFixed(1) : "0";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Export Summary</h2>

        <div className="border border-border rounded-lg p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Text pages keeping:</span>
            <span className="font-medium text-foreground">{textKeepCount} of {textTotalCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Drawings keeping:</span>
            <span className="font-medium text-foreground">
              {drawingsAnalyzed ? `${drawingKeepCount} of ${drawingTotalCount}` : `— of ${drawingTotalCount} (not analyzed)`}
            </span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between text-sm">
            <span className="font-medium text-foreground">Total export:</span>
            <span className="font-semibold text-foreground">{totalKeep} of {totalPages} pages</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Size reduction:</span>
            <span className="font-medium text-emerald-600">~{reduction}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Page order:</span>
            <span className="text-foreground">Original PDF order</span>
          </div>
        </div>

        {/* What's Next — workflow bridge */}
        <div className="border border-brand-blue/20 bg-brand-blue/5 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-blue" />
            What&apos;s Next?
          </h3>
          <p className="text-xs text-muted-foreground">
            Your filtered PDF is ready. Download it below, then use it to start a new proposal.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={totalKeep === 0 || isExporting} onClick={() => onExport("combined")}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Download Filtered PDF — {totalKeep} pages
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="sm" disabled={textKeepCount === 0 || isExporting}
                onClick={() => onExport("text")}>
                Text only ({textKeepCount})
              </Button>
              <Button variant="outline" className="flex-1" size="sm"
                disabled={drawingKeepCount === 0 || isExporting || !drawingsAnalyzed}
                onClick={() => onExport("drawings")}>
                Drawings only ({drawingKeepCount})
              </Button>
            </div>
          </div>
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <Link href="/projects/new">
              <Button variant="outline" className="w-full gap-2">
                <FolderOpen className="w-4 h-4" />
                Create Proposal from This
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </Button>
            </Link>
            <p className="text-[10px] text-muted-foreground text-center">
              Opens a new project. Upload your filtered PDF there as the RFP reference document.
            </p>
          </div>
        </div>

        {/* Page manifest */}
        {totalKeep > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Page Manifest</h3>
            <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              {[...textKeepPages.map((p) => ({ pageNumber: p.pageNumber, pageIndex: p.pageIndex, type: "Text" as const, detail: `${p.score.toFixed(3)} — ${p.textSnippet}` })),
                ...drawingKeepResults.map((r) => ({ pageNumber: r.pageNumber, pageIndex: r.pageIndex, type: "Drawing" as const, detail: `${r.confidence}% — ${r.categoryLabel}: ${r.description}` })),
              ].sort((a, b) => a.pageIndex - b.pageIndex).map((item) => (
                <div key={`${item.type}-${item.pageIndex}`} className="flex items-center gap-3 px-3 py-1.5 border-b border-border last:border-0 text-xs">
                  <span className="w-10 font-medium text-foreground">P{item.pageNumber}</span>
                  <span className={cn("w-14 shrink-0 font-medium",
                    item.type === "Text" ? "text-brand-blue" : "text-amber-600")}>{item.type}</span>
                  <span className="flex-1 text-muted-foreground truncate">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DND PRIMITIVES
// ═══════════════════════════════════════════════════════

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("flex-1 flex flex-col transition-colors relative",
      isOver && "ring-2 ring-inset ring-brand-blue/30")}>
      {children}
    </div>
  );
}

function DraggableWrapper({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }} className="relative group/drag">
      <div {...listeners}
        className="absolute top-1 left-1 z-10 p-0.5 rounded cursor-grab opacity-0 group-hover/drag:opacity-60 hover:!opacity-100 transition-opacity bg-background/80">
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CONFIDENCE ZONE HELPER
// ═══════════════════════════════════════════════════════

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 70) {
    return <span className="text-[10px] font-mono text-emerald-600">{confidence}%</span>;
  }
  if (confidence >= 30) {
    return (
      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200" title="Review zone (30-70% confidence)">
        {confidence}% ⚠
      </span>
    );
  }
  return <span className="text-[10px] font-mono text-red-400">{confidence}%</span>;
}

// ═══════════════════════════════════════════════════════
// SHARED CARD COMPONENTS (with drag wrappers)
// ═══════════════════════════════════════════════════════

function KeepCardInner({ page, isSelected, thumbnail, onSelect, onPreview, onLoadThumbnail }: {
  page: PageScore; isSelected: boolean; thumbnail?: string;
  onSelect: (e: React.MouseEvent) => void; onPreview: () => void; onLoadThumbnail: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (thumbnail) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { onLoadThumbnail(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [thumbnail, onLoadThumbnail]);

  return (
    <div ref={cardRef} onClick={onSelect}
      className={cn("rounded-lg border cursor-pointer transition-all group relative",
        isSelected ? "border-brand-blue ring-1 ring-brand-blue/30 bg-brand-blue/5" : "border-border hover:border-muted-foreground")}>
      <div className="aspect-[3/4] bg-muted/30 rounded-t-lg overflow-hidden relative">
        {thumbnail ? <img src={thumbnail} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
        <button onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="absolute top-1.5 right-1.5 p-1 rounded bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="w-3 h-3" />
        </button>
      </div>
      <div className="p-2 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Page {page.pageNumber}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{page.score.toFixed(3)}</span>
        </div>
        {page.keywordHits > 0 && (
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
            {page.keywordHits} hit{page.keywordHits !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableKeepCard(props: {
  page: PageScore; isSelected: boolean; thumbnail?: string;
  onSelect: (e: React.MouseEvent) => void; onPreview: () => void; onLoadThumbnail: () => void;
}) {
  return (
    <DraggableWrapper id={props.page.pageIndex}>
      <KeepCardInner {...props} />
    </DraggableWrapper>
  );
}

function DrawingKeepCardInner({ result, isSelected, thumbnail, onSelect, onPreview, onLoadThumbnail }: {
  result: DrawingAnalysisResult; isSelected: boolean; thumbnail?: string;
  onSelect: (e: React.MouseEvent) => void; onPreview: () => void; onLoadThumbnail: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (thumbnail) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { onLoadThumbnail(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [thumbnail, onLoadThumbnail]);

  const isReviewZone = result.confidence >= 30 && result.confidence < 70;

  return (
    <div ref={cardRef} onClick={onSelect}
      className={cn("rounded-lg border cursor-pointer transition-all group relative",
        isSelected ? "border-brand-blue ring-1 ring-brand-blue/30 bg-brand-blue/5"
          : isReviewZone ? "border-amber-300 bg-amber-50/30"
          : "border-border hover:border-muted-foreground")}>
      {isReviewZone && (
        <div className="absolute top-0 left-0 right-0 bg-amber-100 text-amber-700 text-[9px] font-semibold text-center py-0.5 rounded-t-lg z-10">
          NEEDS REVIEW
        </div>
      )}
      <div className={cn("aspect-[3/4] bg-muted/30 rounded-t-lg overflow-hidden relative", isReviewZone && "mt-4")}>
        {thumbnail ? <img src={thumbnail} alt={`Page ${result.pageNumber}`} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
        <button onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="absolute top-1.5 right-1.5 p-1 rounded bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="w-3 h-3" />
        </button>
      </div>
      <div className="p-2 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Page {result.pageNumber}</span>
          <ConfidenceBadge confidence={result.confidence} />
        </div>
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium truncate max-w-full">
          {result.categoryLabel}
        </span>
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{result.description}</p>
      </div>
    </div>
  );
}

function DraggableDrawingKeepCard(props: {
  result: DrawingAnalysisResult; isSelected: boolean; thumbnail?: string;
  onSelect: (e: React.MouseEvent) => void; onPreview: () => void; onLoadThumbnail: () => void;
}) {
  return (
    <DraggableWrapper id={props.result.pageIndex}>
      <DrawingKeepCardInner {...props} />
    </DraggableWrapper>
  );
}

function DiscardRowInner({ page, isSelected, onSelect, onPreview }: {
  page: PageScore; isSelected: boolean; onSelect: (e: React.MouseEvent) => void; onPreview: () => void;
}) {
  return (
    <div onClick={onSelect}
      className={cn("group flex items-center gap-3 px-4 py-2 border-b border-border cursor-pointer transition-colors text-sm",
        isSelected ? "bg-brand-blue/5" : "hover:bg-accent")}>
      <input type="checkbox" checked={isSelected} readOnly className="h-3.5 w-3.5 shrink-0 rounded border border-primary shadow accent-brand-blue" />
      <span className="w-14 shrink-0 font-medium text-foreground text-xs">Pg {page.pageNumber}</span>
      <span className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground">{page.score.toFixed(3)}</span>
      <span className="flex-1 text-xs text-muted-foreground truncate">{page.textSnippet}</span>
      <button onClick={(e) => { e.stopPropagation(); onPreview(); }}
        className="p-1 rounded hover:bg-accent transition-colors shrink-0 opacity-0 group-hover:opacity-100">
        <Eye className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}

function DraggableDiscardRow(props: {
  page: PageScore; isSelected: boolean; onSelect: (e: React.MouseEvent) => void; onPreview: () => void;
}) {
  return (
    <DraggableWrapper id={props.page.pageIndex}>
      <DiscardRowInner {...props} />
    </DraggableWrapper>
  );
}

function DrawingDiscardRowInner({ result, isSelected, onSelect, onPreview }: {
  result: DrawingAnalysisResult; isSelected: boolean; onSelect: (e: React.MouseEvent) => void; onPreview: () => void;
}) {
  const isReviewZone = result.confidence >= 30 && result.confidence < 70;
  return (
    <div onClick={onSelect}
      className={cn("group flex items-center gap-3 px-4 py-2 border-b border-border cursor-pointer transition-colors text-sm",
        isSelected ? "bg-brand-blue/5" : isReviewZone ? "bg-amber-50/50" : "hover:bg-accent")}>
      <input type="checkbox" checked={isSelected} readOnly className="h-3.5 w-3.5 shrink-0 rounded border border-primary shadow accent-brand-blue" />
      <span className="w-14 shrink-0 font-medium text-foreground text-xs">Pg {result.pageNumber}</span>
      <ConfidenceBadge confidence={result.confidence} />
      <span className="w-20 shrink-0 text-[10px] text-amber-600 font-medium truncate">{result.categoryLabel}</span>
      <span className="flex-1 text-xs text-muted-foreground truncate">{result.description}</span>
      <button onClick={(e) => { e.stopPropagation(); onPreview(); }}
        className="p-1 rounded hover:bg-accent transition-colors shrink-0 opacity-0 group-hover:opacity-100">
        <Eye className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}

function DraggableDrawingDiscardRow(props: {
  result: DrawingAnalysisResult; isSelected: boolean; onSelect: (e: React.MouseEvent) => void; onPreview: () => void;
}) {
  return (
    <DraggableWrapper id={props.result.pageIndex}>
      <DrawingDiscardRowInner {...props} />
    </DraggableWrapper>
  );
}
