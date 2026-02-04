"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ProposalType } from "@/types";
import { PricingDocument } from "@/types/pricing";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, Edit3, FileText, ChevronDown, ChevronUp } from "lucide-react";

/**
 * FR-4.1 & FR-4.2: Pricing Table Editor
 *
 * Allows users to:
 * - Rename section headers (e.g., "G7" → "Ribbon Display")
 * - Add custom proposal notes
 *
 * Only visible when pricingDocument exists (Mirror Mode).
 */
export default function PricingTableEditor() {
    const { setValue, control } = useFormContext<ProposalType>();
    const [isExpanded, setIsExpanded] = React.useState(true);

    // Watch pricing document and overrides
    const pricingDocument: PricingDocument | null = useWatch({
        control,
        name: "details.pricingDocument" as any,
    });

    const tableHeaderOverrides: Record<string, string> = useWatch({
        control,
        name: "details.tableHeaderOverrides" as any,
    }) || {};

    const customProposalNotes: string = useWatch({
        control,
        name: "details.customProposalNotes" as any,
    }) || "";

    const documentMode = useWatch({
        control,
        name: "details.documentMode",
    }) || "BUDGET";

    // Don't render if no pricing document
    if (!pricingDocument || !pricingDocument.tables || pricingDocument.tables.length === 0) {
        return null;
    }

    const handleHeaderChange = (tableId: string, newName: string) => {
        const updated = { ...tableHeaderOverrides, [tableId]: newName };
        setValue("details.tableHeaderOverrides" as any, updated, { shouldDirty: true });
    };

    const handleNotesChange = (notes: string) => {
        setValue("details.customProposalNotes" as any, notes, { shouldDirty: true });
    };

    return (
        <section className="flex flex-col gap-2 w-full mt-4">
            {/* Section Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0A52EF]/5 hover:bg-[#0A52EF]/10 border border-[#0A52EF]/20 rounded-lg text-foreground text-sm transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-[#0A52EF]" />
                    <span className="font-medium">Mirror Mode - Edit Pricing Tables</span>
                    <span className="text-[10px] bg-[#0A52EF]/20 text-[#0A52EF] px-1.5 py-0.5 rounded font-medium">
                        {pricingDocument.tables.length} table{pricingDocument.tables.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {isExpanded && (
                <div className="p-4 bg-card border border-border rounded-lg space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* FR-4.1: Section Header Overrides */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                            <Label className="text-sm font-semibold text-foreground">
                                Section Headers
                            </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-3">
                            Rename section headers as they appear in the PDF. Leave blank to use original Excel names.
                        </p>

                        <div className="grid gap-3">
                            {pricingDocument.tables.map((table) => {
                                const overriddenName = tableHeaderOverrides[table.id] || "";
                                const displayName = overriddenName || table.name;

                                return (
                                    <div key={table.id} className="flex items-center gap-3">
                                        <div className="w-32 shrink-0">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                Original:
                                            </span>
                                            <div className="text-xs font-mono text-muted-foreground truncate" title={table.name}>
                                                {table.name}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder={table.name}
                                                value={overriddenName}
                                                onChange={(e) => handleHeaderChange(table.id, e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/20 transition-colors"
                                            />
                                        </div>
                                        {overriddenName && (
                                            <button
                                                type="button"
                                                onClick={() => handleHeaderChange(table.id, "")}
                                                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* FR-4.2: Custom Proposal Notes */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <Label className="text-sm font-semibold text-foreground">
                                Custom Proposal Notes
                            </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {documentMode === "LOI"
                                ? "These notes will appear in the 'Additional Notes' section of the LOI."
                                : "These notes will appear after the pricing breakdown in the PDF."}
                        </p>
                        <Textarea
                            placeholder="Enter any additional notes, terms, or clarifications (e.g., CAD/USD exchange rate notes, special conditions)..."
                            value={customProposalNotes}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            className="min-h-[100px] text-sm bg-background border-border resize-y"
                        />
                    </div>

                    {/* Currency Info */}
                    {pricingDocument.currency && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Detected Currency:
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                                {pricingDocument.currency}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                                from "{pricingDocument.sourceSheet}"
                            </span>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
