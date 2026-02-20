import React from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { ScreenSpec } from "../_lib/triageApi";
import { generateSpecsExcel } from "../_lib/excelExport";

interface ExcelExportButtonProps {
    screens: ScreenSpec[];
    projectContext: string;
}

export default function ExcelExportButton({ screens, projectContext }: ExcelExportButtonProps) {
    if (!screens || screens.length === 0) return null;

    return (
        <div className="mt-8 flex justify-end">
            <button
                onClick={() => generateSpecsExcel(screens, projectContext)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0"
            >
                <FileSpreadsheet className="w-5 h-5" />
                Export to Excel
                <Download className="w-4 h-4 ml-1 opacity-70" />
            </button>
        </div>
    );
}
