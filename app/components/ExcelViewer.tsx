"use client";

import React, { useMemo, useState } from "react";
import { useProposalContext, type ExcelPreviewSheet } from "@/contexts/ProposalContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MergeKey = `${number}:${number}`;

type ExcelViewerProps = {
  highlightedRows?: number[];
  focusedRow?: number | null;
  onFocusedRowChange?: (row: number) => void;
};

function normalizeValue(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumberLoose(value: string) {
  const raw = String(value ?? "").replace(/[^\d.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getLedHeaderRowIndex(grid: string[][]) {
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const rowText = grid[r].join(" ").toLowerCase();
    if (rowText.includes("display name") || rowText.includes("display")) return r;
  }
  return 0;
}

function makeMergeMaps(merges: ExcelPreviewSheet["merges"]) {
  const anchorByCell = new Map<MergeKey, { rowSpan: number; colSpan: number }>();
  const covered = new Set<MergeKey>();

  for (const m of merges) {
    const rowSpan = m.e.r - m.s.r + 1;
    const colSpan = m.e.c - m.s.c + 1;
    const anchorKey = `${m.s.r}:${m.s.c}` as const;
    anchorByCell.set(anchorKey, { rowSpan, colSpan });

    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        const key = `${r}:${c}` as const;
        if (key !== anchorKey) covered.add(key);
      }
    }
  }

  return { anchorByCell, covered };
}

const LED_HIGHLIGHT_COLS = new Set([0, 4, 5, 6, 12]);
const LED_BRIGHTNESS_COL_INDEX = 12;

export default function ExcelViewer({
  highlightedRows,
  focusedRow,
  onFocusedRowChange,
}: ExcelViewerProps) {
  const { excelPreview, excelPreviewLoading } = useProposalContext();
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null);

  const sheets = useMemo(() => excelPreview?.sheets || [], [excelPreview]);

  const effectiveActiveSheetName = useMemo(() => {
    if (!sheets.length) return null;
    if (activeSheetName && sheets.some((s) => s.name === activeSheetName)) return activeSheetName;
    return sheets[0].name;
  }, [activeSheetName, sheets]);

  const activeSheet = useMemo(() => {
    if (!effectiveActiveSheetName) return null;
    return sheets.find((s) => s.name === effectiveActiveSheetName) || null;
  }, [effectiveActiveSheetName, sheets]);

  const isLedCostSheetActive = useMemo(() => {
    const n = (activeSheet?.name || "").toLowerCase();
    return n.includes("led cost sheet") || (n.includes("led") && n.includes("sheet"));
  }, [activeSheet?.name]);

  const ledHeaderRowIndex = useMemo(() => {
    if (!activeSheet) return 0;
    return getLedHeaderRowIndex(activeSheet.grid);
  }, [activeSheet]);

  const highlightedRowsSet = useMemo(() => {
    return new Set((highlightedRows || []).filter((r) => Number.isFinite(r)));
  }, [highlightedRows]);

  const mergeMaps = useMemo(() => {
    if (!activeSheet) return null;
    return makeMergeMaps(activeSheet.merges);
  }, [activeSheet]);

  const colWidths = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.colWidths.map((w) => {
      if (w === 0) return "0px";
      if (typeof w === "number") return `${Math.max(36, w * 7)}px`;
      return "120px";
    });
  }, [activeSheet]);

  const validationSummary = useMemo(() => {
    if (!activeSheet || !isLedCostSheetActive) return null;

    const grid = activeSheet.grid;
    const hiddenRows = activeSheet.hiddenRows;
    const headerRow = grid[ledHeaderRowIndex] || [];
    
    // Find column indices dynamically
    const nameColIndex = headerRow.findIndex(cell => {
      const c = normalizeValue(cell).toLowerCase();
      return c === "display name" || c === "display";
    });
    const finalNameColIndex = nameColIndex !== -1 ? nameColIndex : 0;

    const heightColIndex = headerRow.findIndex(cell => {
      const c = normalizeValue(cell).toLowerCase();
      return c === "height" || c === "h";
    });
    const finalHeightColIndex = heightColIndex !== -1 ? heightColIndex : 5;

    const widthColIndex = headerRow.findIndex(cell => {
      const c = normalizeValue(cell).toLowerCase();
      return c === "width" || c === "w";
    });
    const finalWidthColIndex = widthColIndex !== -1 ? widthColIndex : 6;

    let foundActive = 0;
    let foundNumeric = 0;
    let foundProblems = 0;
    const rowErrors = new Map<number, string[]>();

    for (let r = ledHeaderRowIndex + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const rowTextUpper = row.join(" ").toUpperCase();
      const isAlt = rowTextUpper.includes("ALT");
      const isHidden = !!hiddenRows[r];
      if (isAlt || isHidden) continue;

      const nameCell = normalizeValue(row[finalNameColIndex] || "");
      if (!nameCell) continue;
      foundActive++;

      const errors: string[] = [];
      const h = normalizeValue(row[finalHeightColIndex] || "");
      const w = normalizeValue(row[finalWidthColIndex] || "");
      const isBad = (v: string) => !v || v.toUpperCase().includes("TBD");
      if (isBad(nameCell)) errors.push("Missing Display Name");
      if (isBad(h)) errors.push("Missing/Invalid Height");
      if (isBad(w)) errors.push("Missing/Invalid Width");
      if (errors.length > 0) {
        foundProblems++;
        rowErrors.set(r, errors);
        continue;
      }

      const hn = toNumberLoose(h);
      const wn = toNumberLoose(w);
      if (!hn || !wn || hn <= 0 || wn <= 0) {
        foundProblems++;
        if (!hn || hn <= 0) errors.push("Height must be > 0");
        if (!wn || wn <= 0) errors.push("Width must be > 0");
        rowErrors.set(r, errors);
        continue;
      }

      foundNumeric++;
    }

    return { foundActive, foundNumeric, foundProblems, rowErrors };
  }, [activeSheet, isLedCostSheetActive, ledHeaderRowIndex]);

  if (excelPreviewLoading) {
    return (
      <div className="h-full w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium font-['Work_Sans']">
          <FileSpreadsheet className="w-4 h-4" />
          Loading spreadsheet…
        </div>
      </div>
    );
  }

  if (!excelPreview || sheets.length === 0 || !activeSheet) {
    return (
      <div className="h-full w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-center">
        <div className="text-zinc-600 text-sm font-medium font-['Work_Sans']">Upload an Excel file to preview it here.</div>
      </div>
    );
  }

  const getAiExtractedTooltipText = (colIndex: number) => {
    if (colIndex === LED_BRIGHTNESS_COL_INDEX) return "AI-Extracted Brightness Field";
    return "AI-Extracted Field";
  };

  return (
    <div className="h-full w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden flex flex-col">
      <div className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/60 px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet className="w-4 h-4 text-brand-blue shrink-0" />
          <div className="text-[11px] text-zinc-300 font-semibold uppercase tracking-widest truncate font-['Work_Sans']">
            {excelPreview.fileName}
          </div>
        </div>

        {isLedCostSheetActive && validationSummary && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider border-zinc-800 bg-zinc-900/60 font-['Work_Sans']",
                validationSummary.foundProblems > 0
                  ? "text-red-400"
                  : validationSummary.foundNumeric > 0
                    ? "text-emerald-400"
                    : "text-zinc-400"
              )}
            >
              {validationSummary.foundProblems > 0 ? "Validation Issues" : validationSummary.foundNumeric > 0 ? "Validation OK" : "No Active Rows"}
            </Badge>
          </div>
        )}
      </div>

      <div className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/40 px-3 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        {sheets.map((s) => {
          const isActive = s.name === activeSheet.name;
          const showIssue = s.validationIssue && (s.name.toLowerCase().includes("led") || s.name.toLowerCase().includes("cost"));
          const showOk = !s.validationIssue && s.hasNumericDimensions && (s.name.toLowerCase().includes("led") || s.name.toLowerCase().includes("cost"));

          return (
            <button
              key={s.name}
              onClick={() => setActiveSheetName(s.name)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-[11px] font-semibold font-['Work_Sans'] whitespace-nowrap flex items-center gap-2 transition-colors",
                isActive
                  ? "bg-[#0A52EF]/15 border-[#0A52EF]/60 text-white"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <span className="truncate max-w-[240px]">{s.name}</span>
              {showIssue && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
              {showOk && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <TooltipProvider delayDuration={150}>
          <table className="min-w-full border-separate border-spacing-0 font-['Work_Sans']">
            <colgroup>
              {colWidths.map((w, idx) => (
                <col key={idx} style={{ width: w }} />
              ))}
            </colgroup>
            <tbody>
              {activeSheet.grid.map((row, r) => {
                const rowTextUpper = row.join(" ").toUpperCase();
                const isAlt = rowTextUpper.includes("ALT");
                const isHidden = !!activeSheet.hiddenRows[r];
                const isGhosted = isAlt || isHidden;
                const rowErrors = validationSummary?.rowErrors.get(r);
                const hasError = !!rowErrors && rowErrors.length > 0;
                const isHighlightedRow = highlightedRowsSet.has(r);
                const isFocusedRow = typeof focusedRow === "number" && r === focusedRow;

                return (
                  <tr
                    key={r}
                    onClick={
                      onFocusedRowChange
                        ? () => {
                            onFocusedRowChange(r);
                          }
                        : undefined
                    }
                    className={cn(
                      "hover:bg-zinc-900/40",
                      isGhosted && "opacity-50",
                      hasError && "bg-red-500/10 hover:bg-red-500/20",
                      isHighlightedRow && "bg-brand-blue/10 hover:bg-brand-blue/15",
                      isFocusedRow && "ring-1 ring-brand-blue/60"
                    )}
                  >
                    {row.map((cell, c) => {
                      const key = `${r}:${c}` as const;
                      if (mergeMaps?.covered.has(key)) return null;

                      const span = mergeMaps?.anchorByCell.get(key);
                      const isHighlightedCol = isLedCostSheetActive && LED_HIGHLIGHT_COLS.has(c);
                      const isHeaderRow = r === ledHeaderRowIndex;
                      const isHeaderHighlighted = isHeaderRow && isHighlightedCol;
                      const cellValue = normalizeValue(cell);

                      const baseClass = cn(
                        "text-[11px] text-zinc-200 align-top px-2 py-1 border-b border-zinc-900/60",
                        "border-r border-zinc-900/60",
                        isGhosted && "line-through",
                        isHighlightedCol && "bg-blue-50/5",
                        isHighlightedCol && "border-r-[#0A52EF]/35",
                        isHighlightedCol && c === 0 && "border-l-[#0A52EF]/35 border-l",
                        isHighlightedCol && "shadow-[inset_0_0_0_1px_rgba(10,82,239,0.20)]",
                        isHeaderRow && "bg-zinc-900/60 text-zinc-100 font-semibold",
                        isHeaderHighlighted && "bg-blue-50/10",
                        hasError && "border-b-red-500/20"
                      );

                      let content = <div className="whitespace-pre-wrap break-words">{cellValue}</div>;

                      if (isHeaderHighlighted) {
                        content = (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <span className="truncate">{cellValue}</span>
                                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#0A52EF]">AI</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-white font-['Work_Sans']">
                              {getAiExtractedTooltipText(c)}
                            </TooltipContent>
                          </Tooltip>
                        );
                      } else if (hasError && c === 0) {
                         // Show error tooltip on first column
                         content = (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                <span className="truncate text-red-200">{cellValue}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-red-950 border-red-900 text-red-200 font-['Work_Sans']">
                                <div className="font-bold mb-1">Row {r + 1} Issues:</div>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    {rowErrors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <td
                          key={c}
                          rowSpan={span?.rowSpan}
                          colSpan={span?.colSpan}
                          className={baseClass}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  );
}
