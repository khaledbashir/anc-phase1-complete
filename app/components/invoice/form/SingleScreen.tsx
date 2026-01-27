"use client";

import { useEffect } from "react";

// RHF
import { FieldArrayWithId, useFormContext, useWatch } from "react-hook-form";

// ShadCn
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Components
import { BaseButton, FormInput } from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { ChevronDown, ChevronUp, Trash2, Copy, ShieldCheck, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
    const { control, setValue, register } = useFormContext();
    const { _t } = useTranslationContext();

    const screenName = useWatch({ name: `${name}[${index}].name`, control });
    const width = useWatch({ name: `${name}[${index}].widthFt`, control });
    const height = useWatch({ name: `${name}[${index}].heightFt`, control });
    const quantity = useWatch({ name: `${name}[${index}].quantity`, control });
    const pitch = useWatch({ name: `${name}[${index}].pitchMm`, control });

    // Watch the audit result for this screen (Mode B feedback)
    const audit = useWatch({ name: `details.internalAudit.perScreen[${index}]`, control });
    const finalClientTotal = audit?.breakdown?.finalClientTotal || 0;

    useEffect(() => {
        // Could compute area or resolution here and set derived fields if desired
        if (width != undefined && height != undefined) {
            const area = (Number(width) * Number(height)).toFixed(2);
            setValue(`${name}[${index}].areaSqFt`, area);
        }
        if (width != undefined && height != undefined && pitch != undefined) {
            const pitchFeet = Number(pitch) / 304.8;
            const pixelsHeight = Number(height) / pitchFeet;
            const pixelsWidth = Number(width) / pitchFeet;
            const pixelResolution = Math.round(pixelsHeight * pixelsWidth);
            setValue(`${name}[${index}].pixelResolution`, pixelResolution);
        }
    }, [width, height, pitch]);

    return (
        <div className="border rounded-xl p-3 bg-gray-50 dark:bg-slate-800">
            <div className="flex justify-between items-center">
                <p className="font-medium">
                    #{index + 1} - {screenName ? screenName : "Untitled Screen"}
                </p>

                <div className="flex gap-2">
                    <BaseButton size={"icon"} onClick={() => moveFieldUp(index)} disabled={index === 0}>
                        <ChevronUp />
                    </BaseButton>
                    <BaseButton size={"icon"} onClick={() => moveFieldDown(index)} disabled={index === fields.length - 1}>
                        <ChevronDown />
                    </BaseButton>
                    <BaseButton size={"icon"} variant="outline" onClick={() => duplicateField?.(index)}>
                        <Copy className="w-4 h-4" />
                    </BaseButton>
                    <BaseButton variant="destructive" onClick={() => removeField(index)}>
                        <Trash2 />
                        {_t("form.steps.screens.removeScreen")}
                    </BaseButton>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
                <FormInput name={`${name}[${index}].name`} label={_t("form.steps.screens.name")} placeholder="Screen name" vertical />

                <FormInput name={`${name}[${index}].productType`} label={_t("form.steps.screens.productType")} placeholder="Product type" vertical />

                <FormInput name={`${name}[${index}].widthFt`} label={_t("form.steps.screens.width")} type="number" className="w-[10rem]" vertical />

                <FormInput name={`${name}[${index}].heightFt`} label={_t("form.steps.screens.height")} type="number" className="w-[10rem]" vertical />

                <FormInput name={`${name}[${index}].quantity`} label={_t("form.steps.screens.quantity")} type="number" className="w-[8rem]" vertical />

                <FormInput name={`${name}[${index}].pitchMm`} label={_t("form.steps.screens.pitch")} type="number" className="w-[8rem]" vertical />

                <FormInput name={`${name}[${index}].costPerSqFt`} label={_t("form.steps.screens.costPerSqFt")} type="number" className="w-[8rem]" vertical />

                <FormInput name={`${name}[${index}].desiredMargin`} label={_t("form.steps.screens.desiredMargin")} type="number" className="w-[8rem]" vertical />

                <div className="flex flex-col gap-1">
                    <Label className="text-xs uppercase text-gray-500 font-bold">Service Type</Label>
                    <select
                        {...register(`${name}[${index}].serviceType`)}
                        className="h-9 px-3 text-sm border border-input rounded-md bg-white dark:bg-slate-900 w-[10rem] focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                    >
                        <option value="Front/Rear">Front/Rear (Scoreboard)</option>
                        <option value="Top">Top (Ribbon)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <Label className="text-xs uppercase text-gray-500 font-bold">Form Factor</Label>
                    <select
                        {...register(`${name}[${index}].formFactor`)}
                        className="h-9 px-3 text-sm border border-input rounded-md bg-white dark:bg-slate-900 w-[8rem] focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                    >
                        <option value="Straight">Straight</option>
                        <option value="Curved">Curved</option>
                    </select>
                </div>

                <FormInput name={`${name}[${index}].outletDistance`} label="Outlet Dist (ft)" type="number" className="w-[8rem]" vertical />
            </div>

            {/* Strategic Calculator Section (Ferrari Logic) */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Margin Slider */}
                <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase text-zinc-500 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" /> Desired Margin
                        </Label>
                        <span className="text-sm font-bold text-blue-600">
                            {(useWatch({ name: `${name}[${index}].desiredMargin`, control }) * 100 || 0).toFixed(0)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="0.8"
                        step="0.01"
                        {...register(`${name}[index].desiredMargin`, {
                            valueAsNumber: true,
                            onChange: (e) => setValue(`${name}[${index}].desiredMargin`, parseFloat(e.target.value))
                        })}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[10px] text-zinc-500 italic">Adjust margin to see real-time price impact on the client PDF.</p>
                </div>

                {/* Ferrari Logic Toggles */}
                <div className="flex gap-4 items-center bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200/30">
                    <div className="flex flex-col gap-2">
                        <Label className="text-[10px] uppercase text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Spares (5%)
                        </Label>
                        <Switch
                            checked={useWatch({ name: `${name}[${index}].includeSpareParts`, control })}
                            onCheckedChange={(checked) => setValue(`${name}[${index}].includeSpareParts`, checked)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-[10px] uppercase text-blue-700 dark:text-blue-400 font-bold">Replacement</Label>
                        <Switch
                            checked={useWatch({ name: `${name}[${index}].isReplacement`, control })}
                            onCheckedChange={(checked) => setValue(`${name}[${index}].isReplacement`, checked)}
                        />
                    </div>

                    {useWatch({ name: `${name}[${index}].isReplacement`, control }) && (
                        <div className="flex flex-col gap-2 animate-in slide-in-from-left-2">
                            <Label className="text-[10px] uppercase text-blue-700 dark:text-blue-400 font-bold">Use Exit. Steel</Label>
                            <Switch
                                checked={useWatch({ name: `${name}[${index}].useExistingStructure`, control })}
                                onCheckedChange={(checked) => setValue(`${name}[${index}].useExistingStructure`, checked)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Live Pricing Summary (Secondary Feedback) */}
            <div className="mt-4 flex gap-6 items-center px-2 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col">
                    <Label className="text-[10px] uppercase text-zinc-400 font-medium">Area</Label>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        {(Number(width || 0) * Number(height || 0)).toFixed(2)} sq ft
                    </span>
                </div>

                <div className="flex flex-col">
                    <Label className="text-[10px] uppercase text-zinc-400 font-medium">Resolution</Label>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        {Number((screenName && pitch) ? (Math.round((Number(height || 0) / (Number(pitch || 10) / 304.8)) * (Number(width || 0) / (Number(pitch || 10) / 304.8)))) : 0)} pixels
                    </span>
                </div>

                <div className="ml-auto flex flex-col items-end">
                    <Label className="text-[10px] uppercase text-zinc-400 font-medium">Est. Client Price</Label>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {finalClientTotal > 0
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(finalClientTotal)
                            : "Calculating..."
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SingleScreen;
