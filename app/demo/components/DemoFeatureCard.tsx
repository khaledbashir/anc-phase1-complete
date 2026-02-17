"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import VoteButtons from "./VoteButtons";
import type { DemoFeature } from "../data/featureIdeas";

export default function DemoFeatureCard({ feature }: { feature: DemoFeature }) {
  return (
    <div className="group relative rounded-xl border border-border/60 bg-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="p-5 space-y-4">
        {/* Header: icon + status */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-[#0A52EF]/8 flex items-center justify-center">
            {feature.icon && <feature.icon className="w-5 h-5 text-[#0A52EF]" />}
          </div>
          <StatusBadge status={feature.status} />
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5">
            {feature.title}
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Benefit */}
        <p className="text-xs text-muted-foreground/70 border-l-2 border-[#0A52EF]/20 pl-3 leading-relaxed">
          {feature.benefit}
        </p>

        {/* Footer: votes + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <VoteButtons featureId={feature.id} />

          {feature.status === "live" && feature.demoHref && (
            <Link
              href={feature.demoHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A52EF] hover:text-[#0A52EF]/80 transition-colors"
            >
              Try Demo
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
