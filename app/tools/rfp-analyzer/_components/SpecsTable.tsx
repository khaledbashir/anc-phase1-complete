"use client";

import React, { useState, useCallback } from "react";
import type { ExtractedLEDSpec } from "@/services/rfp/unified/types";
import { Monitor, Pencil } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpecsTableProps {
  specs: ExtractedLEDSpec[];
  editable?: boolean;
  onSpecsChange?: (specs: ExtractedLEDSpec[]) => void;
  onSourceClick?: (pageNumber: number) => void;
}

// ---------------------------------------------------------------------------
// Editable cell — looks like plain text until hovered/focused
// ---------------------------------------------------------------------------

function EditableCell({
  value,
  onChange,
  type = "text",
  align = "left",
  suffix,
  placeholder = "—",
}: {
  value: string | number | null | undefined;
  onChange: (val: string) => void;
  type?: "text" | "number";
  align?: "left" | "right" | "center";
  suffix?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value ?? ""));

  const display = value != null && value !== "" ? `${value}${suffix || ""}` : placeholder;
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  if (!editing) {
    return (
      <button
        onClick={() => { setLocalVal(String(value ?? "")); setEditing(true); }}
        className={`w-full px-2 py-1 font-mono text-xs ${alignClass} cursor-cell
          border border-transparent hover:border-border rounded transition-colors
          ${value == null || value === "" ? "text-muted-foreground" : "text-foreground"}`}
        title="Click to edit"
      >
        {display}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => { onChange(localVal); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { onChange(localVal); setEditing(false); }
        if (e.key === "Escape") setEditing(false);
      }}
      className={`w-full px-2 py-1 font-mono text-xs ${alignClass}
        border border-[#0A52EF] rounded bg-[#0A52EF]/5 outline-none`}
    />
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

export default function SpecsTable({ specs, editable = false, onSpecsChange, onSourceClick }: SpecsTableProps) {
  const [dirtyIndices, setDirtyIndices] = useState<Set<number>>(new Set());

  const updateSpec = useCallback((index: number, field: keyof ExtractedLEDSpec, rawValue: string) => {
    const updated = [...specs];
    const spec = { ...updated[index] };

    // Parse based on field type
    if (field === "widthFt" || field === "heightFt" || field === "pixelPitchMm" || field === "brightnessNits" || field === "quantity") {
      const num = rawValue === "" ? null : Number(rawValue);
      (spec as any)[field] = num != null && !isNaN(num) ? num : null;
    } else {
      (spec as any)[field] = rawValue || null;
    }

    updated[index] = spec;
    setDirtyIndices((prev) => new Set(prev).add(index));
    onSpecsChange?.(updated);
  }, [specs, onSpecsChange]);

  if (specs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Monitor className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">No LED display specifications found yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {editable && dirtyIndices.size > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0A52EF]/5 border-b border-border">
          <span className="text-[10px] text-[#0A52EF] font-medium flex items-center gap-1">
            <Pencil className="w-3 h-3" />
            {dirtyIndices.size} row{dirtyIndices.size > 1 ? "s" : ""} edited
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Display</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">W (ft)</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">H (ft)</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">Pitch</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-16">Nits</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground w-14">Env</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10">Qty</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">Source</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {specs.map((spec, i) => {
              const isDirty = dirtyIndices.has(i);
              return (
                <tr
                  key={i}
                  className={`border-b border-border last:border-0 transition-colors ${
                    isDirty ? "bg-[#0A52EF]/[0.03]" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Display name — editable */}
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.name}
                        onChange={(v) => updateSpec(i, "name", v)}
                      />
                    ) : (
                      <>
                        <span className="font-medium text-foreground text-xs">{spec.name}</span>
                        {spec.mountingType && (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">{spec.mountingType}</span>
                        )}
                      </>
                    )}
                    {spec.isAlternate && (
                      <span className="inline-block ml-1 px-1.5 py-0 text-[9px] font-bold bg-amber-500/10 text-amber-600 rounded">
                        ALT {spec.alternateId || ""}
                      </span>
                    )}
                  </td>

                  {/* Location — editable */}
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.location}
                        onChange={(v) => updateSpec(i, "location", v)}
                      />
                    ) : (
                      <span className="text-muted-foreground">{spec.location || "—"}</span>
                    )}
                  </td>

                  {/* Width — editable */}
                  <td className="px-1 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.widthFt}
                        onChange={(v) => updateSpec(i, "widthFt", v)}
                        type="number"
                        align="right"
                        suffix="'"
                      />
                    ) : (
                      <span className="font-mono text-right block">{spec.widthFt != null ? `${spec.widthFt}'` : "—"}</span>
                    )}
                  </td>

                  {/* Height — editable */}
                  <td className="px-1 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.heightFt}
                        onChange={(v) => updateSpec(i, "heightFt", v)}
                        type="number"
                        align="right"
                        suffix="'"
                      />
                    ) : (
                      <span className="font-mono text-right block">{spec.heightFt != null ? `${spec.heightFt}'` : "—"}</span>
                    )}
                  </td>

                  {/* Pixel Pitch — editable */}
                  <td className="px-1 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.pixelPitchMm}
                        onChange={(v) => updateSpec(i, "pixelPitchMm", v)}
                        type="number"
                        align="right"
                        suffix="mm"
                      />
                    ) : (
                      <span className="font-mono text-right block">{spec.pixelPitchMm != null ? `${spec.pixelPitchMm}mm` : "—"}</span>
                    )}
                  </td>

                  {/* Brightness — editable */}
                  <td className="px-1 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.brightnessNits}
                        onChange={(v) => updateSpec(i, "brightnessNits", v)}
                        type="number"
                        align="right"
                      />
                    ) : (
                      <span className="font-mono text-right block">{spec.brightnessNits != null ? spec.brightnessNits.toLocaleString() : "—"}</span>
                    )}
                  </td>

                  {/* Environment — read-only badge */}
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      spec.environment === "outdoor"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-purple-500/10 text-purple-500"
                    }`}>
                      {spec.environment}
                    </span>
                  </td>

                  {/* Quantity — editable */}
                  <td className="px-1 py-1.5">
                    {editable ? (
                      <EditableCell
                        value={spec.quantity}
                        onChange={(v) => updateSpec(i, "quantity", v)}
                        type="number"
                        align="center"
                      />
                    ) : (
                      <span className="font-mono text-center block">{spec.quantity}</span>
                    )}
                  </td>

                  {/* Source — read-only, clickable page refs */}
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      spec.sourceType === "drawing"
                        ? "bg-amber-500/10 text-amber-500"
                        : spec.sourceType === "table"
                          ? "bg-cyan-500/10 text-cyan-500"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {spec.sourceType}
                    </span>
                    {spec.sourcePages.length > 0 && (
                      <span className="block text-[10px] mt-0.5">
                        {spec.sourcePages.map((pg, j) => (
                          <button
                            key={pg}
                            onClick={() => onSourceClick?.(pg)}
                            className={`${onSourceClick ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}`}
                          >
                            {j > 0 ? ", " : "pg "}
                            {pg}
                          </button>
                        ))}
                      </span>
                    )}
                  </td>

                  {/* Confidence — read-only */}
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
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
                      <span className="text-[10px] font-mono w-7 text-right">
                        {Math.round(spec.confidence * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
