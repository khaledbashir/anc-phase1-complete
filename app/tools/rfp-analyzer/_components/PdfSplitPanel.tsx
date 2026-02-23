"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { FileText, X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PdfSplitPanelProps {
  /** Blob URL or HTTPS URL to the PDF */
  pdfUrl: string | null;
  /** Currently highlighted page (1-based) — from source page click */
  activePage?: number | null;
  /** Callback when user closes the panel */
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PdfSplitPanel({ pdfUrl, activePage, onClose }: PdfSplitPanelProps) {
  const pageNavInstance = pageNavigationPlugin();
  const { jumpToPage, CurrentPageLabel } = pageNavInstance;
  const [expanded, setExpanded] = useState(false);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  // Jump to page when activePage changes or viewer becomes ready
  useEffect(() => {
    if (activePage != null && activePage > 0) {
      if (viewerReady) {
        jumpToPage(activePage - 1); // 0-indexed
      } else {
        setPendingPage(activePage);
      }
    }
  }, [activePage, viewerReady, jumpToPage]);

  // Apply pending jump once viewer is ready
  useEffect(() => {
    if (viewerReady && pendingPage != null) {
      jumpToPage(pendingPage - 1);
      setPendingPage(null);
    }
  }, [viewerReady, pendingPage, jumpToPage]);

  const handleDocumentLoad = useCallback(() => {
    setViewerReady(true);
  }, []);

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30">
        <FileText className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">Click a source page to view the PDF</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background border-l border-border ${
      expanded ? "fixed inset-0 z-50" : ""
    }`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span className="font-medium">Source PDF</span>
          {activePage && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Page {activePage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const current = activePage || 1;
              if (current > 1) jumpToPage(current - 2);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground min-w-[3rem] text-center">
            <CurrentPageLabel />
          </span>
          <button
            onClick={() => {
              const current = activePage || 1;
              jumpToPage(current);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Close PDF viewer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
          <Viewer
            fileUrl={pdfUrl}
            plugins={[pageNavInstance]}
            defaultScale={SpecialZoomLevel.PageWidth}
            onDocumentLoad={handleDocumentLoad}
          />
        </Worker>
      </div>
    </div>
  );
}
