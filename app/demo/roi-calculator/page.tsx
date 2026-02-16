"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RoiForm from "./components/RoiForm";
import RoiResults from "./components/RoiResults";
import { useRoiCalculation, DEFAULT_INPUTS } from "./hooks/useRoiCalculation";
import type { RoiInputs } from "./hooks/useRoiCalculation";

export default function RoiCalculatorPage() {
  const [inputs, setInputs] = useState<RoiInputs>(DEFAULT_INPUTS);
  const results = useRoiCalculation(inputs);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">
                ROI Calculator
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Show clients how fast the screen pays for itself
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Venue & Revenue Inputs</CardTitle>
            </CardHeader>
            <CardContent>
              <RoiForm inputs={inputs} onChange={setInputs} />
            </CardContent>
          </Card>

          {/* Right: Results */}
          <div className="space-y-6">
            <RoiResults results={results} projectCost={inputs.projectCost} />
          </div>
        </div>

        {/* Sales pitch */}
        <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 border border-border">
          <p className="text-sm text-muted-foreground italic">
            &ldquo;This {formatCost(inputs.projectCost)} screen will pay for itself in{" "}
            <span className="text-foreground font-semibold not-italic">
              {results.paybackMonths < 12
                ? `${Math.round(results.paybackMonths)} months`
                : `${(results.paybackMonths / 12).toFixed(1)} years`}
            </span>{" "}
            just from ad and sponsorship revenue. After 5 years, you&apos;re looking at{" "}
            <span className="text-emerald-600 font-semibold not-italic">
              {formatCost(results.fiveYearProfit)}
            </span>{" "}
            in pure profit.&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            — Use this pitch with your next client meeting
          </p>
        </div>
      </div>
    </div>
  );
}

function formatCost(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
