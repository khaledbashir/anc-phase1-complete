"use client";

import { useEffect, useState } from "react";

// RHF
import { FieldArrayWithId, useFormContext, useWatch } from "react-hook-form";

// ShadCn
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Components
import { BaseButton, FormInput } from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { ChevronDown, ChevronUp, Trash2, Copy, ShieldCheck, Zap, AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Enterprise Math
import { formatDimension, formatCurrencyPDF, calculateArea, safeNumber } from "@/lib/math";

type SingleScreenProps = {
    name: string;
    index: number;
    fields: any[];
    field: FieldArrayWithId<any, any>;
    moveFieldUp: (index: number) => void;
    moveFieldDown: (index: number) => void;
    removeField: (index: number) => void;
    duplicateField?: (index: number) => void;
};

const SingleScreen = ({
    name,
    index,
    fields,
    field,
    moveFieldUp,
    moveFieldDown,
    removeField,
    duplicateField,
}: SingleScreenProps) => {
    const { control, setValue, register, formState: { errors } } = useFormContext();
    const { _t } = useTranslationContext();
    const { aiFields } = useProposalContext();
    const [isExpanded, setIsExpanded] = useState(index === 0 && fields.length === 1);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const screenName = useWatch({ name: `${name}[${index}].name`, control });
    const width = useWatch({ name: `${name}[${index}].widthFt`, control });
    const height = useWatch({ name: `${name}[${index}].heightFt`, control });
    const quantity = useWatch({ name: `${name}[${index}].quantity`, control });
    const pitch = useWatch({ name: `${name}[${index}].pitchMm`, control });
    const desiredMargin = useWatch({ name: `${name}[${index}].desiredMargin`, control });

    // Watch the audit result for this screen
    const audit = useWatch({ name: `details.internalAudit.perScreen[${index}]`, control });
    const finalClientTotal = audit?.breakdown?.finalClientTotal || 0;
    const sellingPricePerSqFt = audit?.breakdown?.sellingPricePerSqFt || 0;

    // Check for validation errors
    const screenErrors = (errors as any)?.details?.screens?.[index];
    const hasErrors = screenErrors && Object.keys(screenErrors).length > 0;

    // Check for warnings
    const hasLowMargin = desiredMargin < 0.15;
    const isMissingDimensions = !width || !height || width === 0 || height === 0;
    const hasWarning = hasLowMargin || isMissingDimensions;

    useEffect(() => {
        if (width != undefined && height != undefined) {
            const area = calculateArea(Number(width), Number(height));
            setValue(`${name}[${index}].areaSqFt`, area);
        }
        if (width != undefined && height != undefined && pitch != undefined) {
            const pitchFeet = Number(pitch) / 304.8;
            const pixelsHeight = Number(height) / pitchFeet;
            const pixelsWidth = Number(width) / pitchFeet;
            const pixelResolution = Math.round(pixelsHeight * pixelsWidth);
            setValue(`${name}[${index}].pixelResolution`, pixelResolution);
        }
    }, [width, height, pitch, name, index, setValue]);

    const area = calculateArea(safeNumber(width), safeNumber(height));

    return (
        <div className={cn(
            "border rounded-xl overflow-hidden transition-all duration-200",
            hasErrors ? "border-red-500/50 bg-red-950/10" :
                hasWarning ? "border-yellow-500/50 bg-yellow-950/10" :
                    "border-zinc-700 bg-zinc-900/30"
        )}>
            {/* Collapsed Header - Always Visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {/* Status Indicator */}
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        hasErrors ? "bg-red-500" :
                            hasWarning ? "bg-yellow-500" :
                                "bg-emerald-500"
                    )} />

                    <div className="text-left">
                        <p className="font-medium text-zinc-100">
                            #{index + 1} - {screenName || "Untitled Screen"}
                        </p>
                        <p className="text-xs text-zinc-500">
                            {width > 0 && height > 0 ? `${formatDimension(Number(width))}' × ${formatDimension(Number(height))}'` : "No dimensions"}
                            {quantity > 1 && ` × ${quantity}`}
                            {pitch > 0 && ` • ${pitch}mm pitch`}
                        </p>
                    </div>

                    {/* Warning/Error Badges */}
                    {hasErrors && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-medium rounded-full flex items-center gap-1 cursor-help">
                                        <AlertTriangle className="w-3 h-3" />
                                        Errors
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                >
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold text-red-400 mb-2">Validation Errors:</p>
                                        {screenErrors && Object.entries(screenErrors).map(([field, error]: [string, any]) => (
                                            <p key={field} className="text-zinc-300">
                                                • {field}: {error?.message || 'Invalid'}
                                            </p>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {hasLowMargin && !hasErrors && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 text-[10px] font-medium rounded-full">
                            Low Margin
                        </span>
                    )}
                    {aiFields?.includes(`${name}[${index}].name`) && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-medium rounded-full flex items-center gap-1 cursor-help">
                                        <CheckCircle2 className="w-3 h-3" />
                                        AI
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                >
                                    <p className="text-xs leading-relaxed">
                                        <strong className="text-[#0A52EF]">AI Extracted:</strong> This value was pulled automatically from the RFP (e.g., Exhibit B). Please verify and lock this data.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Price Preview */}
                    <div className="text-right">
                        <p className="text-base font-semibold text-blue-500">
                            {finalClientTotal > 0
                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(formatCurrencyPDF(finalClientTotal))
                                : "$0"
                            }
                        </p>
                        <p className="text-xs text-zinc-500">
                            {(desiredMargin * 100 || 0).toFixed(0)}% margin
                        </p>
                    </div>

                    <ChevronRight className={cn(
                        "w-5 h-5 text-zinc-500 transition-transform duration-200",
                        isExpanded && "rotate-90"
                    )} />
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 border-t border-zinc-700/50 space-y-4">
                    {/* Quick Actions Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-700/30">
                        <div className="flex items-center gap-2">
                            <BaseButton
                                size="icon"
                                variant="ghost"
                                onClick={() => moveFieldUp(index)}
                                disabled={index === 0}
                                tooltipLabel="Move up"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </BaseButton>
                            <BaseButton
                                size="icon"
                                variant="ghost"
                                onClick={() => moveFieldDown(index)}
                                disabled={index === fields.length - 1}
                                tooltipLabel="Move down"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </BaseButton>
                            <BaseButton
                                size="icon"
                                variant="outline"
                                onClick={() => duplicateField?.(index)}
                                tooltipLabel="Duplicate"
                            >
                                <Copy className="w-4 h-4" />
                            </BaseButton>
                        </div>
                        <BaseButton
                            variant="destructive"
                            size="sm"
                            onClick={() => removeField(index)}
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                        </BaseButton>
                    </div>

                    {/* Primary Fields */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <FormInput
                            name={`${name}[${index}].name`}
                            label="Screen Name"
                            placeholder="e.g., Main Scoreboard"
                            vertical
                        />
                        <FormInput
                            name={`${name}[${index}].productType`}
                            label="Product Type"
                            placeholder="e.g., A Series"
                            vertical
                        />

                        <div className="flex flex-col gap-1">
                            <Label className="text-[11px] text-zinc-500 font-medium">Service Type</Label>
                            <select
                                {...register(`${name}[${index}].serviceType`)}
                                className={cn(
                                    "h-9 px-3 text-sm border rounded-md bg-zinc-950 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all",
                                    aiFields?.includes(`${name}[${index}].serviceType`) ? "border-blue-500 ring-1 ring-blue-500" : "border-zinc-700"
                                )}
                            >
                                <option value="Front/Rear">Front/Rear (Scoreboard)</option>
                                <option value="Top">Top (Ribbon)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label className="text-[11px] text-zinc-500 font-medium">Form Factor</Label>
                            <select
                                {...register(`${name}[${index}].formFactor`)}
                                className={cn(
                                    "h-9 px-3 text-sm border rounded-md bg-zinc-950 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all",
                                    aiFields?.includes(`${name}[${index}].formFactor`) ? "border-blue-500 ring-1 ring-blue-500" : "border-zinc-700"
                                )}
                            >
                                <option value="Straight">Straight</option>
                                <option value="Curved">Curved</option>
                            </select>
                        </div>
                    </div>

                    {/* Dimensions Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <FormInput
                            name={`${name}[${index}].widthFt`}
                            label="Width (ft)"
                            type="number"
                            vertical
                        />
                        <FormInput
                            name={`${name}[${index}].heightFt`}
                            label="Height (ft)"
                            type="number"
                            vertical
                        />

                        <FormInput
                            name={`${name}[${index}].quantity`}
                            label="Quantity"
                            type="number"
                            vertical
                        />

                        <FormInput
                            name={`${name}[${index}].pitchMm`}
                            label="Pitch (mm)"
                            type="number"
                            vertical
                        />

                        <FormInput
                            name={`${name}[${index}].outletDistance`}
                            label="Outlet Dist (ft)"
                            type="number"
                            vertical
                        />
                    </div>

                    {/* Margin Slider - With Natalia Math Tooltip */}
                    <div className={cn(
                        "p-4 rounded-xl border space-y-3",
                        aiFields?.includes(`${name}[${index}].desiredMargin`)
                            ? "border-[#0A52EF]/50 bg-[#0A52EF]/10"
                            : "border-zinc-700 bg-zinc-800/30"
                    )}>
                        <div className="flex justify-between items-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Label className="text-[11px] text-zinc-500 font-medium flex items-center gap-1 cursor-help">
                                            <Zap className="w-3 h-3 text-yellow-500" />
                                            Desired Margin
                                            <Info className="w-3 h-3 text-zinc-600 hover:text-blue-500 transition-colors" />
                                        </Label>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="max-w-xs bg-zinc-800 border-zinc-700 text-white p-3"
                                    >
                                        <p className="text-xs leading-relaxed">
                                            <strong className="text-[#0A52EF]">Using ANC Strategic Logic:</strong> We use the Divisor Model <code className="bg-zinc-700 px-1 rounded">[Cost / (1 - Margin)]</code> to ensure your P&L profit matches your target percentage exactly.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <span className={cn(
                                "text-sm font-semibold",
                                hasLowMargin ? "text-yellow-600" : "text-blue-500"
                            )}>
                                {(desiredMargin * 100 || 0).toFixed(0)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="0.8"
                            step="0.01"
                            {...register(`${name}[${index}].desiredMargin`, {
                                valueAsNumber: true,
                                onChange: (e) => setValue(`${name}[${index}].desiredMargin`, parseFloat(e.target.value))
                            })}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-[10px] text-zinc-500">
                            Adjust margin to see real-time price impact
                        </p>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <ChevronRight className={cn(
                            "w-4 h-4 transition-transform",
                            showAdvanced && "rotate-90"
                        )} />
                        Advanced Settings
                    </button>

                    {/* Advanced Settings */}
                    {showAdvanced && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                            <FormInput
                                name={`${name}[${index}].costPerSqFt`}
                                label="Cost per Sq Ft ($)"
                                type="number"
                                vertical
                            />

                            <div className="flex flex-col gap-2">
                                <Label className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Include Spares (5%)
                                </Label>
                                <Switch
                                    checked={useWatch({ name: `${name}[${index}].includeSpareParts`, control })}
                                    onCheckedChange={(checked) => setValue(`${name}[${index}].includeSpareParts`, checked)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label className="text-[10px] text-zinc-500 font-medium">Replacement Project</Label>
                                <Switch
                                    checked={useWatch({ name: `${name}[${index}].isReplacement`, control })}
                                    onCheckedChange={(checked) => setValue(`${name}[${index}].isReplacement`, checked)}
                                />
                            </div>

                            {useWatch({ name: `${name}[${index}].isReplacement`, control }) && (
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[10px] text-zinc-500 font-medium">Use Existing Steel</Label>
                                    <Switch
                                        checked={useWatch({ name: `${name}[${index}].useExistingStructure`, control })}
                                        onCheckedChange={(checked) => setValue(`${name}[${index}].useExistingStructure`, checked)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live Stats Footer */}
                    <div className="flex items-center gap-6 pt-3 border-t border-zinc-700/30 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Area:</span>
                            <span className="font-medium text-zinc-300">{area} sq ft</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Price/SqFt:</span>
                            <span className="font-medium text-blue-400">
                                {sellingPricePerSqFt > 0
                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sellingPricePerSqFt)
                                    : "$0.00"
                                }
                            </span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            {hasErrors ? (
                                <>
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    <span className="text-red-400">Fix errors to calculate</span>
                                </>
                            ) : finalClientTotal > 0 ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-emerald-400">Ready</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-zinc-500">Add dimensions to calculate</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleScreen;
