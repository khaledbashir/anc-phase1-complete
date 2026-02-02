"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { cn } from "@/lib/utils";

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

const HIDDEN_COLUMN_HEADERS = new Set(["type"]);

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
    const cols = activeSheet.grid[0]?.length ?? 0;
    const colDefs: ColDef[] = [];

    colDefs.push({
      colId: "__row",
      headerName: "",
      pinned: "left",
      width: 56,
      resizable: false,
      suppressMovable: true,
      editable: false,
      valueGetter: (p) => (typeof p.data?.rowIndex === "number" ? p.data.rowIndex + 1 : ""),
      cellClass: "text-muted-foreground text-xs font-mono",
    });

    for (let c = 0; c < cols; c++) {
      if (isLedCostSheetActive && hiddenColumnIndices.has(c)) continue;
      colDefs.push({
        colId: `c${c}`,
        headerName: isLedCostSheetActive ? normalizeValue(activeSheet.grid[ledHeaderRowIndex]?.[c] || "") || `C${c + 1}` : `C${c + 1}`,
        minWidth: 110,
        flex: 1,
        editable: editable && isLedCostSheetActive,
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
    <div className="w-full h-full flex flex-col">
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

      <div className="flex-1 min-h-0 ag-theme-quartz">
        <AgGridReact
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
  );
}
