"use client";

import type { CellValueChangedEvent, ColDef, GetRowIdParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ProposalType } from "@/types";

// Register AG Grid modules (required for v35+)
ModuleRegistry.registerModules([AllCommunityModule]);

function toKey(screen: any) {
  if (screen?.id) return `id:${screen.id}`;
  if (screen?.sourceRef?.sheet && screen?.sourceRef?.row) return `src:${screen.sourceRef.sheet}:${screen.sourceRef.row}`;
  const name = (screen?.name ?? "").toString().trim().toUpperCase();
  const h = Number(screen?.heightFt ?? 0);
  const w = Number(screen?.widthFt ?? 0);
  const p = Number(screen?.pitchMm ?? 0);
  return `name:${name}:${h}:${w}:${p}`;
}

function parseOptionalNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export default function ScreensGridEditor() {
  const { control, setValue } = useFormContext<ProposalType>();
  const screens = useWatch({ control, name: "details.screens" }) || [];
  const themeClass = useMemo(
    () => (typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "ag-theme-quartz-dark" : "ag-theme-quartz"),
    []
  );

  const screensRef = useRef<any[]>(screens);
  screensRef.current = screens;

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: "externalName", headerName: "Display Name", editable: true, minWidth: 240, flex: 1 },
      { field: "name", headerName: "Internal", editable: true, minWidth: 180 },
      {
        field: "heightFt",
        headerName: "H (ft)",
        editable: true,
        minWidth: 110,
        valueParser: (p) => parseOptionalNumber(p.newValue),
      },
      {
        field: "widthFt",
        headerName: "W (ft)",
        editable: true,
        minWidth: 110,
        valueParser: (p) => parseOptionalNumber(p.newValue),
      },
      {
        field: "quantity",
        headerName: "Qty",
        editable: true,
        minWidth: 90,
        valueParser: (p) => parseOptionalNumber(p.newValue),
      },
      {
        field: "pitchMm",
        headerName: "Pitch (mm)",
        editable: true,
        minWidth: 120,
        valueParser: (p) => parseOptionalNumber(p.newValue),
      },
      { field: "brightness", headerName: "Brightness", editable: true, minWidth: 140 },
      {
        field: "serviceType",
        headerName: "Service",
        editable: true,
        minWidth: 130,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", "Top", "Front/Rear"] },
      },
      { field: "customDisplayName", headerName: "PDF Override", editable: true, minWidth: 200 },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      editable: true,
      singleClickEdit: true,
    }),
    []
  );

  const getRowId = (params: GetRowIdParams) => toKey(params.data);

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    const field = event.colDef.field as string | undefined;
    if (!field) return;

    const currentScreens = screensRef.current || [];
    const key = toKey(event.data);
    const idx = currentScreens.findIndex((s: any) => toKey(s) === key);
    if (idx < 0) return;

    const nextValue = (event.data as any)[field];
    setValue(`details.screens.${idx}.${field}` as any, nextValue, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-background/60">
        <div className="text-xs font-semibold tracking-wide">Screen Editor</div>
        <div className="text-[11px] text-muted-foreground">Edits here drive preview and export.</div>
      </div>
      <div className={["flex-1 min-h-0", themeClass].join(" ")}>
        <AgGridReact
          rowData={screens as any[]}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          onCellValueChanged={onCellValueChanged}
          stopEditingWhenCellsLoseFocus
          suppressMovableColumns
          animateRows={false}
        />
      </div>
    </div>
  );
}
