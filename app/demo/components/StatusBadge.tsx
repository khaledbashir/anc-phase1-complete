"use client";

import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  concept: {
    label: "Concept",
    className: "bg-muted/50 text-muted-foreground border-border/50",
  },
  development: {
    label: "Building",
    className: "bg-[#0A52EF]/5 text-[#0A52EF]/70 border-[#0A52EF]/15",
  },
  live: {
    label: "Live",
    className: "bg-[#0A52EF]/8 text-[#0A52EF] border-[#0A52EF]/20",
  },
} as const;

export default function StatusBadge({ status }: { status: "concept" | "development" | "live" }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        config.className
      )}
    >
      {status === "live" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#0A52EF] animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
