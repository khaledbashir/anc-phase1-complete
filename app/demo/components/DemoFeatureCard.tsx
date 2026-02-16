"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import VoteButtons from "./VoteButtons";
import type { DemoFeature } from "../data/featureIdeas";

export default function DemoFeatureCard({ feature }: { feature: DemoFeature }) {
  return (
    <Card className="group relative overflow-hidden border border-border hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      {/* Accent strip */}
      <div
        className="h-1 w-full"
        style={{ background: feature.accentColor }}
      />

      <CardContent className="p-5 space-y-4">
        {/* Header: icon + status */}
        <div className="flex items-start justify-between">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: `${feature.accentColor}15` }}
          >
            {feature.icon && <feature.icon
              className="w-5 h-5"
              style={{ color: feature.accentColor }}
            />}
          </div>
          <StatusBadge status={feature.status} />
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {feature.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Benefit */}
        <p className="text-xs text-muted-foreground/80 italic border-l-2 border-border pl-3">
          {feature.benefit}
        </p>

        {/* Footer: votes + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <VoteButtons featureId={feature.id} seedVotes={feature.seedVotes} />

          {feature.status === "live" && feature.demoHref && (
            <Link
              href={feature.demoHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-colors"
            >
              Try Demo
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
