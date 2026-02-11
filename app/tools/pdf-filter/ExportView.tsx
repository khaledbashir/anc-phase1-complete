"use client";

import React from "react";
import {
  Download, AlertTriangle, Loader2, CheckCircle2, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageScore } from "./lib/scoring";
import type { DrawingAnalysisResult } from "./lib/pdf-vision";
import type { ExtractedMeta } from "./lib/meta-extraction";

// ═══════════════════════════════════════════════════════
// EXPORT VIEW — confirmation card, download, page manifest
// ═══════════════════════════════════════════════════════

interface ExportViewProps {
  textKeepCount: number;
  textTotalCount: number;
  drawingKeepCount: number;
  drawingTotalCount: number;
  totalPages: number;
  drawingsAnalyzed: boolean;
  isExporting: boolean;
  onExport: (mode: "combined" | "text" | "drawings") => void;
  textKeepPages: PageScore[];
  drawingKeepResults: DrawingAnalysisResult[];
  extractedMeta: ExtractedMeta;
  onMetaChange: (meta: ExtractedMeta) => void;
  onCreateProposal: (meta: ExtractedMeta) => void;
  isCreatingProposal: boolean;
  proposalError: string | null;
}

export function ExportView({
  textKeepCount, textTotalCount, drawingKeepCount, drawingTotalCount,
  totalPages, drawingsAnalyzed, isExporting, onExport, textKeepPages, drawingKeepResults,
  extractedMeta, onMetaChange, onCreateProposal, isCreatingProposal, proposalError,
}: ExportViewProps) {
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
        </div>

        {/* ── Create Proposal — confirmation card ── */}
        <div className="border border-brand-blue/20 bg-brand-blue/5 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Rocket className="w-4 h-4 text-brand-blue" />
            Create Proposal &amp; Embed
          </h3>
          <p className="text-xs text-muted-foreground">
            This will create a new project, embed the filtered text into the AI workspace, and take you straight to the drafting table.
            {drawingKeepCount > 0 && ` ${drawingKeepCount} drawing descriptions will be embedded as searchable context.`}
          </p>

          {/* Inline editable meta fields */}
          <div className="space-y-2">
            <MetaField label="Client Name" value={extractedMeta.clientName} placeholder="e.g. Indiana Pacers"
              onChange={(v) => onMetaChange({ ...extractedMeta, clientName: v })} />
            <MetaField label="Venue" value={extractedMeta.venue} placeholder="e.g. Gainbridge Fieldhouse"
              onChange={(v) => onMetaChange({ ...extractedMeta, venue: v })} />
            <MetaField label="Project Title" value={extractedMeta.projectTitle} placeholder="e.g. 2026 LED Display Refresh"
              onChange={(v) => onMetaChange({ ...extractedMeta, projectTitle: v })} />
          </div>

          {extractedMeta.confidence > 0 && extractedMeta.confidence < 0.6 && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Low confidence extraction — please verify the fields above
            </p>
          )}

          {proposalError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {proposalError}
            </div>
          )}

          <Button
            className="w-full gap-2"
            disabled={totalKeep === 0 || isCreatingProposal || !extractedMeta.clientName.trim()}
            onClick={() => onCreateProposal(extractedMeta)}
          >
            {isCreatingProposal ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating project...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Create Proposal &amp; Embed — {totalKeep} pages</>
            )}
          </Button>

          {!extractedMeta.clientName.trim() && (
            <p className="text-[10px] text-muted-foreground text-center">
              Enter at least a client name to continue
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            This will create a new project. Embedding and AI extraction run in the background.
          </p>
        </div>

        {/* ── Download section ── */}
        <div className="border border-border rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            Download PDF
          </h3>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" disabled={totalKeep === 0 || isExporting} onClick={() => onExport("combined")}>
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
// META FIELD (inline editable input for confirmation card)
// ═══════════════════════════════════════════════════════
function MetaField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-muted-foreground w-24 shrink-0 text-right">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm text-foreground bg-transparent border-b border-border focus:border-brand-blue focus:outline-none py-1 px-0 placeholder:text-muted-foreground/50 transition-colors"
      />
    </div>
  );
}
