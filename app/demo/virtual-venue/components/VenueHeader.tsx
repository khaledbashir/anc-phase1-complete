"use client";

import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export default function VenueHeader() {
  return (
    <div className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link
          href="/demo"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Demo Lab
        </Link>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">
              Virtual Venue Visualizer
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Toggle displays · See live pricing · Drag sponsor logos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
