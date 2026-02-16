"use client";

import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  concept: {
    label: "Concept",
    className: "bg-muted text-muted-foreground border-border",
  },
  development: {
    label: "In Development",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  live: {
    label: "Live Demo",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse",
  },
} as const;

export default function StatusBadge({ status }: { status: "concept" | "development" | "live" }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        config.className
      )}
    >
      {status === "live" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
      )}
      {config.label}
    </span>
  );
}
