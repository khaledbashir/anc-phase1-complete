"use client";

import React from "react";
import type { ExtractedLEDSpec } from "@/services/rfp/unified/types";
import { Monitor, ArrowRight } from "lucide-react";

interface SpecsTableProps {
  specs: ExtractedLEDSpec[];
}

export default function SpecsTable({ specs }: SpecsTableProps) {
  if (specs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No LED display specifications found yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Display</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Size (ft)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pitch</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Nits</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Env</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Qty</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Source</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {specs.map((spec, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{spec.name}</span>
                  {spec.mountingType && (
                    <span className="block text-xs text-muted-foreground mt-0.5">{spec.mountingType}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{spec.location || "—"}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {spec.widthFt != null && spec.heightFt != null
                    ? `${spec.widthFt}' × ${spec.heightFt}'`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {spec.pixelPitchMm != null ? `${spec.pixelPitchMm}mm` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {spec.brightnessNits != null ? spec.brightnessNits.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    spec.environment === "outdoor"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-purple-500/10 text-purple-500"
                  }`}>
                    {spec.environment}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-mono">{spec.quantity}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    spec.sourceType === "drawing"
                      ? "bg-amber-500/10 text-amber-500"
                      : spec.sourceType === "table"
                        ? "bg-cyan-500/10 text-cyan-500"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {spec.sourceType}
                  </span>
                  {spec.sourcePages.length > 0 && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      pg {spec.sourcePages.join(", ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          spec.confidence >= 0.8
                            ? "bg-emerald-500"
                            : spec.confidence >= 0.5
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${spec.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">
                      {Math.round(spec.confidence * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
