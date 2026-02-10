"use client";

import { useCallback, useState } from "react";
import { FileSpreadsheet, Upload, Loader2 } from "lucide-react";

interface ExcelDropzoneProps {
  onFileParsed: (data: any) => void;
  onError?: (error: string) => void;
}

export function ExcelDropzone({ onFileParsed, onError }: ExcelDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      onError?.('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/proposals/import-excel", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      onFileParsed(data);
    } catch (err: any) {
      onError?.(err.message || 'Failed to parse Excel file');
    } finally {
      setIsLoading(false);
    }
  }, [onFileParsed, onError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragging 
          ? 'border-emerald-500 bg-emerald-500/10' 
          : 'border-border bg-muted/50 hover:border-border/80 hover:bg-muted'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileInput}
        className="hidden"
        id="excel-dropzone-input"
      />
      <label htmlFor="excel-dropzone-input" className="cursor-pointer block">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-muted-foreground text-sm">Cracking open the workbook...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`
              p-3 rounded-full transition-colors
              ${isDragging ? 'bg-emerald-500/20' : 'bg-muted'}
            `}>
              {isDragging ? (
                <Upload className="w-8 h-8 text-emerald-500" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {isDragging ? 'Drop Excel file here' : 'Drag & drop Excel file here'}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                or click to browse (.xlsx, .xls)
              </p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
}
