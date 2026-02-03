"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { cn } from "@/lib/utils";

// Register AG Grid modules (required for v35+)
ModuleRegistry.registerModules([AllCommunityModule]);

type ExcelGridViewerProps = {
  highlightedRows?: number[];
  focusedRow?: number | null;
  onFocusedRowChange?: (row: number) => void;
  editable?: boolean;
  scanningRow?: number | null;
};

function normalizeValue(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getLedHeaderRowIndex(grid: string[][]) {
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const rowText = grid[r].join(" ").toLowerCase();
    if (rowText.includes("display name") || rowText.includes("display")) return r;
  }
  return 0;
}

function getMaxColumnCount(grid: string[][]) {
  let max = 0;
  for (let r = 0; r < grid.length; r++) {
    const len = Array.isArray(grid[r]) ? grid[r].length : 0;
    if (len > max) max = len;
  }
  return max;
}

const HIDDEN_COLUMN_HEADERS = new Set(["type"]);
const EDITABLE_HEADERS = new Set([
  "display name",
  "display",
  "height",
  "h",
  "width",
  "w",
  "qty",
  "quantity",
  "mm pitch",
  "pitch",
  "pixel pitch",
  "brightness",
  "nits",
]);

export default function ExcelGridViewer({
  highlightedRows,
  focusedRow,
  onFocusedRowChange,
  editable = false,
  scanningRow,
}: ExcelGridViewerProps) {
  const { excelPreview, excelPreviewLoading, updateExcelCell } = useProposalContext();
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null);
  const gridApiRef = useRef<any>(null);
  const themeClass = useMemo(
    () => (typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "ag-theme-quartz-dark" : "ag-theme-quartz"),
    []
  );

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

  const hiddenColumnIndices = useMemo(() => {
    if (!activeSheet) return new Set<number>();
    const headerRow = activeSheet.grid[ledHeaderRowIndex] || [];
    const hidden = new Set<number>();
    headerRow.forEach((cell, idx) => {
      const normalized = normalizeValue(cell).toLowerCase();
      if (HIDDEN_COLUMN_HEADERS.has(normalized)) hidden.add(idx);
    });
    return hidden;
  }, [activeSheet, ledHeaderRowIndex]);

  const highlightedRowsSet = useMemo(() => new Set(highlightedRows || []), [highlightedRows]);

  const rowData = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.grid.map((row, rowIndex) => ({ row, rowIndex }));
  }, [activeSheet]);

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!activeSheet) return [];
    const cols = getMaxColumnCount(activeSheet.grid);
    const colDefs: ColDef[] = [];

    colDefs.push({
      colId: "__row",
      headerName: "",
      pinned: "left",
      width: 60,
      resizable: false,
      suppressMovable: true,
      editable: false,
      valueGetter: (p) => (typeof p.data?.rowIndex === "number" ? p.data.rowIndex + 1 : ""),
      cellClass: "text-muted-foreground text-xs font-mono",
    });

    for (let c = 0; c < cols; c++) {
      if (isLedCostSheetActive && hiddenColumnIndices.has(c)) continue;
      const headerCell = isLedCostSheetActive ? normalizeValue(activeSheet.grid[ledHeaderRowIndex]?.[c] || "") : "";
      const headerNorm = headerCell.toLowerCase();
      const isEditableCol = isLedCostSheetActive && EDITABLE_HEADERS.has(headerNorm);
      colDefs.push({
        colId: `c${c}`,
        headerName: isLedCostSheetActive ? headerCell || `C${c + 1}` : `C${c + 1}`,
        minWidth: 120,
        flex: 1,
        editable: editable && isEditableCol,
        valueGetter: (p) => String(p.data?.row?.[c] ?? ""),
        valueSetter: (p) => {
          const newValue = String(p.newValue ?? "");
          if (!activeSheet) return false;
          if (typeof p.data?.rowIndex !== "number") return false;
          if (p.data.rowIndex <= ledHeaderRowIndex) return false;
          updateExcelCell(activeSheet.name, p.data.rowIndex, c, newValue);
          return true;
        },
      });
    }

    return colDefs;
  }, [activeSheet, editable, hiddenColumnIndices, isLedCostSheetActive, ledHeaderRowIndex, updateExcelCell]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      filter: false,
      resizable: true,
      editable: false,
      suppressMovable: true,
      cellClass: "text-xs",
    }),
    []
  );

  const onGridReady = (e: GridReadyEvent) => {
    gridApiRef.current = e.api;
  };

  const onSelectionChanged = (e: SelectionChangedEvent) => {
    const rows = e.api.getSelectedRows();
    const first = rows[0];
    if (typeof first?.rowIndex === "number" && onFocusedRowChange) onFocusedRowChange(first.rowIndex);
  };

  useEffect(() => {
    if (!gridApiRef.current) return;
    if (typeof focusedRow !== "number") return;
    gridApiRef.current.ensureIndexVisible(focusedRow, "middle");
    gridApiRef.current.forEachNode((node: any) => {
      node.setSelected(node?.data?.rowIndex === focusedRow);
    });
  }, [focusedRow]);

  const getRowClass = useCallback(
    (params: any) => {
      const r = params?.data?.rowIndex;
      if (!Number.isFinite(r)) return "";
      return cn(
        highlightedRowsSet.has(r) && "bg-brand-blue/10",
        typeof scanningRow === "number" && r === scanningRow && "bg-brand-blue/20"
      );
    },
    [highlightedRowsSet, scanningRow]
  );

  if (excelPreviewLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        Loading Excel preview…
      </div>
    );
  }

  if (!excelPreview || sheets.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        Upload an Excel file to preview it here.
      </div>
    );
  }

  if (!activeSheet) return null;

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-2 border-b border-border bg-background/60 flex items-center gap-2 overflow-x-auto">
        {sheets.map((s) => {
          const isActive = s.name === activeSheet.name;
          return (
            <button
              key={s.name}
              onClick={() => setActiveSheetName(s.name)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors",
                isActive ? "bg-brand-blue/15 border-brand-blue/50 text-foreground" : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* AG Grid needs an explicit-height container */}
      <div className="flex-1 min-h-0 relative" style={{ minHeight: 400 }}>
        <div 
          className={themeClass}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        >
          <style jsx global>{`
            .ag-theme-quartz,
            .ag-theme-quartz-dark {
              --ag-font-family: Work Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
              --ag-font-size: 12px;
              --ag-header-height: 34px;
              --ag-row-height: 30px;
              width: 100% !important;
              height: 100% !important;
            }
            .ag-theme-quartz .ag-header-cell-label,
            .ag-theme-quartz-dark .ag-header-cell-label {
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              font-size: 10px;
            }
            .ag-root-wrapper {
              height: 100% !important;
            }
          `}</style>
          <AgGridReact
            theme="legacy"
            rowData={rowData as any[]}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="single"
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            getRowClass={getRowClass as any}
            stopEditingWhenCellsLoseFocus
            suppressRowHoverHighlight={false}
            animateRows={false}
          />
        </div>
      </div>
    </div>
  );
}
