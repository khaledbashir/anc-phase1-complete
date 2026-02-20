import React, { useState, useMemo } from 'react';
import { ScreenSpec } from '../_lib/triageApi';
import { ChevronDown, ChevronUp, FileText, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper for coloring the confidence badge
function getConfidenceColor(conf: number) {
    if (conf >= 0.8) return "bg-green-100 text-green-700 border-green-200";
    if (conf >= 0.5) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
}

interface ScreenSpecsTableProps {
    screens: ScreenSpec[];
    onUpdateScreens: (screens: ScreenSpec[]) => void;
    summary: {
        total_screens_found: number;
        from_text: number;
        from_drawings: number;
    } | null;
}

type SortField = keyof ScreenSpec;

export default function ScreenSpecsTable({ screens, onUpdateScreens, summary }: ScreenSpecsTableProps) {
    const [sortField, setSortField] = useState<SortField>("source_type");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const handleCellChange = (index: number, field: keyof ScreenSpec, value: any) => {
        const newScreens = [...screens];
        // Ensure proper typing for numeric fields falling back to null
        if (field === "quantity" || field === "pixel_pitch_mm" || field === "nits_brightness") {
            const parsed = parseFloat(value);
            (newScreens[index] as any)[field] = isNaN(parsed) ? null : parsed;
        } else {
            (newScreens[index] as any)[field] = value;
        }
        onUpdateScreens(newScreens);
    };

    const sortedScreens = useMemo(() => {
        return [...screens].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            if (aVal === bVal) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;

            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
            }

            return 0;
        });
    }, [screens, sortField, sortOrder]);

    if (!screens || screens.length === 0) return null;

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    Extracted Screen Specifications
                </h3>
                {summary && (
                    <div className="flex space-x-3 text-sm font-medium">
                        <span className="px-3 py-1 bg-muted rounded-full text-foreground">
                            {summary.total_screens_found} Total Screens
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {summary.from_text} from Text
                        </span>
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200 flex items-center gap-1">
                            <PenTool className="w-3.5 h-3.5" />
                            {summary.from_drawings} from Drawings
                        </span>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th onClick={() => handleSort("screen_name")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Screen Name {sortField === "screen_name" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("location")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Location {sortField === "location" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("size")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Size {sortField === "size" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("pixel_pitch_mm")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Pitch {sortField === "pixel_pitch_mm" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("resolution")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Resolution {sortField === "resolution" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("indoor_outdoor")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">In/Out {sortField === "indoor_outdoor" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("quantity")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Qty {sortField === "quantity" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("source_type")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Source {sortField === "source_type" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th onClick={() => handleSort("confidence")} className="px-4 py-3 cursor-pointer hover:bg-muted/80">Conf. {sortField === "confidence" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedScreens.map((screen, idx) => {
                                // Find original index for mutability tracking
                                const originalIndex = screens.findIndex(s => s === screen);
                                const isExpanded = expandedRow === originalIndex;

                                return (
                                    <React.Fragment key={originalIndex}>
                                        <tr className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-4 py-2">
                                                <input
                                                    className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                                                    value={screen.screen_name}
                                                    onChange={(e) => handleCellChange(originalIndex, "screen_name", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                                                    value={screen.location}
                                                    onChange={(e) => handleCellChange(originalIndex, "location", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <input
                                                    className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                                                    value={screen.size}
                                                    onChange={(e) => handleCellChange(originalIndex, "size", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 w-20">
                                                <input
                                                    className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                                                    value={screen.pixel_pitch_mm || ""}
                                                    placeholder="-"
                                                    onChange={(e) => handleCellChange(originalIndex, "pixel_pitch_mm", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 w-28 text-xs font-mono">
                                                <input
                                                    className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                                                    value={screen.resolution || ""}
                                                    placeholder="-"
                                                    onChange={(e) => handleCellChange(originalIndex, "resolution", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 w-24">
                                                <select
                                                    className="bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                                                    value={screen.indoor_outdoor}
                                                    onChange={(e) => handleCellChange(originalIndex, "indoor_outdoor", e.target.value)}
                                                >
                                                    <option value="indoor">Indoor</option>
                                                    <option value="outdoor">Outdoor</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 w-16">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1 text-center font-medium"
                                                    value={screen.quantity}
                                                    onChange={(e) => handleCellChange(originalIndex, "quantity", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 w-fit",
                                                    screen.source_type === "text" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                                                )}>
                                                    {screen.source_type === "text" ? <FileText className="w-3 h-3" /> : <PenTool className="w-3 h-3" />}
                                                    p.{screen.source_page}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium border",
                                                    getConfidenceColor(screen.confidence)
                                                )}>
                                                    {Math.round(screen.confidence * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <button
                                                    onClick={() => setExpandedRow(isExpanded ? null : originalIndex)}
                                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-muted/20 border-b border-border">
                                                <td colSpan={10} className="px-6 py-4">
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div>
                                                            <span className="font-semibold text-muted-foreground block mb-1">Mounting Type:</span>
                                                            <input
                                                                className="w-full p-2 bg-background border border-border rounded"
                                                                value={screen.mounting_type || ""}
                                                                placeholder="Not specified"
                                                                onChange={(e) => handleCellChange(originalIndex, "mounting_type", e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-muted-foreground block mb-1">Special Requirements:</span>
                                                            <input
                                                                className="w-full p-2 bg-background border border-border rounded"
                                                                value={screen.special_requirements || ""}
                                                                placeholder="Not specified"
                                                                onChange={(e) => handleCellChange(originalIndex, "special_requirements", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="font-semibold text-muted-foreground block mb-1">Raw Analysis Notes:</span>
                                                            <div className="p-3 bg-background border border-border rounded text-muted-foreground italic max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px]">
                                                                {screen.raw_notes}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">Tip: You can click inside any cell on the table to manually correct the AI extraction.</p>
        </div>
    );
}
