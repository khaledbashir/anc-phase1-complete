"use client";

import React, { useState } from "react";
import type { ExtractedRequirement, RequirementCategory, RequirementStatus } from "@/services/rfp/unified/types";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  DollarSign,
  Cpu,
  Thermometer,
  Wrench,
  FileText,
  Filter,
} from "lucide-react";

interface RequirementsTableProps {
  requirements: ExtractedRequirement[];
}

// ============================================================================
// Status config
// ============================================================================

const STATUS_CONFIG: Record<RequirementStatus, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  critical: { label: "Critical", color: "text-red-600", bg: "bg-red-500/10", icon: AlertTriangle },
  risk: { label: "Risk", color: "text-amber-600", bg: "bg-amber-500/10", icon: AlertTriangle },
  verified: { label: "Verified", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  info: { label: "Info", color: "text-blue-600", bg: "bg-blue-500/10", icon: Info },
};

const CATEGORY_CONFIG: Record<RequirementCategory, { label: string; icon: typeof Shield }> = {
  compliance: { label: "Compliance", icon: Shield },
  technical: { label: "Technical", icon: Cpu },
  deadline: { label: "Deadline", icon: Calendar },
  financial: { label: "Financial", icon: DollarSign },
  operational: { label: "Operational", icon: Wrench },
  environmental: { label: "Environmental", icon: Thermometer },
  other: { label: "Other", icon: FileText },
};

// ============================================================================
// Component
// ============================================================================

export default function RequirementsTable({ requirements }: RequirementsTableProps) {
  const [filter, setFilter] = useState<RequirementStatus | "all">("all");

  if (requirements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No requirements extracted.</p>
      </div>
    );
  }

  // Count by status
  const statusCounts = requirements.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = filter === "all" ? requirements : requirements.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`All (${requirements.length})`}
        />
        {(["critical", "risk", "verified", "info"] as RequirementStatus[]).map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const config = STATUS_CONFIG[status];
          return (
            <FilterChip
              key={status}
              active={filter === status}
              onClick={() => setFilter(status)}
              label={`${config.label} (${count})`}
              color={config.color}
            />
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">Date</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.info;
                const category = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.other;
                const StatusIcon = status.icon;
                const CatIcon = category.icon;

                return (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CatIcon className="w-3 h-3" />
                        {category.label}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3">
                      <p className="text-foreground leading-relaxed">{req.description}</p>
                      {req.rawText && (
                        <p className="text-xs text-muted-foreground mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                          &ldquo;{req.rawText}&rdquo;
                        </p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-center">
                      {req.date ? (
                        <span className="text-xs font-mono text-foreground">{req.date}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Source pages */}
                    <td className="px-4 py-3 text-center">
                      {req.sourcePages.length > 0 ? (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          pg {req.sourcePages.join(", ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Filter chip
// ============================================================================

function FilterChip({ active, onClick, label, color }: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : `border border-border hover:bg-muted ${color || "text-muted-foreground"}`
      }`}
    >
      {label}
    </button>
  );
}
