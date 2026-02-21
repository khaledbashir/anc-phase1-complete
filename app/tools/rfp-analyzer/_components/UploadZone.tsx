"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  File as FileIcon,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Brain,
  Eye,
  Sparkles,
  Monitor,
  Database,
} from "lucide-react";

export interface PipelineEvent {
  type: "stage" | "progress" | "warning" | "complete" | "error";
  stage?: string;
  message?: string;
  current?: number;
  total?: number;
  totalPages?: number;
  breakdown?: Record<string, number>;
  result?: any;
}

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  isLoading: boolean;
  events: PipelineEvent[];
}

interface StageState {
  key: string;
  label: string;
  icon: typeof UploadCloud;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
  count?: string;
}

export default function UploadZone({ onUpload, isLoading, events }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0);
      intervalRef.current = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLoading]);

  // Build stage states from events
  const stages: StageState[] = buildStages(events);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }, [isLoading]);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const validateAndUpload = (files: File[]) => {
    setError(null);
    const validFiles = files.filter((f) => f.type === "application/pdf");
    if (validFiles.length === 0) { setError("Only PDF files are supported."); return; }
    if (validFiles.some((f) => f.size > 2000 * 1024 * 1024)) { setError("Files must be under 2GB."); return; }
    setFileName(validFiles.length === 1 ? validFiles[0].name : `${validFiles.length} files`);
    onUpload(validFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (isLoading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) validateAndUpload(files);
  }, [isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) validateAndUpload(Array.from(e.target.files));
  };

  const formatTime = (s: number) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };

  // Latest message for display
  const latestMessage = [...events].reverse().find((e) => e.message)?.message || "Starting...";

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          isLoading ? "border-primary/30 bg-primary/5 cursor-not-allowed"
          : isDragging ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        {!isLoading && (
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
        )}
        <div className="flex flex-col items-center justify-center space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center w-full max-w-lg">
              <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
              {fileName && <p className="text-xs text-muted-foreground mb-2 truncate max-w-xs">{fileName}</p>}

              {/* Current action */}
              <p className="text-sm text-primary font-medium mb-4 text-center">{latestMessage}</p>

              {/* Elapsed time */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-5">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedSeconds)}
              </div>

              {/* Pipeline stages */}
              <div className="flex flex-col gap-1.5 w-full">
                {stages.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                        stage.status === "active" ? "bg-primary/10 text-primary font-medium"
                        : stage.status === "done" ? "text-foreground/70"
                        : stage.status === "error" ? "text-destructive/70"
                        : "text-muted-foreground/30"
                      }`}
                    >
                      {stage.status === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : stage.status === "active" ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      ) : stage.status === "error" ? (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <Icon className="w-4 h-4 shrink-0" />
                      )}
                      <span className="flex-1">{stage.label}</span>
                      {stage.count && (
                        <span className={`text-xs font-mono ${stage.status === "done" ? "text-emerald-500" : "text-primary"}`}>
                          {stage.count}
                        </span>
                      )}
                      {stage.detail && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{stage.detail}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">Upload RFP Documents</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Drop one or more PDFs. We&apos;ll OCR every page, classify content, and extract LED specs.
                </p>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="bg-muted px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <FileIcon className="w-3 h-3" /> PDF up to 2GB
                </span>
                <span className="bg-muted px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Brain className="w-3 h-3" /> Multi-file support
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build stages from SSE events
// ---------------------------------------------------------------------------

function buildStages(events: PipelineEvent[]): StageState[] {
  const stages: StageState[] = [
    { key: "uploaded", label: "Upload received", icon: UploadCloud, status: "pending" },
    { key: "kreuzberg", label: "OCR text extraction (Kreuzberg)", icon: Database, status: "pending" },
    { key: "mistral", label: "Structured extraction (Mistral OCR)", icon: Eye, status: "pending" },
    { key: "classifying", label: "Page classification", icon: Brain, status: "pending" },
    { key: "extracting", label: "LED spec extraction (AI)", icon: Monitor, status: "pending" },
  ];

  let currentActive: string | null = null;

  for (const event of events) {
    if (event.type === "stage") {
      const stageKey = event.stage || "";

      // Mark completed stages
      if (stageKey === "kreuzberg") {
        markDone(stages, "uploaded");
        currentActive = "kreuzberg";
      } else if (stageKey === "kreuzberg_done") {
        markDone(stages, "kreuzberg");
        // Add page count
        const s = stages.find((s) => s.key === "kreuzberg");
        if (s && event.totalPages) s.count = `${event.totalPages} pages`;
      } else if (stageKey === "mistral") {
        markDone(stages, "kreuzberg");
        currentActive = "mistral";
      } else if (stageKey === "mistral_done") {
        markDone(stages, "mistral");
      } else if (stageKey === "classifying") {
        markDone(stages, "mistral");
        currentActive = "classifying";
      } else if (stageKey === "classified") {
        markDone(stages, "classifying");
        const s = stages.find((s) => s.key === "classifying");
        if (s && event.breakdown) {
          const b = event.breakdown;
          s.count = `${b.led_specs || 0} LED, ${b.drawings || 0} draw`;
        }
      } else if (stageKey === "extracting") {
        markDone(stages, "classifying");
        currentActive = "extracting";
      } else if (stageKey === "uploaded") {
        currentActive = "uploaded";
      }
    }

    if (event.type === "progress") {
      const stageKey = event.stage || "";
      const s = stages.find((s) => s.key === stageKey);
      if (s && event.current != null && event.total != null) {
        s.count = `${event.current}/${event.total}`;
        s.detail = event.message;
      }
    }

    if (event.type === "complete") {
      // Mark all done
      stages.forEach((s) => { s.status = "done"; });
      const s = stages.find((s) => s.key === "extracting");
      if (s && event.result?.screens) s.count = `${event.result.screens.length} displays`;
      return stages;
    }

    if (event.type === "error") {
      if (currentActive) {
        const s = stages.find((s) => s.key === currentActive);
        if (s) { s.status = "error"; s.detail = event.message; }
      }
    }
  }

  // Set active stage
  if (currentActive) {
    const s = stages.find((s) => s.key === currentActive);
    if (s && s.status !== "done" && s.status !== "error") s.status = "active";
  }

  return stages;
}

function markDone(stages: StageState[], key: string) {
  const s = stages.find((s) => s.key === key);
  if (s) s.status = "done";
}
