"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Database, Brain, FileSearch } from "lucide-react";

interface EmbeddingStatus {
  embeddingStatus: string | null;
  aiWorkspaceSlug: string | null;
  source: string | null;
  screenCount: number;
  hasExtractedData: boolean;
  filterStats: {
    totalKeptPages: number;
    textPages: number;
    drawingPages: number;
    filteredAt: string;
  } | null;
}

const STATUS_CONFIG: Record<string, {
  icon: typeof Loader2;
  label: string;
  description: string;
  color: string;
  animate?: boolean;
}> = {
  pending: {
    icon: Database,
    label: "Queued",
    description: "Preparing to embed filtered pages into AI workspace...",
    color: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    animate: true,
  },
  embedding: {
    icon: Database,
    label: "Embedding",
    description: "Uploading filtered text to AI workspace for analysis...",
    color: "text-blue-500 border-blue-500/20 bg-blue-500/5",
    animate: true,
  },
  extracting: {
    icon: Brain,
    label: "AI Extracting",
    description: "AI is reading the RFP and extracting screen specs, quantities, and requirements...",
    color: "text-purple-500 border-purple-500/20 bg-purple-500/5",
    animate: true,
  },
  complete: {
    icon: CheckCircle2,
    label: "Complete",
    description: "RFP analysis complete. Extracted data is ready.",
    color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
  },
  failed: {
    icon: AlertTriangle,
    label: "Failed",
    description: "Embedding pipeline encountered an error. You can still work manually.",
    color: "text-red-500 border-red-500/20 bg-red-500/5",
  },
};

interface EmbeddingStatusBannerProps {
  projectId: string;
  onComplete?: () => void;
}

export function EmbeddingStatusBanner({ projectId, onComplete }: EmbeddingStatusBannerProps) {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/embedding-status`);
      if (!res.ok) return;
      const data: EmbeddingStatus = await res.json();
      setStatus(data);

      if (data.embeddingStatus === "complete") {
        onComplete?.();
      }
    } catch {
      // Non-critical — silently retry on next interval
    }
  }, [projectId, onComplete]);

  useEffect(() => {
    poll();

    const interval = setInterval(() => {
      poll();
    }, 3000);

    return () => clearInterval(interval);
  }, [poll]);

  // Don't show if not an rfp_filter project
  if (!status || status.source !== "rfp_filter") return null;

  // Don't show if dismissed and complete
  if (dismissed && (status.embeddingStatus === "complete" || !status.embeddingStatus)) return null;

  // Don't show if no embedding status at all
  if (!status.embeddingStatus) return null;

  const config = STATUS_CONFIG[status.embeddingStatus] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const isActive = status.embeddingStatus === "pending" || status.embeddingStatus === "embedding" || status.embeddingStatus === "extracting";

  return (
    <div className={`rounded-lg border p-4 ${config.color} transition-all duration-300`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {config.animate ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{config.label}</span>
            {status.filterStats && (
              <span className="text-[10px] opacity-70">
                {status.filterStats.totalKeptPages} pages from RFP
              </span>
            )}
          </div>
          <p className="text-xs opacity-80 mt-0.5">{config.description}</p>

          {/* Progress steps */}
          {isActive && (
            <div className="flex items-center gap-1.5 mt-2">
              <StepDot active={status.embeddingStatus === "pending"} done={status.embeddingStatus !== "pending"} label="Queue" />
              <StepLine done={status.embeddingStatus === "embedding" || status.embeddingStatus === "extracting"} />
              <StepDot active={status.embeddingStatus === "embedding"} done={status.embeddingStatus === "extracting"} label="Embed" />
              <StepLine done={status.embeddingStatus === "extracting"} />
              <StepDot active={status.embeddingStatus === "extracting"} done={false} label="Extract" />
            </div>
          )}

          {status.embeddingStatus === "complete" && status.hasExtractedData && (
            <div className="flex items-center gap-2 mt-2">
              <FileSearch className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                AI extraction complete — use Auto-RFP or Copilot to apply extracted data
              </span>
            </div>
          )}
        </div>

        {!isActive && (
          <button
            onClick={() => setDismissed(true)}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity px-2 py-1"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full transition-all ${
        active ? "bg-current scale-125" : done ? "bg-current opacity-60" : "bg-current/20"
      }`} />
      <span className={`text-[9px] uppercase tracking-wider ${
        active ? "font-bold" : done ? "opacity-60" : "opacity-30"
      }`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div className={`w-4 h-px transition-all ${done ? "bg-current opacity-60" : "bg-current/20"}`} />
  );
}
